import express from 'express'
import { createCourse, updateCourse } from '../controllers/course.controller.js'
import { createModule, updateModule } from '../controllers/module.controller.js'
import { createTask, updateTask } from '../controllers/task.controller.js'
import { verifyToken, isInstructor } from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(verifyToken, isInstructor)

router.post('/courses', createCourse)
router.put('/courses/:id', updateCourse)
router.post('/courses/:courseId/modules', createModule)
router.put('/modules/:id', updateModule)
router.post('/modules/:moduleId/tasks', createTask)
router.put('/tasks/:id', updateTask)

export default router
