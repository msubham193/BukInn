const Category = require("../../models/Category");
const Book = require("../../models/Book");
const { responseHandler } = require("../../utils/responseHandler");
const { CustomError } = require("../../utils/errorHandler");
const winston = require("../../config/logger");

// Get paginated list of categories
const getCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const query = q ? { $text: { $search: q } } : {};

    const categories = await Category.find(query)
      .select("name description")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Category.countDocuments(query);

    winston.info(`Retrieved ${categories.length} categories for page ${page}`);
    return responseHandler(res, 200, {
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    winston.error("Error retrieving categories:", error);
    next(error);
  }
};

// Get category by ID
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .select("name description")
      .populate("books", "title description coverImage")
      .lean();

    if (!category) {
      throw new CustomError("Category not found", 404);
    }

    winston.info(`Retrieved category: ${category.name}`);
    return responseHandler(res, 200, { category });
  } catch (error) {
    winston.error("Error retrieving category:", error);
    next(error);
  }
};

// Create category (admin only)
const createCategory = async (req, res, next) => {
  try {
    const category = new Category(req.body);
    await category.save();

    winston.info(
      `Category created: ${category.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(
      res,
      201,
      { category },
      "Category created successfully"
    );
  } catch (error) {
    winston.error("Error creating category:", error);
    next(error);
  }
};

// Update category (admin only)
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new CustomError("Category not found", 404);
    }

    Object.assign(category, req.body);
    await category.save();

    winston.info(
      `Category updated: ${category.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(
      res,
      200,
      { category },
      "Category updated successfully"
    );
  } catch (error) {
    winston.error("Error updating category:", error);
    next(error);
  }
};

// Delete category (admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new CustomError("Category not found", 404);
    }

    // Check if category has associated books
    const bookCount = await Book.countDocuments({ categories: category._id });
    if (bookCount > 0) {
      throw new CustomError(
        "Cannot delete category with associated books",
        400
      );
    }

    await category.deleteOne();
    winston.info(
      `Category deleted: ${category.name} by admin: ${req.user.phoneNumber}`
    );
    return responseHandler(res, 200, {}, "Category deleted successfully");
  } catch (error) {
    winston.error("Error deleting category:", error);
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
