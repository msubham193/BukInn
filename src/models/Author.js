const mongoose = require("mongoose");
const validator = require("validator");

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    profileImage: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || validator.isURL(value),
        message: "Invalid profile image URL",
      },
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

// Virtual populate for books
authorSchema.virtual("books", {
  ref: "Book",
  localField: "_id",
  foreignField: "author",
});

// Indexes for performance
authorSchema.index({ name: "text" }); // For text search
authorSchema.index({ createdAt: 1 });

// Pre-save hook to update timestamp
authorSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Author = mongoose.model("Author", authorSchema);

module.exports = Author;
