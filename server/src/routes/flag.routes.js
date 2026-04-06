import express from 'express'
import { submitFlag } from '../controllers/flag.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { submitFlagValidation, validate } from '../validators/index.js'

const router = express.Router()

router.use(verifyToken)
router.post('/submit', submitFlagValidation, validate, submitFlag)

export default router
