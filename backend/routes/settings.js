const express = require('express');
const router = express.Router();
const settingsModel = require('../models/settings');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');

// GET /api/settings — Get all settings
router.get('/', auth('admin'), (req, res) => {
  try {
    const allSettings = settingsModel.getAllSettings();
    return success(res, allSettings);
  } catch (err) {
    return fail(res, err.message);
  }
});

// PATCH /api/settings — Update one or more settings
router.patch('/', auth('admin'),
  [
    body().isObject().notEmpty()
  ],
  validate,
  (req, res) => {
    try {
      const updates = req.body;
      for (const key in updates) {
        settingsModel.setSetting(key, updates[key]);
      }
      return success(res, { message: "Settings updated" });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

// GET /api/settings/themes — Return available dashboard themes
router.get('/themes', auth(), (req, res) => {
  try {
    const themes = ["light", "dark", "midnight", "cyberpunk"];
    return success(res, themes);
  } catch (err) {
    return fail(res, err.message);
  }
});

// GET /api/settings/retention — Get current retention config
router.get('/retention', auth('admin'), (req, res) => {
  try {
    const retentionDays = settingsModel.getSetting('retention_days');
    return success(res, { retention_days: retentionDays || 30 });
  } catch (err) {
    return fail(res, err.message);
  }
});

// PATCH /api/settings/retention — Update retention config
router.patch('/retention', auth('admin'),
  [
    body('retention_days').isNumeric().custom(val => val > 0)
  ],
  validate,
  (req, res) => {
    try {
      settingsModel.setSetting('retention_days', req.body.retention_days);
      return success(res, { message: "Retention policy updated" });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

module.exports = router;
