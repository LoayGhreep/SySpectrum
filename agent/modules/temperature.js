const { runCommand } = require('../utils/shell');
const fs = require('fs');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function commandExists(cmd, traceId) {
  try {
    logger.debug(`[${traceId}] 🔍 Checking if command exists: ${cmd}`);
    const exists = runCommand(`command -v ${cmd}`) !== null;
    logger.debug(`[${traceId}] 📌 Command ${cmd} exists: ${exists}`);
    return exists;
  } catch (err) {
    logger.warn(`[${traceId}] ⚠️ Failed to check command existence: ${cmd} | ${err.message}`);
    return false;
  }
}

function getTemperature() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 🌡️ getTemperature() invoked`);

  try {
    // Attempt 1: Use `sensors` command
    if (commandExists('sensors', traceId)) {
      logger.debug(`[${traceId}] 🧪 Attempting to read temperature via 'sensors'`);
      const output = runCommand('LANG=C sensors');

      if (output) {
        logger.debug(`[${traceId}] 📄 Raw sensors output:\n${output.slice(0, 500)}...`);
        const match = output.match(/(?:Package id \d+|Tdie|Tctl|temp1):\s+\+?([0-9.]+)°C/);
        if (match) {
          const temp = parseFloat(match[1]);
          logger.info(`[${traceId}] ✅ Temperature read via sensors: ${temp}°C`);
          logger.debug(`[${traceId}] ⏱️ getTemperature() completed in ${Date.now() - start}ms`);
          return { cpu: temp };
        } else {
          logger.debug(`[${traceId}] ❌ No temperature match found in sensors output`);
        }
      } else {
        logger.warn(`[${traceId}] ⚠️ 'sensors' command produced no output`);
      }
    }

    // Attempt 2: Fallback to reading from /sys/class
    logger.debug(`[${traceId}] 🔁 Fallback to /sys/class/thermal paths`);
    const thermalPaths = [
      '/sys/class/thermal/thermal_zone0/temp',
      '/sys/class/hwmon/hwmon0/temp1_input'
    ];

    for (const path of thermalPaths) {
      if (fs.existsSync(path)) {
        try {
          const raw = fs.readFileSync(path, 'utf8');
          const tempC = parseInt(raw.trim()) / 1000;
          const result = { cpu: parseFloat(tempC.toFixed(1)) };
          logger.info(`[${traceId}] ✅ Temperature read from file: ${path} → ${result.cpu}°C`);
          logger.debug(`[${traceId}] ⏱️ getTemperature() completed in ${Date.now() - start}ms`);
          return result;
        } catch (err) {
          logger.warn(`[${traceId}] ⚠️ Failed to read from ${path}: ${err.message}`);
        }
      } else {
        logger.debug(`[${traceId}] ❌ Path does not exist: ${path}`);
      }
    }

    logger.warn(`[${traceId}] ⚠️ Temperature could not be read from any method`);
    logger.debug(`[${traceId}] ⏱️ getTemperature() completed in ${Date.now() - start}ms`);
    return { cpu: null };
  } catch (err) {
    logger.error(`[${traceId}] ❌ Unexpected error in getTemperature(): ${err.message}`, { stack: err.stack });
    return { cpu: null };
  }
}

module.exports = { getTemperature };
