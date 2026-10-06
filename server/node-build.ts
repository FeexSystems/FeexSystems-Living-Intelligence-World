import { createServer, initializeInfrastructure, api } from './index';
import { disconnectDatabase } from './lib/database';
import { disconnectRedis } from './lib/redis';

export { api };

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
    const gracefulShutdown = async (signal: string) => {
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

function isMainModule(): boolean {
  // If running inside Cloud Functions, Cloud Run, Functions Framework, or Firebase CLI analysis,
  // do NOT start the standalone HTTP listener (the exported `api` handles incoming traffic).
  if (
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FIREBASE_CONFIG ||
    process.env.FUNCTIONS_EMULATOR ||
    process.env.X_GOOGLE_ENTRY_POINT
  ) {
    return false;
  }
  const entry = process.argv[1];
  if (!entry) return false;
  return entry.endsWith('node-build.mjs');
}

if (isMainModule()) {
  startServer();
}