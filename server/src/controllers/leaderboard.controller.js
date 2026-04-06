import { asyncHandler } from '../middleware/error.middleware.js'
import leaderboardService from '../services/leaderboard.service.js'

// ── Route handlers ────────────────────────────────────────────────────

export const getLeaderboard = asyncHandler(async (_req, res) => {
  const data = await leaderboardService.getLeaderboardData()

  res.status(200).json({
    success: true,
    data,
  })
})

export const getMyRank = asyncHandler(async (req, res) => {
  const data = await leaderboardService.getMyRankData(req.user)

  res.status(200).json({
    success: true,
    data,
  })
})

export default { getLeaderboard, getMyRank }
