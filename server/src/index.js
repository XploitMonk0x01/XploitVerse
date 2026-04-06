import express from 'express'
import { createServer } from 'http'
import crypto from 'crypto'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import config, { validateConfig } from './config/index.js'
import connectDB from './config/database.js'
import {
  authRoutes,
  userRoutes,
  labSessionRoutes,
  labRoutes,
  chatRoutes,
  courseRoutes,
  moduleRoutes,
  taskRoutes,
  flagRoutes,
  leaderboardRoutes,
  adminRoutes,
  subscriptionRoutes,
} from './routes/index.js'
import { errorHandler, notFound } from './middleware/error.middleware.js'
import { initializeSocketHandlers } from './socket/socketHandler.js'
import { initRedis, getRedisClient } from './services/redis.service.js'
import autoTerminationService from './services/autoTermination.service.js'
import { createModuleLogger, logger } from './utils/logger.js'

const log = createModuleLogger('server')

// ── Validate config before anything else ──────────────────────────────
validateConfig()

// Initialize Express app
const app = express()

// Create HTTP server for Socket.io
const httpServer = createServer(app)

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST'],
  },
})

// Initialize Socket handlers
initializeSocketHandlers(io)
autoTerminationService.init(io)

// ── Request ID middleware (correlation ID for tracing) ─────────────────
app.use((req, res, next) => {
  const incomingId = req.headers['x-request-id']
  req.id =
    typeof incomingId === 'string' && incomingId.trim()
      ? incomingId
      : crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
})

// Structured HTTP request logging with correlation IDs
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
  }),
)

// ── Security Middleware ───────────────────────────────────────────────
app.use(helmet())

// Additional security headers beyond Helmet defaults
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )
  next()
})

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }),
)

// ── Rate limiting ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 1000 : 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
})
app.use('/api', limiter)

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 100 : 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
})
app.use('/api/auth', authLimiter)

// ── Body parsing ──────────────────────────────────────────────────────
app.use(
  express.json({
    limit: '10kb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/subscriptions/webhook') {
        req.rawBody = buf.toString('utf8')
      }
    },
  }),
)
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// ── Health check endpoint ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'XploitVerse API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  })
})

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/lab-sessions', labSessionRoutes)
app.use('/api/labs', labRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/flags', flagRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/modules', moduleRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/subscriptions', subscriptionRoutes)

// API Documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to XploitVerse API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      labs: '/api/labs',
      labSessions: '/api/lab-sessions',
      chat: '/api/chat',
      flags: '/api/flags',
      courses: '/api/courses',
      modules: '/api/modules',
      tasks: '/api/tasks',
      leaderboard: '/api/leaderboard',
      admin: '/api/admin',
      subscriptions: '/api/subscriptions',
    },
  })
})

// ── Error Handling ────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────
const PORT = config.port

const startServer = async () => {
  await connectDB()
  await initRedis()
  await autoTerminationService.recoverFromRedis()

  httpServer.listen(PORT, () => {
    log.info(
      {
        port: PORT,
        env: config.nodeEnv,
        api: `http://localhost:${PORT}/api`,
        ws: `ws://localhost:${PORT}`,
        health: `http://localhost:${PORT}/health`,
        redis: getRedisClient() ? config.redisUrl : 'disabled',
      },
      'XploitVerse API Server started',
    )
  })
}

startServer()

// ── Graceful shutdown ─────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  log.info({ signal }, 'Shutting down gracefully...')

  // Stop accepting new connections
  httpServer.close(() => {
    log.info('HTTP server closed')
  })

  // Close Socket.io
  io.close(() => {
    log.info('Socket.io closed')
  })

  // Close Redis
  const redis = getRedisClient()
  if (redis) {
    await redis.quit()
    log.info('Redis disconnected')
  }

  // Close MongoDB
  const mongoose = (await import('mongoose')).default
  await mongoose.connection.close()
  log.info('MongoDB disconnected')

  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// ── Unhandled errors ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'Unhandled Rejection')
})

process.on('uncaughtException', (error) => {
  log.fatal({ err: error }, 'Uncaught Exception')
  process.exit(1)
})

export { io }
export default app
