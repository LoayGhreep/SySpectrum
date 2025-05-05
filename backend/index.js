// backend/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

// Routes
const telemetryRoutes = require('./routes/telemetry');
const agentsRoutes = require('./routes/agents');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

// Migration script
const runMigrations = require('./scripts/migrate');

const app = express();
const PORT = process.env.PORT || 8080;

// Global Request ID Middleware
app.use((req, res, next) => {
  req.traceId = uuidv4();
  res.setHeader('X-Trace-ID', req.traceId);
  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`[${req.traceId}] 📥 ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[${req.traceId}] 📤 ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

// Route Mounting
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/healthz', (req, res) => {
  logger.debug(`[${req.traceId}] 🔍 Health check`);
  res.send({ status: 'ok' });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(`[${req.traceId}] ❌ Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Run Migrations, Then Start Server
(async () => {
  const traceId = uuidv4();
  const start = Date.now();
  try {
    logger.info(`[${traceId}] 🚀 Running migrations...`);
    await runMigrations();
    logger.info(`[${traceId}] ✅ Migrations completed in ${Date.now() - start}ms`);

    app.listen(PORT, () => {
      logger.info(`[${traceId}] 🧠 Syspectrum backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Migration failed. Exiting. ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
})();
