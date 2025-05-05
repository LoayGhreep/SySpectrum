const db = require('../db/sqlite');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Utility to generate a scoped trace ID
function traceScope() {
  return uuidv4();
}

// Get a setting value by key
function getSetting(key) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 Enter getSetting | key=${key}`);

  try {
    const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`);
    const row = stmt.get(key);

    const parsedValue = row ? JSON.parse(row.value) : null;
    logger.debug(`[${traceId}] 📤 getSetting result | exists=${!!row}`);
    return parsedValue;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getSetting for key=${key}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getSetting | duration=${Date.now() - start}ms`);
  }
}

// Set or update a setting
function setSetting(key, value) {
  const traceId = traceScope();
  const start = Date.now();
  const safeValuePreview = typeof value === 'object' ? '[Object]' : value;

  logger.debug(`[${traceId}] ✏️ Enter setSetting | key=${key}, value=${safeValuePreview}`);

  const valueStr = JSON.stringify(value);
  try {
    const existing = db.prepare(`SELECT key FROM settings WHERE key = ?`).get(key);

    if (existing) {
      db.prepare(`UPDATE settings SET value = ? WHERE key = ?`).run(valueStr, key);
      logger.info(`[${traceId}] 🔄 Setting updated: ${key}`);
    } else {
      db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(key, valueStr);
      logger.info(`[${traceId}] 🆕 Setting created: ${key}`);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to set setting ${key}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit setSetting | duration=${Date.now() - start}ms`);
  }
}

// Get all settings (for dashboard load)
function getAllSettings() {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 Enter getAllSettings`);

  try {
    const stmt = db.prepare(`SELECT key, value FROM settings`);
    const rows = stmt.all();
    const settings = {};

    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (parseErr) {
        logger.warn(`[${traceId}] ⚠️ Failed to parse value for key=${row.key}: ${parseErr.message}`);
        settings[row.key] = null;
      }
    }

    logger.debug(`[${traceId}] 📤 getAllSettings result | count=${rows.length}`);
    return settings;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getAllSettings: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getAllSettings | duration=${Date.now() - start}ms`);
  }
}

// Initialize default settings if not exist
function initializeDefaults() {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🛠️ Enter initializeDefaults`);

  const defaults = {
    theme: "dark",
    retention_days: 30,
    dashboard_refresh_interval: 15, // seconds
    chart_resolution: 60            // seconds between points
  };

  try {
    for (const key in defaults) {
      const exists = getSetting(key);
      logger.debug(`[${traceId}] 🔍 Checking default key=${key} | exists=${!!exists}`);
      if (!exists) {
        setSetting(key, defaults[key]);
        logger.debug(`[${traceId}] ➕ Default setting applied: ${key}`);
      }
    }

    logger.info(`[${traceId}] ✅ Default settings initialized.`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in initializeDefaults: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit initializeDefaults | duration=${Date.now() - start}ms`);
  }
}

module.exports = {
  getSetting,
  setSetting,
  getAllSettings,
  initializeDefaults
};
