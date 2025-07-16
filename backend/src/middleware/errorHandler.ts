import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { config } from '@/config/environment';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Log error details
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    status
  });

  // Prepare error response
  const errorResponse: any = {
    error: getErrorName(status),
    message
  };

  // Include stack trace in development
  if (config.env === 'development') {
    errorResponse.stack = error.stack;
  }

  // Include request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(status).json(errorResponse);
};

function getErrorName(status: number): string {
  switch (status) {
    case 400: return 'Bad request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not found';
    case 409: return 'Conflict';
    case 422: return 'Validation error';
    case 429: return 'Too many requests';
    case 500: return 'Internal server error';
    case 502: return 'Bad gateway';
    case 503: return 'Service unavailable';
    default: return 'Error';
  }
}