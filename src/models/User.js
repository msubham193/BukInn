const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (value) {
          return validator.isMobilePhone(value, "any", { strictMode: true });
        },
        message: "Invalid phone number format",
      },
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          return !value || validator.isEmail(value);
        },
        message: "Invalid email format",
      },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    premiumStatus: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    readingPreferences: {
      genres: [{ type: String }],
      authors: [{ type: String }],
      language: { type: String, default: "en" },
    },
    stats: {
      totalBooksRead: { type: Number, default: 0 },
      totalReadingTime: { type: Number, default: 0 }, // in minutes
      currentStreak: { type: Number, default: 0 }, // reading streak in days
      lastReadDate: { type: Date },
    },
    refreshToken: {
      type: String,
      select: false, // Exclude from queries by default
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
// userSchema.index({ phoneNumber: 1 }, { unique: true }); // Re-enabled unique index
userSchema.index({ "stats.lastReadDate": 1 });
userSchema.index({ "readingPreferences.genres": 1 });

// Pre-save hook to update timestamp
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user is premium
userSchema.methods.isPremium = function () {
  return this.premiumStatus === "premium";
};

// Method to check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

// Method to update reading stats
userSchema.methods.updateReadingStats = async function (readingTime, bookId) {
  this.stats.totalReadingTime += readingTime;
  const today = new Date().setHours(0, 0, 0, 0);
  const lastRead = this.stats.lastReadDate
    ? new Date(this.stats.lastReadDate).setHours(0, 0, 0, 0)
    : null;

  // Update reading streak
  if (!lastRead || lastRead < today - 86400000) {
    this.stats.currentStreak =
      lastRead === today - 86400000 ? this.stats.currentStreak + 1 : 1;
  }
  this.stats.lastReadDate = Date.now();

  await this.save();
};

// Method to add reading preference
userSchema.methods.addPreference = async function (type, value) {
  if (type === "genre") {
    if (!this.readingPreferences.genres.includes(value)) {
      this.readingPreferences.genres.push(value);
    }
  } else if (type === "author") {
    if (!this.readingPreferences.authors.includes(value)) {
      this.readingPreferences.authors.push(value);
    }
  }
  await this.save();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
