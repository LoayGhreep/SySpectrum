const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function getProcesses() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 🧩 getProcesses() invoked`);

  try {
    logger.debug(`[${traceId}] 🧾 Running process listing command`);
    const output = runCommand("ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 6");

    if (!output) {
      throw new Error('ps command returned no output');
    }

    logger.debug(`[${traceId}] 📄 Raw process output:\n${output.trim()}`);

    const lines = output.trim().split('\n').slice(1);
    const topProcesses = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/, 4);
      if (parts.length === 4) {
        const [, name, cpu, mem] = parts;
        const processInfo = {
          name: name.length > 20 ? name.slice(0, 20) : name,
          cpu: parseFloat(cpu),
          mem: parseFloat(mem)
        };
        topProcesses.push(processInfo);
        logger.debug(`[${traceId}] ✅ Parsed process ${index + 1}: ${JSON.stringify(processInfo)}`);
      } else {
        logger.warn(`[${traceId}] ⚠️ Skipping malformed process line: ${line}`);
      }
    });

    logger.info(`[${traceId}] ✅ Top processes collected: ${topProcesses.length}`);
    logger.debug(`[${traceId}] ⏱️ getProcesses() completed in ${Date.now() - start}ms`);

    return topProcesses;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Process module failed: ${err.message}`, { stack: err.stack });
    return [];
  }
}

module.exports = { getProcesses };
