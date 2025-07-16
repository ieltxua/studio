import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);

  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - (req.startTime || 0);
    
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};