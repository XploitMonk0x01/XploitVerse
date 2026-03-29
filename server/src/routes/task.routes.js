import express from 'express'
import { getTaskById } from '../controllers/task.controller.js'

const router = express.Router()

router.get('/:id', getTaskById)

export default router
