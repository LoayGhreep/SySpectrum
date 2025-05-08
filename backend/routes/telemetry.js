const express = require('express');
const router = express.Router();
const telemetryModel = require('../models/telemetry');
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function traceScope() {
  return uuidv4();
}

// POST /api/telemetry — Agent pushes telemetry
router.post(
  '/',
  validate([
    body('hostname').isString().notEmpty(),
    body('timestamp').isNumeric()
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    const { hostname } = req.body;

    logger.debug(`[${traceId}] 🛰️ POST /telemetry | Receiving telemetry | hostname=${hostname}`);

    try {
      await telemetryModel.insertTelemetry(req.body);
      await agentsModel.upsertAgent(hostname, req.body);
      logger.info(`[${traceId}] ✅ Telemetry inserted and agent upserted | hostname=${hostname}`);
      return success(res, { message: 'Telemetry accepted' });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error inserting telemetry | hostname=${hostname} | ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ POST /telemetry complete | duration=${Date.now() - start}ms`);
    }
  }
);

// GET /api/telemetry/:hostname/summary — Dashboard widget
router.get('/:hostname/summary', auth(), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  const { hostname } = req.params;

  logger.debug(`[${traceId}] 📊 GET /telemetry/${hostname}/summary | Fetching latest telemetry`);

  try {
    const latest = await telemetryModel.getLatestTelemetry(hostname);
    if (!latest) {
      logger.warn(`[${traceId}] ⚠️ No telemetry found for ${hostname}`);
      return fail(res, 'No telemetry found', 404);
    }
    logger.info(`[${traceId}] ✅ Latest telemetry retrieved for ${hostname}`);
    return success(res, latest);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error fetching telemetry summary | ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /telemetry/:hostname/summary complete | duration=${Date.now() - start}ms`);
  }
});

// GET /api/telemetry/:hostname/chart — Timeseries
router.get(
  '/:hostname/chart',
  auth(),
  validate([
    query('from').isNumeric(),
    query('to').isNumeric()
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    const { hostname } = req.params;
    const { from, to } = req.query;

    logger.debug(`[${traceId}] 📈 GET /telemetry/${hostname}/chart | from=${from}, to=${to}`);

    try {
      const data = await telemetryModel.getTelemetrySeries(hostname, from, to);
      logger.info(`[${traceId}] 📦 Timeseries data retrieved for ${hostname} | count=${data.length}`);
      return success(res, data);
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error fetching timeseries | ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ GET /telemetry/:hostname/chart complete | duration=${Date.now() - start}ms`);
    }
  }
);

// GET /api/telemetry/:hostname/table — Paginated logs
router.get(
  '/:hostname/table',
  auth(),
  validate([
    query('page').optional().isNumeric(),
    query('limit').optional().isNumeric()
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    const { hostname } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    logger.debug(`[${traceId}] 📄 GET /telemetry/${hostname}/table | page=${page}, limit=${limit}`);

    try {
      const data = await telemetryModel.getTelemetryLogs(hostname, page, limit);
      logger.info(`[${traceId}] 📥 Logs retrieved for ${hostname} | page=${page}, count=${data.length}`);
      return success(res, data);
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error fetching logs for ${hostname} | ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ GET /telemetry/:hostname/table complete | duration=${Date.now() - start}ms`);
    }
  }
);

module.exports = router;
