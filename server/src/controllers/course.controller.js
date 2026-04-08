import Course from '../models/Course.js'
import Module from '../models/Module.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'

const slugify = (input = '') => {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'course'
}

export const getAllCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search, difficulty } = req.query

  const buildQuery = (publishedOnly = true) => {
    const query = {}

    if (publishedOnly) {
      query.isPublished = true
    }

    if (difficulty) {
      query.difficulty = difficulty
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ]
    }

    return query
  }

  const pageNum = parseInt(page, 10)
  const limitNum = parseInt(limit, 10)
  const skip = (pageNum - 1) * limitNum

  let query = buildQuery(true)
  let [courses, total] = await Promise.all([
    Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Course.countDocuments(query),
  ])

  // Dev fallback: show draft content if nothing is published yet.
  if (total === 0 && process.env.NODE_ENV !== 'production') {
    query = buildQuery(false)
    ;[courses, total] = await Promise.all([
      Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Course.countDocuments(query),
    ])
  }

  res.status(200).json({
    success: true,
    data: {
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  })
})

export const getCourseBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params

  let course = await Course.findOne({ slug, isPublished: true })

  if (!course && process.env.NODE_ENV !== 'production') {
    course = await Course.findOne({ slug })
  }

  if (!course) {
    throw new ApiError('Course not found', 404)
  }

  let modules = await Module.find({
    courseId: course._id,
    isPublished: true,
  }).sort({ order: 1 })

  if (modules.length === 0 && process.env.NODE_ENV !== 'production') {
    modules = await Module.find({ courseId: course._id }).sort({ order: 1 })
  }

  res.status(200).json({
    success: true,
    data: {
      course,
      modules,
    },
  })
})

export const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    description,
    difficulty,
    category,
    tags,
    isPremium,
    isPublished,
  } = req.body

  if (!title || title.trim().length < 3) {
    throw new ApiError(
      'Title is required and must be at least 3 characters',
      400,
    )
  }

  const normalizedSlug = slugify(slug || title)

  const existing = await Course.findOne({ slug: normalizedSlug })
  if (existing) {
    throw new ApiError('A course with this slug already exists', 400)
  }

  const course = await Course.create({
    title,
    slug: normalizedSlug,
    description,
    difficulty,
    category,
    tags,
    isPremium,
    isPublished,
  })

  res.status(201).json({
    success: true,
    message: 'Course created',
    data: { course },
  })
})

export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    title,
    slug,
    description,
    difficulty,
    category,
    tags,
    isPremium,
    isPublished,
  } = req.body

  const course = await Course.findById(id)
  if (!course) {
    throw new ApiError('Course not found', 404)
  }

  if (typeof title === 'string') {
    course.title = title.trim()
  }
  if (typeof description === 'string') {
    course.description = description
  }
  if (typeof difficulty === 'string') {
    course.difficulty = difficulty
  }
  if (typeof category === 'string') {
    course.category = category
  }
  if (Array.isArray(tags)) {
    course.tags = tags
  }
  if (typeof isPremium === 'boolean') {
    course.isPremium = isPremium
  }
  if (typeof isPublished === 'boolean') {
    course.isPublished = isPublished
  }

  if (typeof slug === 'string') {
    course.slug = slugify(slug)
  }

  await course.save()

  res.status(200).json({
    success: true,
    message: 'Course updated',
    data: { course },
  })
})

export default {
  getAllCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
}
