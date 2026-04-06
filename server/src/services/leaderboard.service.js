import UserTaskProgress from '../models/UserTaskProgress.js'
import User from '../models/User.js'
import {
  getRedisClient,
  zrevrangeWithScores,
  zincrby,
} from './redis.service.js'

const REDIS_LB_KEY = 'leaderboard:global'
const CACHE_TTL_S = 5 * 60
const FALLBACK_TTL_MS = 5 * 60 * 1000

let _memCache = []
let _memCachedAt = null

const runAggregation = async () => {
  const rows = await UserTaskProgress.aggregate([
    { $match: { completedAt: { $ne: null } } },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$pointsEarned' },
        tasksCompleted: { $sum: 1 },
      },
    },
    { $sort: { totalPoints: -1, tasksCompleted: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: '$_id',
        username: '$user.username',
        avatar: '$user.avatar',
        totalPoints: 1,
        tasksCompleted: 1,
      },
    },
  ])

  return rows.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId?.toString(),
    username: entry.username || 'unknown',
    avatar: entry.avatar || null,
    totalPoints: entry.totalPoints,
    tasksCompleted: entry.tasksCompleted,
  }))
}

const rebuildRedisCache = async (redis, rows) => {
  const pipeline = redis.pipeline()
  pipeline.del(REDIS_LB_KEY)

  rows.forEach((entry) => {
    pipeline.zadd(REDIS_LB_KEY, entry.totalPoints, entry.userId)
  })

  pipeline.expire(REDIS_LB_KEY, CACHE_TTL_S)
  await pipeline.exec()
}

const getLeaderboardRows = async () => {
  const redis = getRedisClient()

  if (redis) {
    const rawRows = await zrevrangeWithScores(REDIS_LB_KEY, 0, 49)

    if (rawRows && rawRows.length > 0) {
      const scoreMap = []
      for (let i = 0; i < rawRows.length; i += 2) {
        scoreMap.push({
          userId: rawRows[i],
          totalPoints: Number(rawRows[i + 1]),
        })
      }

      const users = await User.find({
        _id: { $in: scoreMap.map((r) => r.userId) },
      })
        .select('_id username avatar')
        .lean()

      const userMap = new Map(users.map((u) => [u._id.toString(), u]))

      const rows = scoreMap.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: userMap.get(entry.userId)?.username || 'unknown',
        avatar: userMap.get(entry.userId)?.avatar || null,
        totalPoints: entry.totalPoints,
      }))

      return { rows, cachedAt: new Date().toISOString() }
    }

    const rows = await runAggregation()
    await rebuildRedisCache(redis, rows)
    return { rows, cachedAt: new Date().toISOString() }
  }

  const stale =
    !_memCachedAt || Date.now() - _memCachedAt.getTime() > FALLBACK_TTL_MS
  if (stale) {
    _memCache = await runAggregation()
    _memCachedAt = new Date()
  }

  return { rows: _memCache, cachedAt: _memCachedAt?.toISOString() }
}

export const getLeaderboardData = async () => {
  const { rows, cachedAt } = await getLeaderboardRows()
  return {
    leaderboard: rows,
    cachedAt,
    source: getRedisClient() ? 'redis' : 'memory',
  }
}

export const getMyRankData = async (user) => {
  const userId = user._id.toString()
  const redis = getRedisClient()

  if (redis) {
    let [rank, score] = await Promise.all([
      redis.zrevrank(REDIS_LB_KEY, userId),
      redis.zscore(REDIS_LB_KEY, userId),
    ])

    let total = await redis.zcard(REDIS_LB_KEY)
    if (!total || total === 0) {
      const rows = await runAggregation()
      await rebuildRedisCache(redis, rows)
      ;[rank, score] = await Promise.all([
        redis.zrevrank(REDIS_LB_KEY, userId),
        redis.zscore(REDIS_LB_KEY, userId),
      ])
      total = await redis.zcard(REDIS_LB_KEY)
    }

    return {
      entry: {
        rank: rank !== null ? rank + 1 : -1,
        userId,
        username: user.username || 'unknown',
        totalPoints: score ? parseFloat(score) : 0,
        avatar: user.avatar || null,
      },
      total,
      source: 'redis',
    }
  }

  const { rows } = await getLeaderboardRows()
  const entry = rows.find((r) => r.userId === userId)

  return {
    entry: entry || {
      rank: -1,
      userId,
      username: user.username,
      totalPoints: 0,
      tasksCompleted: 0,
    },
    total: rows.length,
    source: 'memory',
  }
}

export const invalidateLeaderboardCache = async () => {
  const redis = getRedisClient()
  if (redis) {
    await redis.del(REDIS_LB_KEY)
  } else {
    _memCachedAt = null
  }
}

export const addPointsToLeaderboard = async (userId, points) => {
  const redis = getRedisClient()
  if (!redis) return

  await zincrby(REDIS_LB_KEY, points, userId.toString())
  await redis.expire(REDIS_LB_KEY, CACHE_TTL_S)
}

export default {
  getLeaderboardData,
  getMyRankData,
  invalidateLeaderboardCache,
  addPointsToLeaderboard,
}
