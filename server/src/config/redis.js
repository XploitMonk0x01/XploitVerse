import {
  initRedis,
  getRedisClient,
  getRedis,
} from '../services/redis.service.js'

export const connectRedis = async () => initRedis()

export const disconnectRedis = async () => {
  const client = getRedisClient()
  if (client) {
    await client.quit()
  }
}

export { getRedis }

export default { connectRedis, disconnectRedis, getRedis }
