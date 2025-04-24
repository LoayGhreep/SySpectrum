const { runCommand } = require('../utils/shell');
const fs = require('fs');
const logger = require('../utils/logger');

function commandExists(cmd) {
  return runCommand(`command -v ${cmd}`) !== null;
}

function getTemperature() {
  // 1. Try `sensors` command if available
  if (commandExists('sensors')) {
    const output = runCommand('LANG=C sensors');
    if (output) {
      const match = output.match(/(?:Package id \d+|Tdie|Tctl|temp1):\s+\+?([0-9.]+)°C/);
      if (match) {
        return { cpu: parseFloat(match[1]) };
      }
    }
  }

  // 2. Fallback to /sys/class/thermal (if supported)
  const thermalPaths = [
    '/sys/class/thermal/thermal_zone0/temp',
    '/sys/class/hwmon/hwmon0/temp1_input'
  ];

  for (const path of thermalPaths) {
    if (fs.existsSync(path)) {
      try {
        const raw = fs.readFileSync(path, 'utf8');
        const tempC = parseInt(raw.trim()) / 1000;
        return { cpu: parseFloat(tempC.toFixed(1)) };
      } catch {
        continue;
      }
    }
  }

  logger.warn('⚠️  Temperature could not be read on this system. May be virtualized, containerized, or sensors not supported.');
  return { cpu: null };
}

module.exports = { getTemperature };
