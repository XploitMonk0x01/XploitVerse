import Redis from 'ioredis'
import config from './index.js'

let client = null
let _errorLogged = false  // only log the first error, not every retry

export const getRedis = () => client

export const connectRedis = async () => {
  const url = config.redisUrl || 'redis://localhost:6379'

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 0,   // fail commands immediately — no per-command retry
      enableReadyCheck: true,
      lazyConnect: true,
      // ─── Stop infinite reconnect spam ───────────────────────────────
      // retryStrategy returns `null` → give up and mark client as dead.
      // The error handler below then nulls out `client` so all callers
      // fall back to in-memory without console noise.
      retryStrategy: () => null,
    })

    client.on('error', (err) => {
      if (!_errorLogged) {
        console.warn('⚠️  Redis unavailable – falling back to in-process state:', err.message)
        _errorLogged = true
      }
      // Null the client so callers degrade gracefully; don't crash.
      client = null
    })

    await client.connect()
    console.log('✅ Redis connected:', url)
    _errorLogged = false
  } catch (err) {
    console.warn('⚠️  Redis unavailable – running without cache/Redis features:', err.message)
    client = null
  }

  return client
}

export const disconnectRedis = async () => {
  if (client) {
    await client.quit()
    client = null
  }
}

export default { connectRedis, disconnectRedis, getRedis }
