import express from 'express'
import {
  getAllCourses,
  getCourseBySlug,
} from '../controllers/course.controller.js'

const router = express.Router()

router.get('/', getAllCourses)
router.get('/:slug', getCourseBySlug)

export default router
