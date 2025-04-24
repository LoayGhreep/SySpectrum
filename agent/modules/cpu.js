const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');

function getCPU() {
  try {
    const load = runCommand("LANG=C top -bn1 | grep 'Cpu(s)' || LANG=C top -bn1 | grep '%Cpu'");
    const coreCount = runCommand("nproc");

    let usage = null;
    if (load) {
      const match = load.match(/(\d+\.\d+)\s*%?\s*id/);
      if (match) {
        const idle = parseFloat(match[1]);
        usage = 100 - idle;
      }
    }

    return {
      usage: usage !== null ? parseFloat(usage.toFixed(2)) : null,
      cores: coreCount ? parseInt(coreCount) : null
    };
  } catch (err) {
    logger.warn(`⚠️ CPU module failed: ${err.message}`);
    return { usage: null, cores: null };
  }
}

module.exports = { getCPU };
