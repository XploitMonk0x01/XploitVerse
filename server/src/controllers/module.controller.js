import mongoose from 'mongoose'
import Module from '../models/Module.js'
import Task from '../models/Task.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'

export const getModuleById = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('Invalid module ID', 400)
  }

  let module = await Module.findOne({ _id: id, isPublished: true })

  if (!module && process.env.NODE_ENV !== 'production') {
    module = await Module.findById(id)
  }

  if (!module) {
    throw new ApiError('Module not found', 404)
  }

  let tasks = await Task.find({
    moduleId: module._id,
    isPublished: true,
  }).sort({ order: 1 })

  if (tasks.length === 0 && process.env.NODE_ENV !== 'production') {
    tasks = await Task.find({ moduleId: module._id }).sort({ order: 1 })
  }

  res.status(200).json({
    success: true,
    data: {
      module,
      tasks,
    },
  })
})

export const createModule = asyncHandler(async (req, res) => {
  const { courseId } = req.params
  const { title, description, order, pointsReward, isPublished } = req.body

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError('Invalid course ID', 400)
  }

  if (!title || title.trim().length < 3) {
    throw new ApiError(
      'Title is required and must be at least 3 characters',
      400,
    )
  }

  const module = await Module.create({
    courseId,
    title,
    description,
    order,
    pointsReward,
    isPublished,
  })

  res.status(201).json({
    success: true,
    message: 'Module created',
    data: { module },
  })
})

export const updateModule = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, description, order, pointsReward, isPublished } = req.body

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

  res.status(200).json({
    success: true,
    message: 'Module updated',
    data: { module },
  })
})

export default {
  getModuleById,
  createModule,
  updateModule,
}
