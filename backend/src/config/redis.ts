import Redis from 'redis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = Redis.createClient({
  url: redisUrl,
  retry_strategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err: Error) => {
  logger.error('Redis connection error:', err);
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

redis.on('end', () => {
  logger.info('Redis connection ended');
});

// Initialize Redis connection
export const initRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    logger.info('Redis client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting from Redis...');
  await redis.quit();
});

export default redis;