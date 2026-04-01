import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import config from './config/index.js'
import connectDB from './config/database.js'
import { connectRedis } from './config/redis.js'
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

// Security Middleware
app.use(helmet())
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More lenient in dev
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
})
app.use('/api', limiter)

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 10, // More lenient in dev
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
})
app.use('/api/auth', authLimiter)

// Body parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'XploitVerse API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  })
})

// API Routes
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

// API Documentation endpoint (placeholder for Phase 2)
app.get('/api', (req, res) => {
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
    },
  })
})

// Error Handling
app.use(notFound)
app.use(errorHandler)

// Start server after DB connection succeeds
const PORT = config.port

const startServer = async () => {
  await connectDB()
  await connectRedis()   // optional – app degrades gracefully without Redis

  httpServer.listen(PORT, () => {
    console.log(`
  XploitVerse API Server
=========================================
  Server:      http://localhost:${PORT}
  Environment: ${config.nodeEnv}
  API:         http://localhost:${PORT}/api
  WebSocket:   ws://localhost:${PORT}
  Health:      http://localhost:${PORT}/health
  Redis:       ${config.redisUrl || 'redis://localhost:6379'}
=========================================
    `)
  })
}

startServer()

export { io }
export default app
