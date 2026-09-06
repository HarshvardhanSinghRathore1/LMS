import app from './app';
import { config } from './config/env';
import { pool } from './config/database';

const PORT = config.env.port;

const server = app.listen(PORT, () => {
  console.log(`
==================================================
🚀 CAPACITY CONNECT API SERVER RUNNING
==================================================
  Environment : ${config.env.nodeEnv}
  Port        : ${PORT}
  API Root    : http://localhost:${PORT}/api/v1
  Health Check: http://localhost:${PORT}/api/v1/health
  Frontend URL: ${config.env.frontendUrl}
==================================================
  `);
});

// Graceful Shutdown Handler
function gracefulShutdown(signal: string) {
  console.log(`\n⚠️ Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('🛑 HTTP server closed.');
    try {
      await pool.end();
      console.log('🔌 PostgreSQL pool drained and closed.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error closing PostgreSQL pool:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s if graceful fails
  setTimeout(() => {
    console.error('💥 Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
});
