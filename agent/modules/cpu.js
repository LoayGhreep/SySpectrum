const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function getCPU() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 🧠 getCPU() invoked`);

  try {
    logger.debug(`[${traceId}] 📥 Executing CPU usage command`);
    const load = runCommand("LANG=C top -bn1 | grep 'Cpu(s)' || LANG=C top -bn1 | grep '%Cpu'");
    logger.debug(`[${traceId}] 🧪 CPU load output: ${load?.slice(0, 100)}...`);

    logger.debug(`[${traceId}] 📥 Executing core count command`);
    const coreCount = runCommand("nproc");
    logger.debug(`[${traceId}] 🧮 Core count output: ${coreCount}`);

    let usage = null;
    if (load) {
      const match = load.match(/(\d+\.\d+)\s*%?\s*id/);
      if (match) {
        const idle = parseFloat(match[1]);
        usage = 100 - idle;
        logger.debug(`[${traceId}] 📉 Idle: ${idle}% | Usage calculated: ${usage}%`);
      } else {
        logger.warn(`[${traceId}] ⚠️ Failed to parse CPU idle from top output`);
      }
    }

    const result = {
      usage: usage !== null ? parseFloat(usage.toFixed(2)) : null,
      cores: coreCount ? parseInt(coreCount) : null
    };

    logger.info(`[${traceId}] ✅ CPU stats collected | usage=${result.usage}%, cores=${result.cores}`);
    logger.debug(`[${traceId}] ⏱️ getCPU() complete | duration=${Date.now() - start}ms`);

    return result;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getCPU(): ${err.message}`, { stack: err.stack });
    return { usage: null, cores: null };
  }
}

module.exports = { getCPU };
