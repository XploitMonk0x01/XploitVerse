import LabSession, { LAB_STATUS } from '../models/LabSession.js'
import User from '../models/User.js'
import * as dockerService from './docker.service.js'
import { getRedisClient, set, del } from './redis.service.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('auto-termination')

const LAB_TTL_PREFIX = 'lab:ttl:'
const DEFAULT_TTL_SECONDS = 60 * 60

class AutoTerminationService {
  constructor() {
    this.io = null
    this.timers = new Map()
  }

  init(io) {
    this.io = io
  }

  getTtlKey(sessionId) {
    return `${LAB_TTL_PREFIX}${sessionId}`
  }

  clearTimer(sessionId) {
    const existing = this.timers.get(sessionId)
    if (existing) {
      clearTimeout(existing)
      this.timers.delete(sessionId)
    }
  }

  async registerSession(session) {
    if (!session?._id) return

    const sessionId = session._id.toString()
    const userId = session.user?.toString?.() || session.user
    const containerId = session.metadata?.containerId || ''

    const expiresAt = session.autoTerminateAt
      ? new Date(session.autoTerminateAt)
      : new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000)

    const ttlSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    const key = this.getTtlKey(sessionId)

    await set(key, `${userId}:${containerId}`, ttlSeconds)
    this.scheduleSessionTermination(sessionId, ttlSeconds)
  }

  async removeSession(sessionId) {
    this.clearTimer(sessionId)
    await del(this.getTtlKey(sessionId))
  }

  scheduleSessionTermination(sessionId, ttlSeconds) {
    this.clearTimer(sessionId)

    const timeoutMs = Math.max(1000, ttlSeconds * 1000)
    const timeout = setTimeout(async () => {
      try {
        await this.terminateSession(sessionId, 'TTL expired')
      } catch (error) {
        log.warn({ sessionId, err: error.message }, 'Session termination failed')
      }
    }, timeoutMs)

    this.timers.set(sessionId, timeout)
  }

  async recoverFromRedis() {
    const redis = getRedisClient()
    if (!redis) return

    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${LAB_TTL_PREFIX}*`, 'COUNT', 100)
      cursor = nextCursor

      for (const key of keys) {
        const sessionId = key.replace(LAB_TTL_PREFIX, '')
        const ttlSeconds = await redis.ttl(key)

        if (ttlSeconds <= 0) {
          await this.terminateSession(sessionId, 'TTL expired')
          continue
        }

        this.scheduleSessionTermination(sessionId, ttlSeconds)
      }
    } while (cursor !== '0')

    log.info({ activeTimers: this.timers.size }, 'Recovered TTL timers from Redis')
  }

  async terminateSession(sessionId, reason = 'TTL expired') {
    const session = await LabSession.findById(sessionId)
    if (!session) {
      await this.removeSession(sessionId)
      return
    }

    if ([LAB_STATUS.TERMINATED, LAB_STATUS.STOPPED].includes(session.status)) {
      await this.removeSession(sessionId)
      return
    }

    if (session.metadata?.dockerMode && dockerService.isDockerAvailable()) {
      try {
        await dockerService.stopContainer(sessionId)
      } catch (error) {
        log.warn({ sessionId, err: error.message }, 'Failed to stop container')
      }
    }

    session.status = LAB_STATUS.TERMINATED
    session.endTime = new Date()

    if (session.startTime) {
      const minutes = Math.max(1, Math.ceil((session.endTime - session.startTime) / 60000))
      session.totalBillableMinutes = minutes
      session.finalCost = parseFloat(((minutes / 60) * session.hourlyRate).toFixed(2))
    }

    await session.save()

    if (session.finalCost) {
      await User.findByIdAndUpdate(session.user, {
        $inc: {
          totalLabTime: session.totalBillableMinutes,
          totalSpent: session.finalCost,
        },
      })
    }

    await this.removeSession(sessionId)

    if (this.io) {
      const payload = { sessionId, reason, status: LAB_STATUS.TERMINATED }
      this.io.to(`lab-${sessionId}`).emit('lab-terminated', payload)
      this.io.to(`user:${session.user.toString()}`).emit('lab-terminated', payload)
    }
  }
}

export default new AutoTerminationService()
