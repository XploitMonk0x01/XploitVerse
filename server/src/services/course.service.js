import Course from '../models/Course.js'
import Module from '../models/Module.js'
import { ApiError } from '../middleware/error.middleware.js'

const slugify = (input = '') => {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'course'
}

export const listPublishedCourses = async ({
  page = 1,
  limit = 12,
  search,
  difficulty,
}) => {
  const query = { isPublished: true }

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

  const pageNum = parseInt(page, 10)
  const limitNum = parseInt(limit, 10)
  const skip = (pageNum - 1) * limitNum

  const [courses, total] = await Promise.all([
    Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Course.countDocuments(query),
  ])

  return {
    courses,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  }
}

export const getPublishedCourseBySlug = async (slug) => {
  const course = await Course.findOne({ slug, isPublished: true })

  if (!course) {
    throw new ApiError('Course not found', 404)
  }

  const modules = await Module.find({
    courseId: course._id,
    isPublished: true,
  }).sort({ order: 1 })

  return {
    course,
    modules,
  }
}

export const createCourseRecord = async ({
  title,
  slug,
  description,
  difficulty,
  category,
  tags,
  isPremium,
  isPublished,
}) => {
  if (!title || title.trim().length < 3) {
    throw new ApiError('Title is required and must be at least 3 characters', 400)
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

  return course
}

export const updateCourseById = async (
  id,
  { title, slug, description, difficulty, category, tags, isPremium, isPublished },
) => {
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
  return course
}

export default {
  listPublishedCourses,
  getPublishedCourseBySlug,
  createCourseRecord,
  updateCourseById,
}
