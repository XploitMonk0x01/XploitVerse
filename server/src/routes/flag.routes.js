import express from 'express'
import { submitFlag } from '../controllers/flag.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.post('/submit', submitFlag)

export default router
