const Author = require("../../models/Author");
const Book = require("../../models/Book");
const { responseHandler } = require("../../utils/responseHandler");
const { CustomError } = require("../../utils/errors");
const winston = require("../../config/logger");
const { deleteImageFromS3 } = require("../../config/s3Config");

// Get paginated list of authors
const getAuthors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const query = q ? { $text: { $search: q } } : {};

    const authors = await Author.find(query)
      .select("name bio profileImage")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Author.countDocuments(query);

    winston.info(`Retrieved ${authors.length} authors for page ${page}`);
    return responseHandler(res, 200, {
      authors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    winston.error("Error retrieving authors:", error);
    next(error);
  }
};

// Get author by ID
const getAuthorById = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id)
      .select("name bio profileImage")
      .populate("books", "title description coverImage")
      .lean();

    if (!author) {
      throw new CustomError("Author not found", 404);
    }

    winston.info(`Retrieved author: ${author.name}`);
    return responseHandler(res, 200, { author });
  } catch (error) {
    winston.error("Error retrieving author:", error);
    next(error);
  }
};

// Create author (admin only) - Updated with S3 upload
const createAuthor = async (req, res, next) => {
  try {
    const authorData = req.body;

    // If profile image was uploaded, add the S3 URL to author data
    if (req.file) {
      authorData.profileImage = req.file.location;
      winston.info(`Profile image uploaded to S3: ${req.file.location}`);
    }

    // Validate required fields
    const requiredFields = ["name"];
    for (const field of requiredFields) {
      if (!authorData[field]) {
        // If validation fails and image was uploaded, clean up S3
        if (req.file) {
          await deleteImageFromS3(req.file.location);
        }
        throw new CustomError(`${field} is required`, 400);
      }
    }

    const author = new Author(authorData);
    await author.save();

    winston.info(
      `Author created: ${author.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 201, { author }, "Author created successfully");
  } catch (error) {
    // Clean up uploaded image if author creation fails
    if (req.file) {
      await deleteImageFromS3(req.file.location);
      winston.info(`Cleaned up uploaded image due to author creation failure`);
    }
    winston.error("Error creating author:", error);
    next(error);
  }
};

// Update author (admin only) - Updated with S3 upload
const updateAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      // Clean up uploaded image if author not found
      if (req.file) {
        await deleteImageFromS3(req.file.location);
      }
      throw new CustomError("Author not found", 404);
    }

    const updateData = req.body;
    const oldProfileImage = author.profileImage;

    // If new profile image was uploaded
    if (req.file) {
      updateData.profileImage = req.file.location;
      winston.info(`New profile image uploaded: ${req.file.location}`);
    }

    // Update author
    Object.assign(author, updateData);
    await author.save();

    // Delete old profile image from S3 if new one was uploaded
    if (req.file && oldProfileImage) {
      await deleteImageFromS3(oldProfileImage);
      winston.info(`Deleted old profile image: ${oldProfileImage}`);
    }

    winston.info(
      `Author updated: ${author.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { author }, "Author updated successfully");
  } catch (error) {
    // Clean up new uploaded image if update fails
    if (req.file) {
      await deleteImageFromS3(req.file.location);
      winston.info(`Cleaned up uploaded image due to author update failure`);
    }
    winston.error("Error updating author:", error);
    next(error);
  }
};

// Delete author (admin only) - Updated with S3 cleanup
const deleteAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      throw new CustomError("Author not found", 404);
    }

    // Check if author has associated books
    const bookCount = await Book.countDocuments({ author: author._id });
    if (bookCount > 0) {
      throw new CustomError("Cannot delete author with associated books", 400);
    }

    const profileImageUrl = author.profileImage;

    // Delete author from database
    await author.deleteOne();

    // Delete profile image from S3
    if (profileImageUrl) {
      await deleteImageFromS3(profileImageUrl);
      winston.info(`Deleted profile image: ${profileImageUrl}`);
    }

    winston.info(
      `Author deleted: ${author.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, {}, "Author deleted successfully");
  } catch (error) {
    winston.error("Error deleting author:", error);
    next(error);
  }
};

module.exports = {
  getAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};
