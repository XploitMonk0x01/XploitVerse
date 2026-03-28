import crypto from "crypto";
import Task from "../models/Task.js";
import UserTaskProgress from "../models/UserTaskProgress.js";
import { asyncHandler, ApiError } from "../middleware/error.middleware.js";

const FLAG_WINDOW_MS = 60_000;
const FLAG_MAX_ATTEMPTS = 5;
const attemptMap = new Map();

const getAttemptKey = (userId, taskId) => `${userId}:${taskId}`;

const isRateLimited = (userId, taskId) => {
  const now = Date.now();
  const key = getAttemptKey(userId, taskId);

  const record = attemptMap.get(key);
  if (!record || now - record.windowStart > FLAG_WINDOW_MS) {
    attemptMap.set(key, { count: 1, windowStart: now });
    return false;
  }

  record.count += 1;
  attemptMap.set(key, record);
  return record.count > FLAG_MAX_ATTEMPTS;
};

const sha256Hex = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").toLowerCase();

export const submitFlag = asyncHandler(async (req, res) => {
  const { taskId, flag } = req.body;

  if (!taskId || !flag) {
    throw new ApiError("taskId and flag are required", 400);
  }

  const userId = req.user._id.toString();

  if (isRateLimited(userId, taskId)) {
    throw new ApiError(
      "Too many flag attempts. Please wait a minute before trying again.",
      429
    );
  }

  const task = await Task.findOne({ _id: taskId, isPublished: true }).select(
    "+flagHash"
  );

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  if (task.type !== "flag") {
    throw new ApiError("This task does not accept flags", 400);
  }

  if (!task.flagHash?.trim()) {
    throw new ApiError("This task has no flag configured", 400);
  }

  const existing = await UserTaskProgress.findOne({
    userId: req.user._id,
    taskId: task._id,
  });

  if (existing?.completedAt) {
    return res.status(200).json({
      success: true,
      message: "Task already completed",
      data: {
        taskId: task._id,
        completedAt: existing.completedAt,
        pointsEarned: existing.pointsEarned,
        alreadySolved: true,
      },
    });
  }

  const submittedHash = sha256Hex(flag.trim());
  const expectedHash = task.flagHash.trim().toLowerCase();
  const isCorrect = submittedHash === expectedHash;

  const update = {
    $setOnInsert: {
      userId: req.user._id,
      taskId: task._id,
      attempts: 0,
      createdAt: new Date(),
    },
    $set: {
      updatedAt: new Date(),
    },
    $inc: {
      attempts: 1,
    },
  };

  if (isCorrect) {
    update.$set.completedAt = new Date();
    update.$set.pointsEarned = task.points;
  }

  const updated = await UserTaskProgress.findOneAndUpdate(
    {
      userId: req.user._id,
      taskId: task._id,
    },
    update,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!isCorrect) {
    throw new ApiError("Incorrect flag", 400);
  }

  res.status(200).json({
    success: true,
    message: "Correct flag!",
    data: {
      taskId: task._id,
      attempts: updated.attempts,
      pointsEarned: task.points,
    },
  });
});

export default {
  submitFlag,
};
