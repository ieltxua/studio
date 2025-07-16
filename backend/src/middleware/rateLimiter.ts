import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '@/config/redis';
import { logger } from '@/config/logger';
import { config } from '@/config/environment';

// Rate limiter instances
const rateLimiters = new Map<string, RateLimiterRedis>();

/**
 * Get or create rate limiter for a specific key
 */
const getRateLimiter = (
  key: string,
  maxRequests: number,
  windowMinutes: number
): RateLimiterRedis => {
  const limiterKey = `${key}_${maxRequests}_${windowMinutes}`;
  
  if (!rateLimiters.has(limiterKey)) {
    const limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl_${key}`,
      points: maxRequests,
      duration: windowMinutes * 60, // Convert to seconds
      blockDuration: windowMinutes * 60, // Block for same duration
      execEvenly: true, // Spread requests evenly across duration
    });
    
    rateLimiters.set(limiterKey, limiter);
    logger.debug(`Created rate limiter: ${limiterKey}`);
  }
  
  return rateLimiters.get(limiterKey)!;
};

/**
 * Rate limiting middleware factory
 */
export const rateLimiter = (
  type: string,
  maxRequests?: number,
  windowMinutes?: number
) => {
  // Use config defaults if not specified
  const requests = maxRequests || config.rateLimit.maxRequests;
  const window = windowMinutes || (config.rateLimit.windowMs / (1000 * 60));
  
  const limiter = getRateLimiter(type, requests, window);
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Create rate limit key based on IP and potentially user ID
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userId = req.user?.userId;
      const key = userId ? `user_${userId}` : `ip_${ip}`;
      
      // Check rate limit
      await limiter.consume(key);
      
      // Add rate limit headers
      const resRateLimiter = await limiter.get(key);
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': requests.toString(),
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
          'X-RateLimit-Reset': new Date(Date.now() + (resRateLimiter.msBeforeNext || 0)).toISOString()
        });
      }
      
      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      logger.warn(`Rate limit exceeded for ${type}:`, {
        key: rejRes.key,
        remainingTime,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.set({
        'X-RateLimit-Limit': requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
        'Retry-After': remainingTime.toString()
      });
      
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime
      });
    }
  };
};

/**
 * Create specialized rate limiters for different endpoints
 */
export const authRateLimit = rateLimiter('auth', 5, 15); // 5 requests per 15 minutes
export const apiRateLimit = rateLimiter('api', 100, 15); // 100 requests per 15 minutes
export const publicRateLimit = rateLimiter('public', 1000, 15); // 1000 requests per 15 minutes

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimit = rateLimiter('strict', 3, 60); // 3 requests per hour

/**
 * Reset rate limit for a specific key (admin function)
 */
export const resetRateLimit = async (type: string, key: string): Promise<void> => {
  try {
    const limiter = getRateLimiter(type, config.rateLimit.maxRequests, 15);
    await limiter.delete(key);
    logger.info(`Rate limit reset for ${type}:${key}`);
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    throw error;
  }
};

/**
 * Get rate limit status for a key
 */
export const getRateLimitStatus = async (
  type: string,
  key: string
): Promise<{
  remaining: number;
  reset: Date;
  limit: number;
} | null> => {
  try {
    const limiter = getRateLimiter(type, config.rateLimit.maxRequests, 15);
    const resRateLimiter = await limiter.get(key);
    
    if (!resRateLimiter) {
      return null;
    }
    
    return {
      remaining: resRateLimiter.remainingPoints || 0,
      reset: new Date(Date.now() + (resRateLimiter.msBeforeNext || 0)),
      limit: config.rateLimit.maxRequests
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return null;
  }
};