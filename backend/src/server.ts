import { app } from './app';
import { config } from '@/config/environment';
import { logger } from '@/config/logger';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';

const PORT = config.port || 3000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected successfully');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: config.env,
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await prisma.$disconnect();
          logger.info('Database disconnected');
          
          await redis.quit();
          logger.info('Redis disconnected');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();