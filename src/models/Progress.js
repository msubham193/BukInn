const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book is required"],
    },
    lastChapterOrder: {
      type: Number,
      min: [1, "Chapter order must be at least 1"],
      default: 1,
    },
    completionPercentage: {
      type: Number,
      min: [0, "Completion percentage cannot be negative"],
      max: [100, "Completion percentage cannot exceed 100"],
      default: 0,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
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

// Unique index to prevent duplicate progress records for user-book pair
progressSchema.index({ user: 1, book: 1 }, { unique: true });

// Pre-save hook to update timestamps
progressSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update reading progress
progressSchema.methods.updateProgress = async function (chapterOrder) {
  const book = await mongoose.model("Book").findById(this.book);
  if (!book) {
    throw new Error("Book not found");
  }

  // Validate chapter order
  const chapter = book.chapters.find((chap) => chap.order === chapterOrder);
  if (!chapter) {
    throw new Error(`Chapter with order ${chapterOrder} not found`);
  }

  // Update last chapter order
  this.lastChapterOrder = chapterOrder;

  // Calculate completion percentage (based on chapters read)
  const totalChapters = book.chapters.length;
  const chaptersRead = book.chapters.filter(
    (chap) => chap.order <= chapterOrder
  ).length;
  this.completionPercentage = Math.round((chaptersRead / totalChapters) * 100);

  // Update last read timestamp
  this.lastReadAt = Date.now();

  await this.save();

  // Update user reading stats
  const user = await mongoose.model("User").findById(this.user);
  if (user) {
    await user.updateReadingStats(chapter.estimatedReadingTime, this.book);
  }
};

const Progress = mongoose.model("Progress", progressSchema);

module.exports = Progress;
