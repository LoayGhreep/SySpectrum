const express = require('express');
const router = express.Router();
const telemetryModel = require('../models/telemetry');
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');

// POST /api/telemetry — Agent pushes telemetry
router.post('/',
  [
    body('hostname').isString(),
    body('timestamp').isNumeric()
  ],
  validate,
  (req, res) => {
    try {
      telemetryModel.insertTelemetry(req.body);
      agentsModel.upsertAgent(req.body.hostname);
      return success(res, { message: "Telemetry accepted" });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

// GET /api/telemetry/:hostname/summary — Dashboard widget
router.get('/:hostname/summary', auth(), (req, res) => {
  try {
    const latest = telemetryModel.getLatestTelemetry(req.params.hostname);
    if (!latest) return fail(res, 'No telemetry found', 404);
    return success(res, latest);
  } catch (err) {
    return fail(res, err.message);
  }
});

// GET /api/telemetry/:hostname/chart — Timeseries
router.get('/:hostname/chart', auth(), [
  query('from').isNumeric(),
  query('to').isNumeric()
], validate, (req, res) => {
  try {
    const { from, to } = req.query;
    const data = telemetryModel.getTelemetrySeries(req.params.hostname, from, to);
    return success(res, data);
  } catch (err) {
    return fail(res, err.message);
  }
});

// GET /api/telemetry/:hostname/table — Paginated logs
router.get('/:hostname/table', auth(), [
  query('page').optional().isNumeric(),
  query('limit').optional().isNumeric()
], validate, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const data = telemetryModel.getTelemetryLogs(req.params.hostname, page, limit);
    return success(res, data);
  } catch (err) {
    return fail(res, err.message);
  }
});

module.exports = router;
