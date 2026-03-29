import express from 'express'
import { getModuleById } from '../controllers/module.controller.js'

const router = express.Router()

router.get('/:id', getModuleById)

export default router
