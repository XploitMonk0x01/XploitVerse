import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import LabSession, { LAB_STATUS } from '../models/LabSession.js'
import autoTerminationService from '../services/autoTermination.service.js'
import { execShell, resizeExec } from '../services/docker.service.js'
import { createModuleLogger } from '../utils/logger.js'

const INPUT_RATE_WINDOW_MS = 1000
const MAX_INPUT_EVENTS_PER_WINDOW = 120
const MAX_INPUT_BYTES_PER_WINDOW = 8192
const MAX_RATE_VIOLATIONS = 5

const log = createModuleLogger('socket')

const readJwtFromCookieHeader = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null

  const cookies = cookieHeader.split(';')
  for (const cookiePart of cookies) {
    const [rawKey, ...rawValue] = cookiePart.trim().split('=')
    if (rawKey === 'jwt') {
      return decodeURIComponent(rawValue.join('='))
    }
  }

  return null
}

const authenticateSocket = (socket, next) => {
  try {
    const tokenFromCookie = readJwtFromCookieHeader(
      socket.handshake.headers?.cookie,
    )

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      tokenFromCookie

    if (!token) return next(new Error('Authentication required'))

    const decoded = jwt.verify(token, config.jwt.secret)
    socket.userId = decoded.id
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}

const emitCountdown = async (socket, sessionId) => {
  const session = await LabSession.findOne({
    _id: sessionId,
    user: socket.userId,
  })
  if (!session || session.status !== LAB_STATUS.RUNNING) {
    if (socket.countdownInterval) {
      clearInterval(socket.countdownInterval)
      socket.countdownInterval = null
    }
    return
  }

  const expiresAt = session.autoTerminateAt
  const remainingSeconds = expiresAt
    ? Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      )
    : 0

  socket.emit('lab-time-remaining', {
    remainingSeconds,
    expiresAt,
  })

  if (remainingSeconds <= 0) {
    if (socket.countdownInterval) {
      clearInterval(socket.countdownInterval)
      socket.countdownInterval = null
    }
    await autoTerminationService.terminateSession(sessionId, 'TTL expired')
  }
}

const cleanupSocketTerminal = (socket) => {
  if (socket.countdownInterval) {
    clearInterval(socket.countdownInterval)
    socket.countdownInterval = null
  }

  if (socket.terminalStream) {
    try {
      socket.terminalStream.end()
    } catch {
      // ignore stream close errors
    }
    socket.terminalStream = null
  }

  socket.execInstance = null
  socket.activeSessionId = null
  socket.inputRate = null
}

export const initializeSocketHandlers = (io) => {
  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`)

    socket.on('join-lab', async ({ sessionId }) => {
      try {
        if (!sessionId) {
          socket.emit('terminal-error', { message: 'Session ID is required' })
          return
        }

        const session = await LabSession.findById(sessionId)

        if (!session || session.user.toString() !== socket.userId) {
          socket.emit('terminal-error', {
            message: 'Session not found or unauthorized',
          })
          return
        }

        if (session.status !== LAB_STATUS.RUNNING) {
          socket.emit('terminal-error', {
            message: 'Lab session is not running',
          })
          return
        }

        if (
          !session.autoTerminateAt ||
          new Date(session.autoTerminateAt).getTime() <= Date.now()
        ) {
          socket.emit('terminal-error', { message: 'Lab session has expired' })
          return
        }

        const containerId = session.metadata?.containerId
        if (!containerId) {
          socket.emit('terminal-error', {
            message: 'Container not found or not running',
          })
          return
        }

        socket.join(`lab-${sessionId}`)
        cleanupSocketTerminal(socket)

        // Use the shared docker service for exec
        const result = await execShell(containerId)
        if (!result) {
          socket.emit('terminal-error', {
            message: 'Container not found or not running',
          })
          return
        }

        const { exec, stream } = result

        socket.execInstance = exec
        socket.terminalStream = stream
        socket.activeSessionId = sessionId
        socket.inputRate = {
          windowStart: Date.now(),
          events: 0,
          bytes: 0,
          violations: 0,
        }

        stream.on('data', (chunk) => {
          socket.emit('terminal-output', { data: chunk.toString('utf8') })
        })

        stream.on('error', () => {
          socket.emit('terminal-error', {
            message: 'Failed to attach to container terminal',
          })
        })

        stream.on('end', () => {
          socket.emit('terminal-output', {
            data: '\r\n[terminal disconnected]\r\n',
          })
        })

        socket.emit('terminal-ready', { sessionId })

        await emitCountdown(socket, sessionId)
        socket.countdownInterval = setInterval(async () => {
          await emitCountdown(socket, sessionId)
        }, 60000)
      } catch (error) {
        socket.emit('terminal-error', {
          message: error.message || 'Failed to attach to container terminal',
        })
      }
    })

    socket.on('terminal-input', ({ data }) => {
      if (!socket.terminalStream) return

      const input = typeof data === 'string' ? data : ''
      if (!input) return

      const now = Date.now()
      if (!socket.inputRate) {
        socket.inputRate = {
          windowStart: now,
          events: 0,
          bytes: 0,
          violations: 0,
        }
      }

      if (now - socket.inputRate.windowStart >= INPUT_RATE_WINDOW_MS) {
        socket.inputRate.windowStart = now
        socket.inputRate.events = 0
        socket.inputRate.bytes = 0
      }

      socket.inputRate.events += 1
      socket.inputRate.bytes += Buffer.byteLength(input, 'utf8')

      const isRateLimited =
        socket.inputRate.events > MAX_INPUT_EVENTS_PER_WINDOW ||
        socket.inputRate.bytes > MAX_INPUT_BYTES_PER_WINDOW

      if (isRateLimited) {
        socket.inputRate.violations += 1
        if (socket.inputRate.violations <= MAX_RATE_VIOLATIONS) {
          socket.emit('terminal-error', {
            message: 'Terminal input rate limit exceeded. Please slow down.',
          })
        }

        if (socket.inputRate.violations === MAX_RATE_VIOLATIONS) {
          log.warn(
            { userId: socket.userId, sessionId: socket.activeSessionId },
            'Socket terminal input rate limited repeatedly',
          )
        }
        return
      }

      try {
        socket.terminalStream.write(input)
      } catch {
        socket.emit('terminal-error', {
          message: 'Failed to write to terminal stream',
        })
      }
    })

    socket.on('terminal-resize', async ({ cols, rows }) => {
      if (!socket.execInstance) return

      try {
        await resizeExec(socket.execInstance, cols, rows)
      } catch {
        socket.emit('terminal-error', { message: 'Failed to resize terminal' })
      }
    })

    socket.on('leave-lab', ({ sessionId }) => {
      if (sessionId) {
        socket.leave(`lab-${sessionId}`)
      }
      cleanupSocketTerminal(socket)
    })

    socket.on('disconnect', () => {
      cleanupSocketTerminal(socket)
    })
  })

  log.info('Socket.io terminal handlers initialized')
}

export default { initializeSocketHandlers }
