import crypto from 'crypto'
import Task from '../models/Task.js'
import UserTaskProgress from '../models/UserTaskProgress.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import { getRedis } from '../config/redis.js'
import {
  invalidateLeaderboardCache,
  addPointsToLeaderboard,
} from './leaderboard.controller.js'

// ── Config ────────────────────────────────────────────────────────────
const FLAG_WINDOW_S = 60
const FLAG_MAX_ATTEMPTS = 5
const DEDUP_TTL_S = 5 * 60    // 5 min dedup window to prevent double-submit racing

// ── In-process fallback (used when Redis is absent) ───────────────────
const _attemptMap = new Map()

const sha256Hex = (value) =>
  crypto.createHash('sha256').update(value).digest('hex').toLowerCase()

// ── Rate limiting ─────────────────────────────────────────────────────

/**
 * Check and increment attempt count for a user+task pair.
 * Returns true if the request should be rate-limited.
 * Redis path: uses INCR + EXPIRE for an atomic sliding-window counter.
 */
const checkRateLimit = async (userId, taskId) => {
  const key = `flag:ratelimit:${userId}:${taskId}`
  const redis = getRedis()

  if (redis) {
    const count = await redis.incr(key)
    if (count === 1) {
      // First attempt in window – start the TTL
      await redis.expire(key, FLAG_WINDOW_S)
    }
    return count > FLAG_MAX_ATTEMPTS
  }

  // ── In-memory fallback ─────────────────────────────────────────────
  const now = Date.now()
  const record = _attemptMap.get(key)

  if (!record || now - record.windowStart > FLAG_WINDOW_S * 1000) {
    _attemptMap.set(key, { count: 1, windowStart: now })
    return false
  }

  record.count += 1
  _attemptMap.set(key, record)
  return record.count > FLAG_MAX_ATTEMPTS
}

// ── Flag deduplication ────────────────────────────────────────────────

/**
 * Check and set a dedup key so a racing double-submit doesn't earn double points.
 * Returns true if this submission is a duplicate (within the dedup window).
 */
const checkAndSetDedup = async (userId, taskId) => {
  const redis = getRedis()
  if (!redis) return false  // no dedup without Redis – acceptable trade-off

  const key = `flag:dedup:${userId}:${taskId}`
  // SET NX → only sets if key doesn't exist; EX = TTL
  const set = await redis.set(key, '1', 'EX', DEDUP_TTL_S, 'NX')
  return set === null  // null means key already existed → duplicate
}

// ── Handler ───────────────────────────────────────────────────────────

export const submitFlag = asyncHandler(async (req, res) => {
  const { taskId, flag } = req.body

  if (!taskId || !flag) {
    throw new ApiError('taskId and flag are required', 400)
  }

  const userId = req.user._id.toString()

  // 1. Rate limit check
  if (await checkRateLimit(userId, taskId)) {
    throw new ApiError(
      'Too many flag attempts. Please wait a minute before trying again.',
      429,
    )
  }

  // 2. Load task
  const task = await Task.findOne({ _id: taskId, isPublished: true }).select('+flagHash')

  if (!task) throw new ApiError('Task not found', 404)
  if (task.type !== 'flag') throw new ApiError('This task does not accept flags', 400)
  if (!task.flagHash?.trim()) throw new ApiError('This task has no flag configured', 400)

  // 3. Already solved?
  const existing = await UserTaskProgress.findOne({
    userId: req.user._id,
    taskId: task._id,
  })

  if (existing?.completedAt) {
    return res.status(200).json({
      success: true,
      message: 'Task already completed',
      data: {
        taskId: task._id,
        completedAt: existing.completedAt,
        pointsEarned: existing.pointsEarned,
        alreadySolved: true,
      },
    })
  }

  // 4. Hash & compare
  const submittedHash = sha256Hex(flag.trim())
  const expectedHash = task.flagHash.trim().toLowerCase()
  const isCorrect = submittedHash === expectedHash

  if (!isCorrect) {
    throw new ApiError('Incorrect flag', 400)
  }

  // 5. Dedup guard (prevents race-condition double-point awards)
  const isDuplicate = await checkAndSetDedup(userId, taskId)
  if (isDuplicate) {
    throw new ApiError('Submission already processing, please wait.', 409)
  }

  // 6. Persist progress
  const update = {
    $setOnInsert: {
      userId: req.user._id,
      taskId: task._id,
      attempts: 0,
      createdAt: new Date(),
    },
    $set: {
      updatedAt: new Date(),
      completedAt: new Date(),
      pointsEarned: task.points,
    },
    $inc: { attempts: 1 },
  }

  const updated = await UserTaskProgress.findOneAndUpdate(
    { userId: req.user._id, taskId: task._id },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  // 7. Update Redis leaderboard sorted set immediately (no wait for 5-min cycle)
  const tasksCompleted = await UserTaskProgress.countDocuments({
    userId: req.user._id,
    completedAt: { $ne: null },
  })
  await addPointsToLeaderboard(
    userId,
    task.points,
    req.user.username,
    tasksCompleted,
  )
  // Also invalidate the full JSON snapshot so next /leaderboard call rebuilds
  await invalidateLeaderboardCache()

  res.status(200).json({
    success: true,
    message: 'Correct flag! 🎉',
    data: {
      taskId: task._id,
      attempts: updated.attempts,
      pointsEarned: task.points,
    },
  })
})

export default { submitFlag }
