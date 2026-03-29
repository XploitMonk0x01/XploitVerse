import express from 'express'
import {
  getLeaderboard,
  getMyRank,
} from '../controllers/leaderboard.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', getLeaderboard)
router.get('/me', verifyToken, getMyRank)

export default router
