import mongoose from "mongoose";
import Task from "../models/Task.js";
import { asyncHandler, ApiError } from "../middleware/error.middleware.js";

export const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid task ID", 400);
  }

  const task = await Task.findOne({ _id: id, isPublished: true });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    data: { task },
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const {
    title,
    type,
    order,
    prompt,
    contentMd,
    hints,
    points,
    hintPenalty,
    flagHash,
    isPublished,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    throw new ApiError("Invalid module ID", 400);
  }

  if (!title || title.trim().length < 3) {
    throw new ApiError("Title is required and must be at least 3 characters", 400);
  }

  if (!type) {
    throw new ApiError("Task type is required", 400);
  }

  const task = await Task.create({
    moduleId,
    title,
    type,
    order,
    prompt,
    contentMd,
    hints,
    points,
    hintPenalty,
    flagHash,
    isPublished,
  });

  res.status(201).json({
    success: true,
    message: "Task created",
    data: { task },
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid task ID", 400);
  }

  const task = await Task.findById(id).select("+flagHash");

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  const updatable = [
    "title",
    "type",
    "order",
    "prompt",
    "contentMd",
    "hints",
    "points",
    "hintPenalty",
    "flagHash",
    "isPublished",
  ];

  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  }

  await task.save();

  res.status(200).json({
    success: true,
    message: "Task updated",
    data: { task },
  });
});

export default {
  getTaskById,
  createTask,
  updateTask,
};
