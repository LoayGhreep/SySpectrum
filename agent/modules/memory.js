const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function getMemory() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 🧠 getMemory() invoked`);

  try {
    logger.debug(`[${traceId}] 🧾 Running memory usage command: "free -m"`);
    const output = runCommand("free -m");

    if (!output) {
      throw new Error('free -m returned no output');
    }

    logger.debug(`[${traceId}] 📄 Raw memory output:\n${output.slice(0, 500)}...`);

    const lines = output.split('\n');
    const memLine = lines.find(line => line.toLowerCase().startsWith('mem'));

    if (!memLine) {
      throw new Error('No memory line found in free output');
    }

    const parts = memLine.trim().split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const percent = total ? parseFloat(((used / total) * 100).toFixed(2)) : null;

    const result = {
      total_mb: total,
      used_mb: used,
      percent
    };

    logger.info(`[${traceId}] ✅ Memory usage parsed | total=${total}MB used=${used}MB (${percent}%)`);
    logger.debug(`[${traceId}] ⏱️ getMemory() completed in ${Date.now() - start}ms`);

    return result;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Memory module failed: ${err.message}`, { stack: err.stack });
    return { total_mb: null, used_mb: null, percent: null };
  }
}

module.exports = { getMemory };
