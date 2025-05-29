const Author = require("../../models/Author");
const Book = require("../../models/Book");
const { responseHandler } = require("../../utils/responseHandler");
const { CustomError } = require("../../utils/errors");
const winston = require("../../config/logger");

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
      .select("name bio email website profileImage")
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

// Create author (admin only)
const createAuthor = async (req, res, next) => {
  try {
    const author = new Author(req.body);
    await author.save();

    winston.info(
      `Author created: ${author.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 201, { author }, "Author created successfully");
  } catch (error) {
    winston.error("Error creating author:", error);
    next(error);
  }
};

// Update author (admin only)
const updateAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      throw new CustomError("Author not found", 404);
    }

    Object.assign(author, req.body);
    await author.save();

    winston.info(
      `Author updated: ${author.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, { author }, "Author updated successfully");
  } catch (error) {
    winston.error("Error updating author:", error);
    next(error);
  }
};

// Delete author (admin only)
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

    await author.deleteOne();
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
