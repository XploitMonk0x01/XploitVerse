import mongoose from 'mongoose'
import Module from '../models/Module.js'
import Task from '../models/Task.js'
import { ApiError } from '../middleware/error.middleware.js'

export const getPublishedModuleById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid module ID', 400)
  }

  const module = await Module.findOne({ _id: id, isPublished: true })

  if (!module) {
    throw new ApiError('Module not found', 404)
  }

  const tasks = await Task.find({
    moduleId: module._id,
    isPublished: true,
  }).sort({ order: 1 })

  return {
    module,
    tasks,
  }
}

export const createModuleForCourse = async (
  courseId,
  { title, description, order, pointsReward, isPublished },
) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError('Invalid course ID', 400)
  }

  if (!title || title.trim().length < 3) {
    throw new ApiError('Title is required and must be at least 3 characters', 400)
  }

  const module = await Module.create({
    courseId,
    title,
    description,
    order,
    pointsReward,
    isPublished,
  })

  return module
}

export const updateModuleById = async (
  id,
  { title, description, order, pointsReward, isPublished },
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid module ID', 400)
  }

  const module = await Module.findById(id)

  if (!module) {
    throw new ApiError('Module not found', 404)
  }

  if (typeof title === 'string') {
    module.title = title
  }
  if (typeof description === 'string') {
    module.description = description
  }
  if (typeof order === 'number') {
    module.order = order
  }
  if (typeof pointsReward === 'number') {
    module.pointsReward = pointsReward
  }
  if (typeof isPublished === 'boolean') {
    module.isPublished = isPublished
  }

  await module.save()
  return module
}

export default {
  getPublishedModuleById,
  createModuleForCourse,
  updateModuleById,
}
