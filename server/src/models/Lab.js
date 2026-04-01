import mongoose from "mongoose";

/**
 * Lab Difficulty Levels
 */
export const LAB_DIFFICULTY = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/**
 * Lab Categories for team types
 */
export const LAB_CATEGORY = {
  RED_TEAM: "Red Team",
  BLUE_TEAM: "Blue Team",
  PURPLE_TEAM: "Purple Team",
};

const labSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Lab title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Lab description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    difficulty: {
      type: String,
      enum: Object.values(LAB_DIFFICULTY),
      default: LAB_DIFFICULTY.EASY,
    },
    category: {
      type: String,
      enum: Object.values(LAB_CATEGORY),
      default: LAB_CATEGORY.RED_TEAM,
    },
    estimatedDuration: {
      type: Number, // Duration in minutes
      required: [true, "Estimated duration is required"],
      min: [5, "Duration must be at least 5 minutes"],
      max: [480, "Duration cannot exceed 8 hours"],
    },
    // Additional metadata
    objectives: [
      {
        type: String,
        trim: true,
      },
    ],
    tools: [
      {
        type: String,
        trim: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Docker image used to spawn the lab container
    dockerImage: {
      type: String,
      default: null,     // e.g. 'xploitverse/sqli-lab:latest'
      trim: true,
    },
    // Lab environment configuration (for Phase 2 AWS integration)
    environmentConfig: {
      instanceType: {
        type: String,
        default: "t2.micro",
      },
      amiId: {
        type: String,
        default: null,
      },
      ports: [
        {
          type: Number,
        },
      ],
    },
    // Status and visibility
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    // Stats
    timesCompleted: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
labSchema.index({ title: 1 });
labSchema.index({ category: 1 });
labSchema.index({ difficulty: 1 });
labSchema.index({ isActive: 1, isPublished: 1 });

// Virtual for formatted duration
labSchema.virtual("durationFormatted").get(function () {
  const hours = Math.floor(this.estimatedDuration / 60);
  const mins = this.estimatedDuration % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
});

// Virtual for difficulty color
labSchema.virtual("difficultyColor").get(function () {
  switch (this.difficulty) {
    case LAB_DIFFICULTY.EASY:
      return "green";
    case LAB_DIFFICULTY.MEDIUM:
      return "yellow";
    case LAB_DIFFICULTY.HARD:
      return "red";
    default:
      return "gray";
  }
});

const Lab = mongoose.model("Lab", labSchema);

export default Lab;
