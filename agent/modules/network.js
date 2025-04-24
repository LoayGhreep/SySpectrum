const fs = require('fs');

let previousStats = {};
let lastTimestamp = Date.now();

function parseProcNetDev() {
  const data = fs.readFileSync('/proc/net/dev', 'utf8');
  const lines = data.trim().split('\n').slice(2); // Skip headers
  const stats = {};

  lines.forEach(line => {
    const parts = line.replace(/\s+/g, ' ').trim().split(' ');
    const iface = parts[0].replace(':', '');

    // Filter out virtual or non-physical interfaces
    const ignore = ['lo', 'docker', 'veth', 'br-', 'virbr', 'vmnet'];
    if (ignore.some(prefix => iface.startsWith(prefix))) return;

    const rxBytes = parseInt(parts[1]);
    const txBytes = parseInt(parts[9]);

    stats[iface] = { rxBytes, txBytes };
  });

  return stats;
}

function getNetwork() {
  const currentStats = parseProcNetDev();
  const currentTime = Date.now();
  const deltaTimeSec = (currentTime - lastTimestamp) / 1000;

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
    }
  });

  previousStats = currentStats;
  lastTimestamp = currentTime;

  return result;
}

module.exports = { getNetwork };
