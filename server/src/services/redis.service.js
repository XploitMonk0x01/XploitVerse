import Redis from 'ioredis'
import config from '../config/index.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('redis')

const noop = async () => null

const createMockClient = () => ({
  get: noop,
  set: noop,
  del: noop,
  zadd: noop,
  zrevrange: noop,
  zincrby: noop,
  expire: noop,
  incr: noop,
  zrevrank: noop,
  zscore: noop,
  zcard: noop,
  keys: async () => [],
  ttl: noop,
  quit: noop,
})

export let redisClient = null
let initialized = false
let warnedUnavailable = false

const withGuard =
  (fn) =>
  async (...args) => {
    if (!redisClient) return null
    try {
      return await fn(...args)
    } catch (error) {
      log.warn({ err: error.message }, 'Redis operation failed')
      return null
    }
  }

export const initRedis = async () => {
  if (initialized) return redisClient

  let url = config.redisUrl
  if (!url) {
    if (!warnedUnavailable) {
      log.info('Running without Redis cache (REDIS_URL not set)')
      warnedUnavailable = true
    }
    redisClient = null
    initialized = true
    return null
  }

  if (url.includes('://localhost:')) {
    url = url.replace('://localhost:', '://127.0.0.1:')
    log.info('Using IPv4 loopback for localhost Redis URL')
  }

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })

    client.on('connect', () => {
      log.info('Redis connected')
    })

    client.on('reconnecting', () => {
      log.info('Redis reconnecting')
    })

    client.on('error', (error) => {
      log.warn({ err: error.message }, 'Redis error')
    })

    await client.connect()
    redisClient = client
  } catch (error) {
    log.warn({ err: error.message }, 'Redis unavailable')
    redisClient = null
  }

  initialized = true
  return redisClient
}

export const getRedisClient = () => redisClient
export const getRedis = () => redisClient || createMockClient()

export const get = withGuard((key) => redisClient.get(key))
export const set = withGuard((key, value, ttlSeconds) => {
  if (ttlSeconds) {
    return redisClient.set(key, value, 'EX', ttlSeconds)
  }
  return redisClient.set(key, value)
})
export const del = withGuard((key) => redisClient.del(key))
export const zadd = withGuard((key, score, member) =>
  redisClient.zadd(key, score, member),
)
export const zrevrangeWithScores = withGuard((key, start, stop) =>
  redisClient.zrevrange(key, start, stop, 'WITHSCORES'),
)
export const zincrby = withGuard((key, amount, member) =>
  redisClient.zincrby(key, amount, member),
)
export const expire = withGuard((key, ttlSeconds) =>
  redisClient.expire(key, ttlSeconds),
)
export const incr = withGuard((key) => redisClient.incr(key))

export default {
  initRedis,
  getRedis,
  getRedisClient,
  get,
  set,
  del,
  zadd,
  zrevrangeWithScores,
  zincrby,
  expire,
  incr,
}
