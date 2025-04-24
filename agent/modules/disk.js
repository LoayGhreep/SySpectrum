const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');

function getDisk() {
  try {
    const output = runCommand("df -h --output=source,pcent,target -x tmpfs -x devtmpfs");
    if (!output) throw new Error('df command returned no output');

    const lines = output.split('\n').slice(1);
    const results = {};
    const importantMounts = ['/', '/home', '/var', '/opt', '/boot'];

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length === 3) {
        const [source, percent, mount] = parts;
        const value = parseFloat(percent.replace('%', ''));
        if (importantMounts.includes(mount)) {
          results[mount.replace('/', '') || 'root'] = value;
        }
      }
    });

    if (Object.keys(results).length === 0) throw new Error('No important mount points found');
    return results;
  } catch (err) {
    logger.warn(`⚠️ Disk module failed: ${err.message}`);
    return {};
  }
}

module.exports = { getDisk };
