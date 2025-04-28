const express = require('express');
const router = express.Router();
const telemetryModel = require('../models/telemetry');
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');

// POST /api/telemetry — Agent pushes telemetry
router.post(
  '/',
  validate([
    body('hostname').isString().notEmpty(),
    body('timestamp').isNumeric()
  ]),
  async (req, res) => {
    logger.info(`[POST /telemetry] Receiving telemetry from hostname: ${req.body.hostname}`);
    try {
      await telemetryModel.insertTelemetry(req.body);
      await agentsModel.upsertAgent(req.body.hostname);
      logger.info(`[POST /telemetry] Telemetry accepted and agent upserted: ${req.body.hostname}`);
      return success(res, { message: 'Telemetry accepted' });
    } catch (err) {
      logger.error('[POST /telemetry] Error inserting telemetry', err);
      return fail(res, 'error');
    }
  }
);

// GET /api/telemetry/:hostname/summary — Dashboard widget
router.get('/:hostname/summary', auth(), async (req, res) => {
  logger.info(`[GET /telemetry/${req.params.hostname}/summary] Fetching latest telemetry`);
  try {
    const latest = await telemetryModel.getLatestTelemetry(req.params.hostname);
    if (!latest) {
      logger.warn(`[GET /telemetry/${req.params.hostname}/summary] No telemetry found`);
      return fail(res, 'No telemetry found', 404);
    }
    logger.info(`[GET /telemetry/${req.params.hostname}/summary] Latest telemetry retrieved`);
    return success(res, latest);
  } catch (err) {
    logger.error(`[GET /telemetry/${req.params.hostname}/summary] Error fetching telemetry`, err);
    return fail(res, 'error');
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
    logger.info(`[GET /telemetry/${req.params.hostname}/chart] Fetching telemetry timeseries`);
    try {
      const { from, to } = req.query;
      const data = await telemetryModel.getTelemetrySeries(req.params.hostname, from, to);
      logger.info(`[GET /telemetry/${req.params.hostname}/chart] Timeseries data retrieved`);
      return success(res, data);
    } catch (err) {
      logger.error(`[GET /telemetry/${req.params.hostname}/chart] Error fetching timeseries`, err);
      return fail(res, 'error');
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
    logger.info(`[GET /telemetry/${req.params.hostname}/table] Fetching telemetry logs`);
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const data = await telemetryModel.getTelemetryLogs(req.params.hostname, page, limit);
      logger.info(`[GET /telemetry/${req.params.hostname}/table] Logs retrieved (page ${page}, limit ${limit})`);
      return success(res, data);
    } catch (err) {
      logger.error(`[GET /telemetry/${req.params.hostname}/table] Error fetching logs`, err);
      return fail(res, 'error');
    }
  }
);

module.exports = router;
