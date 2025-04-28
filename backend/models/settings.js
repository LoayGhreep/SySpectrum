const db = require('../db/sqlite');
const logger = require('../utils/logger');

// Get a setting value by key
function getSetting(key) {
  const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`);
  const row = stmt.get(key);
  return row ? JSON.parse(row.value) : null;
}

// Set or update a setting
function setSetting(key, value) {
  const valueStr = JSON.stringify(value);
  try {
    const existing = db.prepare(`SELECT key FROM settings WHERE key = ?`).get(key);
    if (existing) {
      db.prepare(`UPDATE settings SET value = ? WHERE key = ?`).run(valueStr, key);
      logger.info(`🔄 Setting updated: ${key}`);
    } else {
      db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(key, valueStr);
      logger.info(`🆕 Setting created: ${key}`);
    }
  } catch (err) {
    logger.error(`❌ Failed to set setting ${key}: ${err.message}`);
    throw err;
  }
}

// Get all settings (for dashboard load)
function getAllSettings() {
  const stmt = db.prepare(`SELECT key, value FROM settings`);
  const rows = stmt.all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = JSON.parse(row.value);
  }
  return settings;
}

// Initialize default settings if not exist
function initializeDefaults() {
  const defaults = {
    theme: "dark",
    retention_days: 30,
    dashboard_refresh_interval: 15, // seconds
    chart_resolution: 60            // seconds between points
  };

  for (const key in defaults) {
    if (!getSetting(key)) {
      setSetting(key, defaults[key]);
    }
  }

  logger.info('✅ Default settings initialized.');
}

module.exports = {
  getSetting,
  setSetting,
  getAllSettings,
  initializeDefaults
};
