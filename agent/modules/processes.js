const { runCommand } = require('../utils/shell');
const logger = require('../utils/logger');

function getProcesses() {
  try {
    const output = runCommand("ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 6");
    if (!output) throw new Error('ps command returned no output');

    const lines = output.trim().split('\n').slice(1);
    const topProcesses = [];

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/, 4);
      if (parts.length === 4) {
        const [, name, cpu, mem] = parts;
        topProcesses.push({
          name: name.length > 20 ? name.slice(0, 20) : name,
          cpu: parseFloat(cpu),
          mem: parseFloat(mem)
        });
      }
    });

    return topProcesses;
  } catch (err) {
    logger.warn(`⚠️ Process module failed: ${err.message}`);
    return [];
  }
}

module.exports = { getProcesses };
