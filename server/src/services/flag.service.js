import crypto from 'crypto'
import Task from '../models/Task.js'
import UserTaskProgress from '../models/UserTaskProgress.js'
import { ApiError } from '../middleware/error.middleware.js'
import { addPointsToLeaderboard } from './leaderboard.service.js'
import { getRedisClient, get, incr, expire, del } from './redis.service.js'

const FLAG_WINDOW_S = 60
const FLAG_MAX_ATTEMPTS = 5
const DEDUP_TTL_S = 5 * 60

const _attemptMap = new Map()

const sha256Hex = (value) =>
  crypto.createHash('sha256').update(value).digest('hex').toLowerCase()

const checkRateLimit = async (userId, taskId) => {
  const key = `flag:attempts:${userId}:${taskId}`
  const redis = getRedisClient()

  if (redis) {
    const attemptsRaw = await get(key)
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0
    return attempts >= FLAG_MAX_ATTEMPTS
  }

  const now = Date.now()
  const record = _attemptMap.get(key)

  if (!record || now - record.windowStart > FLAG_WINDOW_S * 1000) {
    return false
  }

  return record.count >= FLAG_MAX_ATTEMPTS
}

const checkAndSetDedup = async (userId, taskId) => {
  const redis = getRedisClient()
  if (!redis) return false

  const key = `flag:dedup:${userId}:${taskId}`
  const set = await redis.set(key, '1', 'EX', DEDUP_TTL_S, 'NX')
  return set === null
}

const incrementAttempts = async (userId, taskId) => {
  if (getRedisClient()) {
    await incr(`flag:attempts:${userId}:${taskId}`)
    await expire(`flag:attempts:${userId}:${taskId}`, FLAG_WINDOW_S)
    return
  }

  const key = `flag:attempts:${userId}:${taskId}`
  const now = Date.now()
  const record = _attemptMap.get(key)
  if (!record || now - record.windowStart > FLAG_WINDOW_S * 1000) {
    _attemptMap.set(key, { count: 1, windowStart: now })
  } else {
    _attemptMap.set(key, { ...record, count: record.count + 1 })
  }
}

export const submitFlagForUser = async ({ user, taskId, flag }) => {
  if (!taskId || !flag) {
    throw new ApiError('taskId and flag are required', 400)
  }

  const userId = user._id.toString()

  if (await checkRateLimit(userId, taskId)) {
    throw new ApiError(
      'Too many flag attempts. Please wait a minute before trying again.',
      429,
    )
  }

  const task = await Task.findOne({ _id: taskId, isPublished: true }).select(
    '+flagHash',
  )

  if (!task) throw new ApiError('Task not found', 404)
  if (task.type !== 'flag')
    throw new ApiError('This task does not accept flags', 400)
  if (!task.flagHash?.trim()) {
    throw new ApiError('This task has no flag configured', 400)
  }

  const existing = await UserTaskProgress.findOne({
    userId: user._id,
    taskId: task._id,
  })

  if (existing?.completedAt) {
    return {
      message: 'Task already completed',
      data: {
        taskId: task._id,
        completedAt: existing.completedAt,
        pointsEarned: existing.pointsEarned,
        alreadySolved: true,
      },
    }
  }

  const submittedHash = sha256Hex(flag.trim())
  const expectedHash = task.flagHash.trim().toLowerCase()
  const isCorrect = submittedHash === expectedHash

  if (!isCorrect) {
    await incrementAttempts(userId, taskId)
    throw new ApiError('Incorrect flag', 400)
  }

  const isDuplicate = await checkAndSetDedup(userId, taskId)
  if (isDuplicate) {
    throw new ApiError('Submission already processing, please wait.', 409)
  }

  const update = {
    $setOnInsert: {
      userId: user._id,
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
    { userId: user._id, taskId: task._id },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  await addPointsToLeaderboard(userId, task.points)
  await del(`flag:attempts:${userId}:${taskId}`)

  return {
    message: 'Correct flag! 🎉',
    data: {
      taskId: task._id,
      attempts: updated.attempts,
      pointsEarned: task.points,
    },
  }
}

export default {
  submitFlagForUser,
}
