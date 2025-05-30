const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const multer = require("multer");
const sharp = require("sharp");
const { CustomError } = require("../utils/errorHandler");
const dotenv = require("dotenv");

dotenv.config();

// Configure AWS SDK v3 S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Image processing middleware
const processImage = async (buffer, filename) => {
  try {
    // Process image with sharp - resize and optimize
    const processedImage = await sharp(buffer)
      .resize(800, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();

    return {
      buffer: processedImage,
      contentType: "image/jpeg",
      size: processedImage.length,
    };
  } catch (error) {
    throw new CustomError("Error processing image", 400);
  }
};

// Custom storage for processing images before upload
const customStorage = {
  _handleFile: async (req, file, cb) => {
    try {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(
          new CustomError("Only JPEG, PNG, and WebP images are allowed", 400)
        );
      }

      // Collect buffer data
      const chunks = [];
      let totalSize = 0;
      const maxSize = 5 * 1024 * 1024; // 5MB

      file.stream.on("data", (chunk) => {
        totalSize += chunk.length;
        // Check size during streaming
        if (totalSize > maxSize) {
          return cb(new CustomError("Image size should be less than 5MB", 400));
        }
        chunks.push(chunk);
      });

      file.stream.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);

          // Process image
          const processed = await processImage(buffer, file.originalname);

          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const filename = `books/covers/${timestamp}-${randomString}.jpg`;

          // Upload to S3 using SDK v3
          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: filename,
            Body: processed.buffer,
            ContentType: processed.contentType,
            CacheControl: "max-age=31536000", // 1 year cache
            Metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
            },
          };

          const command = new PutObjectCommand(uploadParams);
          await s3Client.send(command);

          // Construct the S3 URL manually since PutObjectCommand doesn't return Location
          const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

          cb(null, {
            bucket: uploadParams.Bucket,
            key: uploadParams.Key,
            location: location,
            size: processed.size,
            contentType: processed.contentType,
          });
        } catch (error) {
          console.error("Error in file processing:", error);
          cb(error);
        }
      });

      file.stream.on("error", (error) => {
        console.error("Stream error:", error);
        cb(error);
      });
    } catch (error) {
      console.error("Error in _handleFile:", error);
      cb(error);
    }
  },
  _removeFile: (req, file, cb) => {
    // Optional: implement file removal logic
    cb();
  },
};

// Multer configuration
const upload = multer({
  storage: customStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new CustomError("Only JPEG, PNG, and WebP images are allowed", 400),
        false
      );
    }
  },
});

// Function to delete image from S3
const deleteImageFromS3 = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // Extract key from URL
    const urlParts = imageUrl.split("/");
    const key = urlParts.slice(-3).join("/"); // books/covers/filename.jpg

    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    console.log(`Deleted image: ${key}`);
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    // Don't throw error as this shouldn't stop the main operation
  }
};

module.exports = {
  upload,
  deleteImageFromS3,
  s3Client,
};
