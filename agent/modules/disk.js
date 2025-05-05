const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function getDisk() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 💽 getDisk() invoked`);

  try {
    logger.debug(`[${traceId}] 🧾 Running disk usage command`);
    const output = runCommand("df -h --output=source,pcent,target -x tmpfs -x devtmpfs");

    if (!output) {
      throw new Error('df command returned no output');
    }

    logger.debug(`[${traceId}] 📄 Raw disk output:\n${output.slice(0, 500)}...`);

    const lines = output.split('\n').slice(1);
    const results = {};
    const importantMounts = ['/', '/home', '/var', '/opt', '/boot'];

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length === 3) {
        const [source, percent, mount] = parts;
        const value = parseFloat(percent.replace('%', ''));

        if (importantMounts.includes(mount)) {
          const key = mount.replace('/', '') || 'root';
          results[key] = value;
          logger.debug(`[${traceId}] ✅ Found mount: ${mount} (${value}%)`);
        }
      } else {
        logger.warn(`[${traceId}] ⚠️ Malformed line in df output: ${line}`);
      }
    });

    if (Object.keys(results).length === 0) {
      throw new Error('No important mount points found');
    }

    logger.info(`[${traceId}] ✅ Disk usage parsed successfully`);
    logger.debug(`[${traceId}] 📦 Final disk usage result: ${JSON.stringify(results)}`);
    logger.debug(`[${traceId}] ⏱️ getDisk() completed in ${Date.now() - start}ms`);

    return results;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Disk module failed: ${err.message}`, { stack: err.stack });
    return {};
  }
}

module.exports = { getDisk };
