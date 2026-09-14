import { createServer, initializeInfrastructure } from './index';
import { disconnectDatabase } from './lib/database';
import { disconnectRedis } from './lib/redis';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Create and start the server FIRST so health checks & startup probes immediately succeed
    const app = createServer();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api/ping`);
    });

    // Initialize infrastructure asynchronously in the background (Non-Blocking Invariant)
    initializeInfrastructure().catch(err => {
      console.error('⚠️ Infrastructure background initialization warning:', err);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await disconnectDatabase();
          await disconnectRedis();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled rejections without crashing the entire container
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception (handled):', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at (handled):', promise, 'reason:', reason);
    });


  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();