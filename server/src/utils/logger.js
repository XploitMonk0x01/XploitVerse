import pino from 'pino'
import config from '../config/index.js'

/**
 * Structured JSON logger using pino.
 *
 * - In development: pretty-prints with colors for readability.
 * - In production: outputs JSON lines for log aggregators (Loki, Datadog, etc.).
 *
 * Usage:
 *   import { logger } from '../utils/logger.js'
 *   logger.info('Server started')
 *   logger.error({ err, userId }, 'Payment failed')
 *
 * Child loggers (scoped to a module):
 *   const log = logger.child({ module: 'auth' })
 *   log.info('User registered')
 */

const isDev = config.nodeEnv === 'development'

const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname',
  },
}

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && { transport: devTransport }),
  // In production, pino outputs JSON by default (no transport needed)
  base: {
    env: config.nodeEnv,
  },
  // Redact sensitive fields if they appear in log objects
  redact: {
    paths: [
      'password',
      'token',
      'jwt',
      'secret',
      'authorization',
      'cookie',
      'razorpaySignature',
    ],
    censor: '[REDACTED]',
  },
})

/**
 * Create a child logger scoped to a module.
 * @param {string} moduleName - e.g. 'auth', 'redis', 'docker', 'payment'
 */
export const createModuleLogger = (moduleName) =>
  logger.child({ module: moduleName })

export default logger
