import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

const config = {
  // Server
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/xploitverse',

  // Redis (optional)
  redisUrl: process.env.REDIS_URL || '',

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7,
  },

  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // AWS (Phase 2+)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
  },

  // AI APIs (Phase 2+)
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
  },

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || '587',
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
    fromName: process.env.SMTP_FROM_NAME || 'XploitVerse',
  },

  // Lab Configuration (Phase 2+)
  lab: {
    hourlyRate: 0.5, // USD per hour
    maxSessionDuration: 4, // hours
    autoTerminateWarning: 15, // minutes before auto-terminate
  },
}

export default config
