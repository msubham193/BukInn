const Progress = require("../../models/Progress");
const Book = require("../../models/Book");
const { responseHandler } = require("../../utils/responseHandler");
const CustomError = require("../../utils/errors");
const winston = require("../../config/logger");

// Update reading progress
const updateProgress = async (req, res, next) => {
  try {
    const { bookId, chapterOrder } = req.body;
    const userId = req.user.id;

    // Verify book exists
    const book = await Book.findById(bookId);
    if (!book || book.contentStatus !== "published") {
      throw new CustomError("Book not found or not published", 404);
    }

    // Find or create progress
    let progress = await Progress.findOne({ user: userId, book: bookId });
    if (!progress) {
      progress = new Progress({ user: userId, book: bookId });
    }

    // Update progress
    await progress.updateProgress(chapterOrder);

    winston.info(
      `Progress updated for book: ${book.title} by user: ${req.user.phoneNumber}`
    );
    return responseHandler(
      res,
      200,
      { progress },
      "Progress updated successfully"
    );
  } catch (error) {
    winston.error("Error updating progress:", error);
    next(error);
  }
};

// Get progress for a book
const getProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const progress = await Progress.findOne({ user: userId, book: bookId })
      .populate("book", "title")
      .lean();

    if (!progress) {
      throw new CustomError("Progress not found", 404);
    }

    winston.info(
      `Retrieved progress for book ID: ${bookId} by user: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { progress });
  } catch (error) {
    winston.error("Error retrieving progress:", error);
    next(error);
  }
};

// Get all progress for the user
const getAllProgress = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const progress = await Progress.find({ user: userId })
      .populate("book", "title coverImage")
      .sort({ lastReadAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Progress.countDocuments({ user: userId });

    winston.info(
      `Retrieved ${progress.length} progress records for user: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, {
      progress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    winston.error("Error retrieving all progress:", error);
    next(error);
  }
};

module.exports = {
  updateProgress,
  getProgress,
  getAllProgress,
};
