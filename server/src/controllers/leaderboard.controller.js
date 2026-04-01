import UserTaskProgress from '../models/UserTaskProgress.js'
import { asyncHandler } from '../middleware/error.middleware.js'
import { getRedis } from '../config/redis.js'

// ── Keys ──────────────────────────────────────────────────────────────
const REDIS_LB_KEY = 'lb:sorted'          // Sorted set  score → userId
const REDIS_LB_META = 'lb:meta:'          // Hash prefix  lb:meta:{userId} → { username, tasksCompleted }
const REDIS_LB_FULL = 'lb:full_cache'   // JSON string  full top-100 list
const CACHE_TTL_S = 5 * 60              // 5 minutes
const FALLBACK_TTL_MS = 5 * 60 * 1000  // Used when Redis is absent

// ── In-memory fallback (unchanged from before) ────────────────────────
let _memCache = []
let _memCachedAt = null

// ── MongoDB aggregation ───────────────────────────────────────────────
const runAggregation = async () => {
  const rows = await UserTaskProgress.aggregate([
    { $match: { completedAt: { $ne: null } } },
    { $group: { _id: '$userId', totalPoints: { $sum: '$pointsEarned' }, tasksCompleted: { $sum: 1 } } },
    { $sort: { totalPoints: -1, tasksCompleted: -1 } },
    { $limit: 100 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: '$_id',
        username: '$user.username',
        totalPoints: 1,
        tasksCompleted: 1,
      },
    },
  ])
  return rows.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId?.toString(),
    username: entry.username || 'unknown',
    totalPoints: entry.totalPoints,
    tasksCompleted: entry.tasksCompleted,
  }))
}

// ── Redis helpers ─────────────────────────────────────────────────────

/**
 * Rebuild the Redis leaderboard sorted set + full JSON cache.
 * Called on every cache miss.
 */
const rebuildRedisCache = async (redis, rows) => {
  const pipeline = redis.pipeline()

  // Clear old data
  pipeline.del(REDIS_LB_KEY)
  pipeline.del(REDIS_LB_FULL)

  rows.forEach((entry) => {
    // Sorted set: score = totalPoints, member = userId
    pipeline.zadd(REDIS_LB_KEY, entry.totalPoints, entry.userId)
    // Meta hash for fast username lookup
    pipeline.hset(`${REDIS_LB_META}${entry.userId}`, {
      username: entry.username,
      tasksCompleted: entry.tasksCompleted,
    })
    pipeline.expire(`${REDIS_LB_META}${entry.userId}`, CACHE_TTL_S + 60)
  })

  // Full serialised list (avoids re-aggregation on every request)
  pipeline.set(REDIS_LB_FULL, JSON.stringify({ rows, cachedAt: new Date().toISOString() }), 'EX', CACHE_TTL_S)
  pipeline.expire(REDIS_LB_KEY, CACHE_TTL_S)

  await pipeline.exec()
}

/**
 * Get top-100 leaderboard rows.
 * Order of preference: Redis full cache → Redis sorted set → MongoDB agg → in-memory.
 */
const getLeaderboardRows = async () => {
  const redis = getRedis()

  if (redis) {
    // 1. Try full JSON cache (fastest path)
    const raw = await redis.get(REDIS_LB_FULL)
    if (raw) {
      return JSON.parse(raw)
    }

    // 2. Cache miss – run MongoDB aggregation and rebuild Redis
    const rows = await runAggregation()
    await rebuildRedisCache(redis, rows)
    return { rows, cachedAt: new Date().toISOString() }
  }

  // 3. No Redis — in-memory fallback
  const stale = !_memCachedAt || Date.now() - _memCachedAt.getTime() > FALLBACK_TTL_MS
  if (stale) {
    _memCache = await runAggregation()
    _memCachedAt = new Date()
  }
  return { rows: _memCache, cachedAt: _memCachedAt?.toISOString() }
}

/**
 * Invalidate the full cache key so the next request rebuilds.
 * Called after a flag is successfully submitted.
 */
export const invalidateLeaderboardCache = async () => {
  const redis = getRedis()
  if (redis) {
    await redis.del(REDIS_LB_FULL)
  } else {
    _memCachedAt = null  // force in-memory refresh
  }
}

/**
 * Update a user's score in the Redis sorted set directly (no full rebuild).
 * Called immediately after a correct flag – keeps the sorted set hot without
 * waiting for the 5-minute cache cycle.
 */
export const addPointsToLeaderboard = async (userId, points, username, tasksCompleted) => {
  const redis = getRedis()
  if (!redis) return

  await redis.zincrby(REDIS_LB_KEY, points, userId.toString())
  await redis.hset(`${REDIS_LB_META}${userId}`, { username, tasksCompleted })
  // Invalidate full JSON cache so next read rebuilds with updated data
  await redis.del(REDIS_LB_FULL)
}

// ── Route handlers ────────────────────────────────────────────────────

export const getLeaderboard = asyncHandler(async (_req, res) => {
  const { rows, cachedAt } = await getLeaderboardRows()

  res.status(200).json({
    success: true,
    data: {
      leaderboard: rows,
      cachedAt,
      source: getRedis() ? 'redis' : 'memory',
    },
  })
})

export const getMyRank = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString()
  const redis = getRedis()

  if (redis) {
    // O(log N) rank lookup directly from sorted set
    const [rank, score] = await Promise.all([
      redis.zrevrank(REDIS_LB_KEY, userId),   // 0-based rank (highest score = 0)
      redis.zscore(REDIS_LB_KEY, userId),
    ])

    const meta = await redis.hgetall(`${REDIS_LB_META}${userId}`)
    const totalPoints = score ? parseFloat(score) : 0
    const tasksCompleted = meta?.tasksCompleted ? parseInt(meta.tasksCompleted) : 0
    const username = meta?.username || req.user.username || 'unknown'
    const total = await redis.zcard(REDIS_LB_KEY)

    return res.status(200).json({
      success: true,
      data: {
        entry: {
          rank: rank !== null ? rank + 1 : -1,
          userId,
          username,
          totalPoints,
          tasksCompleted,
        },
        total,
        source: 'redis',
      },
    })
  }

  // Fallback: scan in-memory cache
  const { rows } = await getLeaderboardRows()
  const entry = rows.find((r) => r.userId === userId)

  res.status(200).json({
    success: true,
    data: {
      entry: entry ?? {
        rank: -1,
        userId,
        username: req.user.username,
        totalPoints: 0,
        tasksCompleted: 0,
      },
      total: rows.length,
      source: 'memory',
    },
  })
})

export default { getLeaderboard, getMyRank, invalidateLeaderboardCache, addPointsToLeaderboard }
