const Book = require("../../models/Book");
const Author = require("../../models/Author");
const { responseHandler } = require("../../utils/responseHandler");
const { CustomError } = require("../../utils/errorHandler");
const winston = require("../../config/logger");

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
        name: new RegExp(`^${q}$`, "i"),
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

// Create book (admin only)
const createBook = async (req, res, next) => {
  try {
    const bookData = req.body;
    const book = new Book(bookData);
    await book.save();

    winston.info(
      `Book created: ${book.title} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 201, { book }, "Book created successfully");
  } catch (error) {
    winston.error("Error creating book:", error);
    next(error);
  }
};

// Update book (admin only)
const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    Object.assign(book, req.body);
    await book.save();

    winston.info(
      `Book updated: ${book.title} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { book }, "Book updated successfully");
  } catch (error) {
    winston.error("Error updating book:", error);
    next(error);
  }
};

// Delete book (admin only)
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new CustomError("Book not found", 404);
    }

    await book.deleteOne();
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
