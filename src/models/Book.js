const mongoose = require("mongoose");
const validator = require("validator");

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Chapter title is required"],
    trim: true,
    minlength: [2, "Chapter title must be at least 2 characters"],
    maxlength: [100, "Chapter title cannot exceed 100 characters"],
  },
  content: {
    type: String,
    required: [true, "Chapter content is required"],
    trim: true,
  },
  order: {
    type: Number,
    required: [true, "Chapter order is required"],
    min: [1, "Chapter order must be at least 1"],
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  estimatedReadingTime: {
    type: Number,
    default: 0, // in minutes
  },
});

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
      // required: [true, "Author is required"],
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    coverImage: {
      type: String,
      validate: {
        validator: function (value) {
          return !value || validator.isURL(value);
        },
        message: "Invalid cover image URL",
      },
    },
    contentStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    chapters: [chapterSchema],
    statistics: {
      totalReads: { type: Number, default: 0 },
      averageRating: { type: Number, min: 0, max: 5, default: 0 },
      totalReviews: { type: Number, default: 0 },
      totalWordCount: { type: Number, default: 0 },
      totalEstimatedReadingTime: { type: Number, default: 0 }, // in minutes
    },
    publishedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
bookSchema.index({ title: "text", description: "text" }); // For text search
bookSchema.index({ author: 1 });
bookSchema.index({ categories: 1 });
bookSchema.index({ "statistics.totalReads": 1 });
bookSchema.index({ publishedAt: 1 });

// Pre-save hook to update timestamps and calculate statistics
bookSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();

  // Calculate chapter word counts and reading times
  this.chapters.forEach((chapter) => {
    if (chapter.isModified("content")) {
      chapter.wordCount = chapter.content
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      chapter.estimatedReadingTime = Math.ceil(chapter.wordCount / 200); // 200 words per minute
    }
  });

  // Update total word count and reading time
  this.statistics.totalWordCount = this.chapters.reduce(
    (total, chapter) => total + chapter.wordCount,
    0
  );
  this.statistics.totalEstimatedReadingTime = this.chapters.reduce(
    (total, chapter) => total + chapter.estimatedReadingTime,
    0
  );

  next();
});

// Method to update read count
bookSchema.methods.incrementReadCount = async function () {
  this.statistics.totalReads += 1;
  await this.save();
};

// Method to update average rating
bookSchema.methods.updateAverageRating = async function (
  newRating,
  isNewReview
) {
  const totalReviews = isNewReview
    ? this.statistics.totalReviews + 1
    : this.statistics.totalReviews;
  const currentTotalRating =
    this.statistics.averageRating * this.statistics.totalReviews;
  const newTotalRating = isNewReview
    ? currentTotalRating + newRating
    : currentTotalRating - this.statistics.averageRating + newRating;

  this.statistics.averageRating =
    totalReviews > 0 ? newTotalRating / totalReviews : 0;
  if (isNewReview) {
    this.statistics.totalReviews += 1;
  }
  await this.save();
};

// Method to get chapter by order
bookSchema.methods.getChapterByOrder = async function (order) {
  const chapter = this.chapters.find((chap) => chap.order === order);
  if (!chapter) {
    throw new Error(`Chapter with order ${order} not found`);
  }
  return chapter;
};

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
