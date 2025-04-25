// backend/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');

const telemetryRoutes = require('./routes/telemetry');
const agentsRoutes = require('./routes/agents');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging every request
app.use((req, res, next) => {
  logger.info(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/telemetry', telemetryRoutes);
//app.use('/api/agents', agentsRoutes);
//app.use('/api/users', usersRoutes);
//app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/healthz', (req, res) => res.send({ status: 'ok' }));

// Error Handler (Fallback)
app.use((err, req, res, next) => {
  logger.error(`[ERR] ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🧠 Syspectrum backend running on port ${PORT}`);
});
