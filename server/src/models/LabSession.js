import mongoose from "mongoose";
import config from "../config/index.js";

/**
 * Lab Session Status Flow:
 *
 * PENDING -> INITIALIZING -> RUNNING -> STOPPING -> STOPPED -> TERMINATED
 *                                    -> ERROR (can happen at any stage)
 *
 * PENDING: User requested lab, waiting for system
 * INITIALIZING: AWS EC2 instance is being provisioned
 * RUNNING: Instance is active, user can access
 * STOPPING: User/system initiated stop, instance stopping
 * STOPPED: Instance stopped but not terminated (can be restarted)
 * TERMINATED: Instance terminated, session complete
 * ERROR: Something went wrong during any stage
 */
export const LAB_STATUS = {
  PENDING: "pending",
  INITIALIZING: "initializing",
  RUNNING: "running",
  STOPPING: "stopping",
  STOPPED: "stopped",
  TERMINATED: "terminated",
  ERROR: "error",
};

/**
 * Lab Types for different training scenarios
 */
export const LAB_TYPES = {
  WEB_EXPLOITATION: "web_exploitation",
  NETWORK_PENTESTING: "network_pentesting",
  PRIVILEGE_ESCALATION: "privilege_escalation",
  MALWARE_ANALYSIS: "malware_analysis",
  FORENSICS: "forensics",
  CTF_CHALLENGE: "ctf_challenge",
  CUSTOM: "custom",
};

const labSessionSchema = new mongoose.Schema(
  {
    // User Reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    // Lab Configuration
    labType: {
      type: String,
      enum: Object.values(LAB_TYPES),
      default: LAB_TYPES.WEB_EXPLOITATION,
    },
    labName: {
      type: String,
      required: [true, "Lab name is required"],
      trim: true,
      maxlength: [100, "Lab name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "beginner",
    },

    // Session Status
    status: {
      type: String,
      enum: Object.values(LAB_STATUS),
      default: LAB_STATUS.PENDING,
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(LAB_STATUS),
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        message: String,
      },
    ],

    // AWS EC2 Information (Phase 2+)
    awsInstanceId: {
      type: String,
      default: null,
      index: true,
    },
    awsInstanceType: {
      type: String,
      default: "t2.micro", // Free tier eligible
    },
    awsAmiId: {
      type: String,
      default: null,
    },
    awsSecurityGroupId: {
      type: String,
      default: null,
    },
    awsSubnetId: {
      type: String,
      default: null,
    },
    awsRegion: {
      type: String,
      default: config.aws.region || "us-east-1",
    },

    // Connection Details (Phase 2+)
    publicIp: {
      type: String,
      default: null,
    },
    privateIp: {
      type: String,
      default: null,
    },
    sshKeyName: {
      type: String,
      default: null,
    },
    accessCredentials: {
      username: String,
      // Password stored encrypted in production
      password: {
        type: String,
        select: false,
      },
    },

    // Time Tracking (Critical for billing)
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    // Billable time in minutes
    totalBillableMinutes: {
      type: Number,
      default: 0,
    },
    // Auto-terminate settings
    maxDuration: {
      type: Number,
      default: 240, // 4 hours in minutes
    },
    autoTerminateAt: {
      type: Date,
      default: null,
    },
    warningNotificationSent: {
      type: Boolean,
      default: false,
    },

    // Cost Tracking (@ $0.50/hour)
    hourlyRate: {
      type: Number,
      default: config.lab.hourlyRate || 0.5,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    finalCost: {
      type: Number,
      default: null,
    },

    // User Progress/Activity
    checkpointsCompleted: [
      {
        checkpointId: String,
        completedAt: Date,
        points: Number,
      },
    ],
    flagsFound: [
      {
        flagId: String,
        flag: String,
        foundAt: Date,
        points: Number,
      },
    ],
    score: {
      type: Number,
      default: 0,
    },

    // Logs and Notes
    activityLog: [
      {
        action: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    userNotes: {
      type: String,
      maxlength: [5000, "Notes cannot exceed 5000 characters"],
    },

    // Error Information
    errorMessage: {
      type: String,
      default: null,
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for common queries
labSessionSchema.index({ user: 1, status: 1 });
labSessionSchema.index({ user: 1, createdAt: -1 });
labSessionSchema.index({ status: 1, autoTerminateAt: 1 });
// Note: awsInstanceId index created automatically by index: true in field definition

// Virtual for session duration in minutes
labSessionSchema.virtual("durationMinutes").get(function () {
  if (!this.startTime) return 0;

  const endTime = this.endTime || new Date();
  const diffMs = endTime - this.startTime;
  return Math.ceil(diffMs / (1000 * 60));
});

// Virtual for formatted duration
labSessionSchema.virtual("durationFormatted").get(function () {
  const minutes = this.durationMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
});

// Virtual for current cost (real-time calculation)
labSessionSchema.virtual("currentCost").get(function () {
  const minutes = this.durationMinutes;
  const hours = minutes / 60;
  return parseFloat((hours * this.hourlyRate).toFixed(2));
});

// Virtual to check if session is active
labSessionSchema.virtual("isActive").get(function () {
  return ["pending", "initializing", "running"].includes(this.status);
});

// Pre-save middleware to update status history
labSessionSchema.pre("save", function (next) {
  // Track status changes
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      message: `Status changed to ${this.status}`,
    });
  }

  // Set startTime when status becomes 'running'
  if (
    this.isModified("status") &&
    this.status === LAB_STATUS.RUNNING &&
    !this.startTime
  ) {
    this.startTime = new Date();

    // Calculate auto-terminate time
    if (this.maxDuration) {
      this.autoTerminateAt = new Date(
        Date.now() + this.maxDuration * 60 * 1000
      );
    }
  }

  // Set endTime when session ends
  if (
    this.isModified("status") &&
    [LAB_STATUS.STOPPED, LAB_STATUS.TERMINATED].includes(this.status)
  ) {
    if (!this.endTime) {
      this.endTime = new Date();
    }

    // Calculate final cost
    if (this.startTime) {
      const minutes = Math.ceil((this.endTime - this.startTime) / (1000 * 60));
      this.totalBillableMinutes = minutes;
      this.finalCost = parseFloat(
        ((minutes / 60) * this.hourlyRate).toFixed(2)
      );
    }
  }

  next();
});

// Instance method to add activity log
labSessionSchema.methods.logActivity = function (action, details = {}) {
  this.activityLog.push({
    action,
    timestamp: new Date(),
    details,
  });
  return this.save();
};

// Instance method to update status
labSessionSchema.methods.updateStatus = function (newStatus, message = "") {
  this.status = newStatus;
  if (message) {
    this.statusHistory[this.statusHistory.length - 1].message = message;
  }
  return this.save();
};

// Static method to find active sessions for a user
labSessionSchema.statics.findActiveByUser = function (userId) {
  return this.find({
    user: userId,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  }).sort({ createdAt: -1 });
};

// Static method to find sessions that need auto-termination
labSessionSchema.statics.findForAutoTermination = function () {
  return this.find({
    status: LAB_STATUS.RUNNING,
    autoTerminateAt: { $lte: new Date() },
  });
};

// Static method to get user's total spent
labSessionSchema.statics.getUserTotalSpent = async function (userId) {
  const result = await this.aggregate([
    { $match: { user: userId, finalCost: { $ne: null } } },
    { $group: { _id: null, total: { $sum: "$finalCost" } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

const LabSession = mongoose.model("LabSession", labSessionSchema);

export default LabSession;
