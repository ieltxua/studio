import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = ' ' + JSON.stringify(meta);
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  }),
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (!isProduction) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
    }),
  );
}

// File transports for production
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    }),
  );
}

// Create logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'studio-backend',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (isProduction) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  );

  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  );
}

export default logger;