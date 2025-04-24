const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');

function getMemory() {
  try {
    const output = runCommand("free -m");
    if (!output) throw new Error('free -m returned no output');

    const lines = output.split('\n');
    const memLine = lines.find(line => line.toLowerCase().startsWith('mem'));

    if (!memLine) throw new Error('No memory line found in free output');

    const parts = memLine.trim().split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const percent = total ? parseFloat(((used / total) * 100).toFixed(2)) : null;

    return { total_mb: total, used_mb: used, percent };
  } catch (err) {
    logger.warn(`⚠️ Memory module failed: ${err.message}`);
    return { total_mb: null, used_mb: null, percent: null };
  }
}

module.exports = { getMemory };
