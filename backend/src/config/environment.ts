import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(8000),
  API_VERSION: Joi.string().default('v1'),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_URL_TEST: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  
  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  
  // OAuth
  GITHUB_CLIENT_ID: Joi.string().optional(),
  GITHUB_CLIENT_SECRET: Joi.string().optional(),
  GITHUB_CALLBACK_URL: Joi.string().optional(),
  
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: Joi.string().optional(),
  ANTHROPIC_API_KEY: Joi.string().optional(),
  
  // External Services
  SLACK_BOT_TOKEN: Joi.string().optional(),
  SLACK_SIGNING_SECRET: Joi.string().optional(),
  SLACK_WEBHOOK_URL: Joi.string().optional(),
  
  // Monitoring
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  ENABLE_REQUEST_LOGGING: Joi.boolean().default(true),
  SENTRY_DSN: Joi.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // File Upload
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  
  // WebSocket
  WS_PORT: Joi.number().default(8001),
  
  // Development
  ENABLE_API_DOCS: Joi.boolean().default(true),
  ENABLE_PLAYGROUND: Joi.boolean().default(true),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  apiVersion: envVars.API_VERSION as string,
  
  database: {
    url: envVars.DATABASE_URL as string,
    testUrl: envVars.DATABASE_URL_TEST as string,
  },
  
  redis: {
    url: envVars.REDIS_URL as string,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET as string,
    expiresIn: envVars.JWT_EXPIRES_IN as string,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN as string,
  },
  
  oauth: {
    github: {
      clientId: envVars.GITHUB_CLIENT_ID as string,
      clientSecret: envVars.GITHUB_CLIENT_SECRET as string,
      callbackUrl: envVars.GITHUB_CALLBACK_URL as string,
    },
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID as string,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET as string,
      callbackUrl: envVars.GOOGLE_CALLBACK_URL as string,
    },
  },
  
  ai: {
    openai: {
      apiKey: envVars.OPENAI_API_KEY as string,
    },
    anthropic: {
      apiKey: envVars.ANTHROPIC_API_KEY as string,
    },
  },
  
  external: {
    slack: {
      botToken: envVars.SLACK_BOT_TOKEN as string,
      signingSecret: envVars.SLACK_SIGNING_SECRET as string,
      webhookUrl: envVars.SLACK_WEBHOOK_URL as string,
    },
  },
  
  logging: {
    level: envVars.LOG_LEVEL as string,
    enableRequestLogging: envVars.ENABLE_REQUEST_LOGGING as boolean,
    sentryDsn: envVars.SENTRY_DSN as string,
  },
  
  rateLimit: {
    windowMs: (envVars.RATE_LIMIT_WINDOW as number) * 60 * 1000, // Convert to milliseconds
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },
  
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE as number,
    path: envVars.UPLOAD_PATH as string,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN as string,
    credentials: envVars.CORS_CREDENTIALS as boolean,
  },
  
  websocket: {
    port: envVars.WS_PORT as number,
  },
  
  features: {
    enableApiDocs: envVars.ENABLE_API_DOCS as boolean,
    enablePlayground: envVars.ENABLE_PLAYGROUND as boolean,
  },
} as const;

export default config;