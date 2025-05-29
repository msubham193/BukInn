const express = require("express");
const router = express.Router();

// Import feature-specific routes
const authRoutes = require("./api/v1/auth");
const bookRoutes = require("./api/v1/books");
// const chapterRoutes = require("./api/v1/chapters");
const authorRoutes = require("./api/v1/author");
const categoryRoutes = require("./api/v1/category");
// const libraryRoutes = require("./api/v1/library");
const progressRoutes = require("./api/v1/progress");
// const subscriptionRoutes = require("./api/v1/subscriptions");
// const paymentRoutes = require("./api/v1/payments");
// const reviewRoutes = require("./api/v1/reviews");
// const searchRoutes = require("./api/v1/search");
// const recommendationRoutes = require("./api/v1/recommendations");
// const adminRoutes = require("./api/v1/admin/index");

// Mount routes
router.use("/auth", authRoutes);
router.use("/books", bookRoutes);
// router.use("/chapters", chapterRoutes);
router.use("/authors", authorRoutes);
router.use("/categories", categoryRoutes);
// router.use("/library", libraryRoutes);
router.use("/progress", progressRoutes);
// router.use("/subscriptions", subscriptionRoutes);
// router.use("/payments", paymentRoutes);
// router.use("/reviews", reviewRoutes);
// router.use("/search", searchRoutes);
// router.use("/recommendations", recommendationRoutes);
// router.use("/admin", adminRoutes);

// Default route for API root
router.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the eBook Reader API v1",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      books: "/api/v1/books",
      chapters: "/api/v1/chapters",
      authors: "/api/v1/authors",
      categories: "/api/v1/categories",
      library: "/api/v1/library",
      progress: "/api/v1/progress",
      subscriptions: "/api/v1/subscriptions",
      payments: "/api/v1/payments",
      reviews: "/api/v1/reviews",
      search: "/api/v1/search",
      recommendations: "/api/v1/recommendations",
      admin: "/api/v1/admin",
    },
  });
});

module.exports = router;
