const express = require('express');
const router = express.Router();
const settingsModel = require('../models/settings');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');

// GET /api/settings — Get all settings
router.get('/', auth('admin'), async (req, res) => {
  logger.info('[GET /settings] Fetching all settings');
  try {
    const allSettings = await settingsModel.getAllSettings();
    logger.info(`[GET /settings] Retrieved ${Object.keys(allSettings).length} settings`);
    return success(res, allSettings);
  } catch (err) {
    logger.error('[GET /settings] Error fetching settings', err);
    return fail(res, 'error');
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
    logger.info('[PATCH /settings] Updating settings');
    try {
      const updates = req.body;
      for (const key in updates) {
        await settingsModel.setSetting(key, updates[key]);
        logger.info(`[PATCH /settings] Updated setting: ${key} -> ${updates[key]}`);
      }
      return success(res, { message: 'Settings updated' });
    } catch (err) {
      logger.error('[PATCH /settings] Error updating settings', err);
      return fail(res, 'error');
    }
  }
);

// GET /api/settings/themes — Return available dashboard themes
router.get('/themes', auth(), async (req, res) => {
  logger.info('[GET /settings/themes] Fetching available themes');
  try {
    const themes = ['light', 'dark', 'midnight', 'cyberpunk'];
    logger.info('[GET /settings/themes] Themes list sent');
    return success(res, themes);
  } catch (err) {
    logger.error('[GET /settings/themes] Error fetching themes', err);
    return fail(res, 'error');
  }
});

// GET /api/settings/retention — Get current retention config
router.get('/retention', auth('admin'), async (req, res) => {
  logger.info('[GET /settings/retention] Fetching retention setting');
  try {
    const retentionDays = await settingsModel.getSetting('retention_days');
    logger.info(`[GET /settings/retention] Retention days: ${retentionDays || 30}`);
    return success(res, { retention_days: retentionDays || 30 });
  } catch (err) {
    logger.error('[GET /settings/retention] Error fetching retention days', err);
    return fail(res, 'error');
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
    logger.info(`[PATCH /settings/retention] Updating retention to ${req.body.retention_days} days`);
    try {
      await settingsModel.setSetting('retention_days', req.body.retention_days);
      logger.info(`[PATCH /settings/retention] Retention updated to ${req.body.retention_days} days`);
      return success(res, { message: 'Retention policy updated' });
    } catch (err) {
      logger.error('[PATCH /settings/retention] Error updating retention', err);
      return fail(res, 'error');
    }
  }
);

module.exports = router;
