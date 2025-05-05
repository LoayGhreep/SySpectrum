const fs = require('fs');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

let previousStats = {};
let lastTimestamp = Date.now();

function parseProcNetDev(traceId) {
  logger.debug(`[${traceId}] 📡 Parsing /proc/net/dev`);
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = data.trim().split('\n').slice(2); // Skip headers
    const stats = {};
    const ignore = ['lo', 'docker', 'veth', 'br-', 'virbr', 'vmnet'];

    lines.forEach(line => {
      const parts = line.replace(/\s+/g, ' ').trim().split(' ');
      const iface = parts[0].replace(':', '');

      if (ignore.some(prefix => iface.startsWith(prefix))) {
        logger.debug(`[${traceId}] ⏩ Skipping interface: ${iface}`);
        return;
      }

      const rxBytes = parseInt(parts[1]);
      const txBytes = parseInt(parts[9]);
      stats[iface] = { rxBytes, txBytes };

      logger.debug(`[${traceId}] 📈 Interface: ${iface}, RX: ${rxBytes}B, TX: ${txBytes}B`);
    });

    return stats;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to parse /proc/net/dev: ${err.message}`, { stack: err.stack });
    return {};
  }
}

function getNetwork() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.debug(`[${traceId}] 🌐 getNetwork() invoked`);

  const currentStats = parseProcNetDev(traceId);
  const currentTime = Date.now();
  const deltaTimeSec = (currentTime - lastTimestamp) / 1000;

  logger.debug(`[${traceId}] ⏱️ Time since last poll: ${deltaTimeSec}s`);

  const result = {};

  Object.keys(currentStats).forEach(iface => {
    const current = currentStats[iface];
    const previous = previousStats[iface];

    if (previous && deltaTimeSec > 0) {
      const rxDiff = (current.rxBytes - previous.rxBytes) / 1024;
      const txDiff = (current.txBytes - previous.txBytes) / 1024;

      result[iface] = {
        rx_kbps: parseFloat((rxDiff / deltaTimeSec).toFixed(2)),
        tx_kbps: parseFloat((txDiff / deltaTimeSec).toFixed(2))
      };

      logger.debug(`[${traceId}] ↔️ Interface: ${iface} | RX: ${result[iface].rx_kbps} KB/s | TX: ${result[iface].tx_kbps} KB/s`);
    } else {
      logger.debug(`[${traceId}] ⚠️ Skipping interface ${iface} due to missing previous stats or zero delta time`);
    }
  });

  previousStats = currentStats;
  lastTimestamp = currentTime;

  logger.info(`[${traceId}] ✅ getNetwork() complete | interfaces=${Object.keys(result).length}`);
  logger.debug(`[${traceId}] ⏱️ getNetwork() finished in ${Date.now() - start}ms`);

  return result;
}

module.exports = { getNetwork };
