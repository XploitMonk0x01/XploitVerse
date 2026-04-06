import express from 'express'
import { chat, getSuggestions } from '../controllers/chat.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import {
  chatValidation,
  suggestionsValidation,
  validate,
} from '../validators/index.js'

const router = express.Router()

// All chat routes require authentication
router.use(verifyToken)

/**
 * @route   POST /api/chat
 * @desc    Send message to AI Mentor
 * @access  Private
 */
router.post('/', chatValidation, validate, chat)

/**
 * @route   GET /api/chat/suggestions
 * @desc    Get suggested questions for current lab
 * @access  Private
 */
router.get('/suggestions', suggestionsValidation, validate, getSuggestions)

export default router
