const Book = require("../../models/Book");
const Author = require("../../models/Author");
const { responseHandler } = require("../../utils/responseHandler");
const CustomError = require("../../utils/errors");
const winston = require("../../config/logger");
const { deleteImageFromS3 } = require("../../config/s3Config");

// Get paginated list of published books
const getBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = "publishedAt",
      sortOrder = "desc",
    } = req.query;
    const query = { contentStatus: "published" };

    if (category) {
      query.categories = category;
    }

    const books = await Book.find(query)
      .select(
        "title description author categories coverImage statistics publishedAt"
      )
      .populate("author", "name")
      .populate("categories", "name")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Book.countDocuments(query);

    winston.info(`Retrieved ${books.length} books for page ${page}`);
    return responseHandler(res, 200, {
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    winston.error("Error retrieving books:", error);
    next(error);
  }
};

// Get book by ID
const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id)
      .select(
        "title description author categories coverImage statistics publishedAt chapters.title chapters.order"
      )
      .populate("author", "name")
      .populate("categories", "name")
      .lean();

    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    winston.info(`Retrieved book: ${book.title}`);
    return responseHandler(res, 200, { book });
  } catch (error) {
    winston.error("Error retrieving book:", error);
    next(error);
  }
};

// Get chapter by book ID and order
const getChapter = async (req, res, next) => {
  try {
    const { id, order } = req.params;
    const book = await Book.findById(id);

    if (!book || book.contentStatus !== "published") {
      throw new CustomError("Book not found or not published", 404);
    }

    const chapter = await book.getChapterByOrder(parseInt(order));
    await book.incrementReadCount();

    winston.info(
      `Retrieved chapter ${order} for book: ${book.title} by user: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { chapter });
  } catch (error) {
    winston.error("Error retrieving chapter:", error);
    next(error);
  }
};

// Search books
const searchBooks = async (req, res, next) => {
  try {
    const { q, author, category, page = 1, limit = 10 } = req.query;
    const query = { contentStatus: "published" };

    if (q) {
      query.$text = { $search: q };
    }
    if (author) {
      const authorDoc = await Author.findOne({
        name: new RegExp(`^${author}$`, "i"),
      });
      if (authorDoc) {
        query.author = authorDoc._id;
      } else {
        query.author = null; // No results if author not found
      }
    }
    if (category) {
      query.categories = category;
    }

    const books = await Book.find(query)
      .select(
        "title description author categories coverImage statistics publishedAt"
      )
      .populate("author", "name")
      .populate("categories", "name")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Book.countDocuments(query);

    winston.info(
      `Search returned ${books.length} books for query: ${q || author}`
    );
    return responseHandler(res, 200, {
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    winston.error("Error searching books:", error);
    next(error);
  }
};

// Get trending books
const getTrendingBooks = async (req, res, next) => {
  try {
    const { limit = 10, period = "week" } = req.query;
    const dateThreshold = new Date();

    if (period === "day") {
      dateThreshold.setDate(dateThreshold.getDate() - 1);
    } else if (period === "week") {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (period === "month") {
      dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    }

    const books = await Book.find({
      contentStatus: "published",
      publishedAt: { $gte: dateThreshold },
    })
      .select(
        "title description author categories coverImage statistics publishedAt"
      )
      .populate("author", "name")
      .populate("categories", "name")
      .sort({ "statistics.totalReads": -1 })
      .limit(parseInt(limit))
      .lean();

    winston.info(
      `Retrieved ${books.length} trending books for period: ${period}`
    );
    return responseHandler(res, 200, { books });
  } catch (error) {
    winston.error("Error retrieving trending books:", error);
    next(error);
  }
};

// Get author-based suggestions
const getSuggestions = async (req, res, next) => {
  try {
    const { authorId, limit = 5 } = req.query;
    if (!authorId) {
      throw new CustomError("Author ID is required", 400);
    }

    const books = await Book.find({
      contentStatus: "published",
      author: authorId,
    })
      .select(
        "title description author categories coverImage statistics publishedAt"
      )
      .populate("author", "name")
      .populate("categories", "name")
      .sort({ "statistics.totalReads": -1 })
      .limit(parseInt(limit))
      .lean();

    winston.info(
      `Retrieved ${books.length} suggested books for author ID: ${authorId}`
    );
    return responseHandler(res, 200, { books });
  } catch (error) {
    winston.error("Error retrieving suggested books:", error);
    next(error);
  }
};

// Create book (admin only) - Updated with S3 upload
const createBook = async (req, res, next) => {
  try {
    const bookData = req.body;

    // If cover image was uploaded, add the S3 URL to book data
    if (req.file) {
      bookData.coverImage = req.file.location;
      winston.info(`Cover image uploaded to S3: ${req.file.location}`);
    }

    // Validate required fields
    const requiredFields = ["title", "description"];
    for (const field of requiredFields) {
      if (!bookData[field]) {
        // If validation fails and image was uploaded, clean up S3
        if (req.file) {
          await deleteImageFromS3(req.file.location);
        }
        throw new CustomError(`${field} is required`, 400);
      }
    }

    const book = new Book(bookData);
    await book.save();

    winston.info(
      `Book created: ${book.title} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 201, { book }, "Book created successfully");
  } catch (error) {
    // Clean up uploaded image if book creation fails
    if (req.file) {
      await deleteImageFromS3(req.file.location);
      winston.info(`Cleaned up uploaded image due to book creation failure`);
    }
    winston.error("Error creating book:", error);
    next(error);
  }
};

// Update book (admin only) - Updated with S3 upload
const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      // Clean up uploaded image if book not found
      if (req.file) {
        await deleteImageFromS3(req.file.location);
      }
      throw new CustomError("Book not found", 404);
    }

    const updateData = req.body;
    const oldCoverImage = book.coverImage;

    // If new cover image was uploaded
    if (req.file) {
      updateData.coverImage = req.file.location;
      winston.info(`New cover image uploaded: ${req.file.location}`);
    }

    // Update book
    Object.assign(book, updateData);
    await book.save();

    // Delete old cover image from S3 if new one was uploaded
    if (req.file && oldCoverImage) {
      await deleteImageFromS3(oldCoverImage);
      winston.info(`Deleted old cover image: ${oldCoverImage}`);
    }

    winston.info(
      `Book updated: ${book.title} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { book }, "Book updated successfully");
  } catch (error) {
    // Clean up new uploaded image if update fails
    if (req.file) {
      await deleteImageFromS3(req.file.location);
      winston.info(`Cleaned up uploaded image due to book update failure`);
    }
    winston.error("Error updating book:", error);
    next(error);
  }
};

// Delete book (admin only) - Updated with S3 cleanup
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    const coverImageUrl = book.coverImage;

    // Delete book from database
    await book.deleteOne();

    // Delete cover image from S3
    if (coverImageUrl) {
      await deleteImageFromS3(coverImageUrl);
      winston.info(`Deleted cover image: ${coverImageUrl}`);
    }

    winston.info(
      `Book deleted: ${book.title} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, {}, "Book deleted successfully");
  } catch (error) {
    winston.error("Error deleting book:", error);
    next(error);
  }
};

module.exports = {
  getBooks,
  getBookById,
  getChapter,
  searchBooks,
  getTrendingBooks,
  getSuggestions,
  createBook,
  updateBook,
  deleteBook,
};
