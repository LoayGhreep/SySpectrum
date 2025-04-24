const os = require('os');
//const axios = require('axios');
const config = require('./config');
const logger = require('./utils/logger');
const { ensureDependencies } = require('./utils/dependencies');

// Modules
const { getCPU } = require('./modules/cpu');
const { getMemory } = require('./modules/memory');
const { getDisk } = require('./modules/disk');
const { getNetwork } = require('./modules/network');
const { getProcesses } = require('./modules/processes');
const { getTemperature } = require('./modules/temperature');

// Ensure dependencies like `sensors`
ensureDependencies();

function validate(name, value) {
  const invalid =
    value === null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0);

  if (invalid) logger.warn(`Module '${name}' returned empty or invalid data`);
}

async function collectMetrics() {
  const payload = {
    hostname: os.hostname(),
    timestamp: Date.now(),
    cpu: getCPU(),
    memory: getMemory(),
    disk: getDisk(),
    network: getNetwork(),
    top_processes: getProcesses(),
    temperature: getTemperature()
  };

  // Validate module outputs
  for (const [key, value] of Object.entries(payload)) {
    if (key !== 'hostname' && key !== 'timestamp') validate(key, value);
  }
console.log(payload);
  /*
  try {
    await axios.post(config.backendUrl, payload);
    logger.info(`✔ Telemetry sent at ${new Date().toISOString()}`);
  } catch (e) {
    logger.error(`✘ Failed to send telemetry: ${e.message}`);
  }
  */
}

logger.info('🛰️ Syspectrum Agent started...');
setInterval(collectMetrics, config.pushInterval);
