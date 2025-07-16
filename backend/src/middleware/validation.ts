import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '@/config/logger';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    logger.warn('Validation failed', {
      requestId: req.id,
      url: req.url,
      method: req.method,
      errors: errorDetails
    });

    res.status(400).json({
      error: 'Validation error',
      message: 'The request contains invalid data',
      details: errorDetails
    });
    return;
  }

  next();
};