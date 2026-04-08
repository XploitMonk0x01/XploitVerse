import mongoose from 'mongoose'
import Task from '../models/Task.js'
import { ApiError } from '../middleware/error.middleware.js'

export const getPublishedTaskById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid task ID', 400)
  }

  const task = await Task.findOne({ _id: id, isPublished: true })

  if (!task) {
    throw new ApiError('Task not found', 404)
  }

  return task
}

export const createTaskForModule = async (
  moduleId,
  {
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
  },
) => {
  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    throw new ApiError('Invalid module ID', 400)
  }

  if (!title || title.trim().length < 3) {
    throw new ApiError('Title is required and must be at least 3 characters', 400)
  }

  if (!type) {
    throw new ApiError('Task type is required', 400)
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
  })

  return task
}

export const updateTaskById = async (id, body) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid task ID', 400)
  }

  const task = await Task.findById(id).select('+flagHash')

  if (!task) {
    throw new ApiError('Task not found', 404)
  }

  const updatable = [
    'title',
    'type',
    'order',
    'prompt',
    'contentMd',
    'hints',
    'points',
    'hintPenalty',
    'flagHash',
    'isPublished',
  ]

  for (const field of updatable) {
    if (body[field] !== undefined) {
      task[field] = body[field]
    }
  }

  await task.save()
  return task
}

export default {
  getPublishedTaskById,
  createTaskForModule,
  updateTaskById,
}
