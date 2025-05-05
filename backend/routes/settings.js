const express = require('express');
const router = express.Router();
const settingsModel = require('../models/settings');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function traceScope() {
  return uuidv4();
}

// GET /api/settings — Get all settings
router.get('/', auth('admin'), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 GET /settings | Fetching all settings`);

  try {
    const allSettings = await settingsModel.getAllSettings();
    logger.info(`[${traceId}] ✅ Retrieved ${Object.keys(allSettings).length} settings`);
    return success(res, allSettings);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error fetching settings: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /settings complete | duration=${Date.now() - start}ms`);
  }
});

// PATCH /api/settings — Update one or more settings
router.patch(
  '/',
  auth('admin'),
  validate([
    body().isObject().notEmpty()
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    logger.debug(`[${traceId}] ✏️ PATCH /settings | payload=${JSON.stringify(req.body)}`);

    try {
      const updates = req.body;
      for (const key in updates) {
        await settingsModel.setSetting(key, updates[key]);
        logger.info(`[${traceId}] 🔄 Updated setting: ${key}`);
      }
      return success(res, { message: 'Settings updated' });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error updating settings: ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ PATCH /settings complete | duration=${Date.now() - start}ms`);
    }
  }
);

// GET /api/settings/themes — Return available dashboard themes
router.get('/themes', auth(), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🎨 GET /settings/themes`);

  try {
    const themes = ['light', 'dark', 'midnight', 'cyberpunk'];
    logger.info(`[${traceId}] ✅ Themes list sent: ${themes.join(', ')}`);
    return success(res, themes);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error fetching themes: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /settings/themes complete | duration=${Date.now() - start}ms`);
  }
});

// GET /api/settings/retention — Get current retention config
router.get('/retention', auth('admin'), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 GET /settings/retention`);

  try {
    const retentionDays = await settingsModel.getSetting('retention_days');
    logger.info(`[${traceId}] ✅ Retention days: ${retentionDays || 30}`);
    return success(res, { retention_days: retentionDays || 30 });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error fetching retention: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /settings/retention complete | duration=${Date.now() - start}ms`);
  }
});

// PATCH /api/settings/retention — Update retention config
router.patch(
  '/retention',
  auth('admin'),
  validate([
    body('retention_days').isNumeric().custom(val => val > 0)
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    const newValue = req.body.retention_days;
    logger.debug(`[${traceId}] ✏️ PATCH /settings/retention | newValue=${newValue}`);

    try {
      await settingsModel.setSetting('retention_days', newValue);
      logger.info(`[${traceId}] ✅ Retention updated to ${newValue} days`);
      return success(res, { message: 'Retention policy updated' });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error updating retention: ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ PATCH /settings/retention complete | duration=${Date.now() - start}ms`);
    }
  }
);

module.exports = router;
