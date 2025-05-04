// backend/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');

// Routes
const telemetryRoutes = require('./routes/telemetry');
const agentsRoutes = require('./routes/agents');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

// Migration script
const runMigrations = require('./scripts/migrate');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  logger.info(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Route Mounting
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/healthz', (req, res) => res.send({ status: 'ok' }));

// Error Handler
app.use((err, req, res, next) => {
  logger.error(`[ERR] ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Run Migrations, Then Start Server
(async () => {
  try {
    await runMigrations();
    logger.info('✅ Migrations completed');

    app.listen(PORT, () => {
      logger.info(`🧠 Syspectrum backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('❌ Migration failed. Exiting.', err);
    process.exit(1);
  }
})();
