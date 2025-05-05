const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const logger = require('./utils/logger');
const { ensureDependencies } = require('./utils/dependencies');
const { loadAgentData, saveAgentData } = require('./utils/agentState');

// Metric modules
const { getCPU } = require('./modules/cpu');
const { getMemory } = require('./modules/memory');
const { getDisk } = require('./modules/disk');
const { getNetwork } = require('./modules/network');
const { getProcesses } = require('./modules/processes');
const { getTemperature } = require('./modules/temperature');

// SQLite buffer
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, 'buffer.db'));

// Initialize agentId and flag
let agentId = null;
let registered = false;

// Load or generate agentId
const agentData = loadAgentData();
if (agentData && agentData.agentId) {
  agentId = agentData.agentId;
  registered = true;
  logger.info(`🆔 Loaded agentId: ${agentId}`);
} else {
  logger.warn('🔐 No agentId found — entering registration mode...');
  registerAgent();
}

// Ensure dependencies like `sensors`
ensureDependencies();

// Initialize SQLite buffer table
function initBufferDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `, (err) => {
    if (err) logger.error(`🧱 Failed to initialize buffer DB: ${err.message}`);
    else logger.info('🧱 Telemetry buffer DB initialized');
  });
}

// Save to buffer
function bufferPayload(json) {
  db.run(`INSERT INTO telemetry (data, timestamp) VALUES (?, ?)`, [JSON.stringify(json), Date.now()], err => {
    if (err) logger.error(`❌ Failed to buffer telemetry: ${err.message}`);
    else logger.info(`📦 Buffered telemetry`);
  });
}

// Flush buffer
function flushBuffer() {
  db.all(`SELECT * FROM telemetry ORDER BY timestamp ASC`, async (err, rows) => {
    if (err) {
      logger.error(`🚱 Failed to read buffer DB: ${err.message}`);
      return;
    }
    if (!rows.length) return;

    for (const row of rows) {
      try {
        const payload = JSON.parse(row.data);
        await axios.post(`${config.baseUrl}/api/telemetry`, payload, {
          headers: {
            'Agent-Version': config.version,
            'Agent-Id': agentId
          }
        });
        db.run(`DELETE FROM telemetry WHERE id = ?`, row.id);
        logger.info(`✅ Flushed buffered payload id=${row.id}`);
      } catch (err) {
        logger.warn(`🔁 Retry failed for buffered id=${row.id}: ${err.message}`);
        break;
      }
    }
  });
}

// Validate metric modules
function validate(name, value) {
  const invalid =
    value === null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0);
  if (invalid) logger.warn(`⚠️ Module '${name}' returned empty or invalid data`);
  else logger.debug(`✅ Module '${name}' is valid`);
}

// Main telemetry collection
async function collectMetrics() {
  if (!registered) return;

  const payload = {
    agentId,
    agentVersion: config.version,
    hostname: os.hostname(),
    timestamp: Date.now(),
    cpu: getCPU(),
    memory: getMemory(),
    disk: getDisk(),
    network: getNetwork(),
    top_processes: getProcesses(),
    temperature: getTemperature()
  };

  logger.debug(`📊 Collected metrics: ${JSON.stringify(payload, null, 2)}`);

  for (const [key, value] of Object.entries(payload)) {
    if (!['hostname', 'timestamp', 'agentId', 'agentVersion'].includes(key)) {
      validate(key, value);
    }
  }

  try {
    await axios.post(`${config.baseUrl}/api/telemetry`, payload, {
      headers: {
        'Agent-Version': config.version,
        'Agent-Id': agentId
      }
    });
    logger.info(`📡 Telemetry sent at ${new Date().toISOString()}`);
    flushBuffer();
  } catch (e) {
    logger.error(`📴 Failed to send telemetry: ${e.message}`);
    bufferPayload(payload);
  }
}

// Heartbeat
async function heartbeat() {
  if (!registered) return;

  const payload = {
    agentId,
    agentVersion: config.version,
    hostname: os.hostname(),
    timestamp: Date.now()
  };

  try {
    await axios.post(`${config.baseUrl}/api/heartbeat`, payload, {
      headers: {
        'Agent-Version': config.version,
        'Agent-Id': agentId
      }
    });
    logger.debug(`💓 Heartbeat sent with: ${JSON.stringify(payload)}`);
  } catch (err) {
    logger.warn(`💔 Heartbeat failed: ${err.message}`);
  }
}

// Registration
async function registerAgent() {
  const registerUrl = `${config.baseUrl}/api/agents/register`;
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    agentVersion: config.version,
    timestamp: Date.now()
  };

  logger.debug(`📋 Registration payload: ${JSON.stringify(systemInfo, null, 2)}`);

  try {
    logger.info(`🔐 Sending registration request to ${registerUrl}`);
    await axios.post(registerUrl, systemInfo);
    logger.info('🕐 Registration request sent. Waiting for approval...');
    pollForClaim();
  } catch (err) {
    logger.error(`❌ Registration failed: ${err.message}`);
    setTimeout(registerAgent, 15000); // Retry
  }
}

// Claim polling loop
async function pollForClaim() {
  const claimUrl = `${config.baseUrl}/api/agents/claim`;

  logger.debug(`🔁 Polling for claim using hostname: ${os.hostname()}`);

  try {
    const res = await axios.get(claimUrl, {
      params: { hostname: os.hostname() }
    });

    logger.debug(`📨 Claim response: ${JSON.stringify(res.data)}`);

    if (res.data && res.data.data && res.data.data.agent_id) {
      agentId = res.data.data.agent_id;
      registered = true;

      saveAgentData({
        agentId,
        receivedAt: Date.now()
      });

      logger.info(`✅ Agent approved! Assigned ID: ${agentId}`);
      initRuntime();
    } else {
      logger.info('⏳ Waiting for approval...');
      setTimeout(pollForClaim, 10000);
    }
  } catch (err) {
    logger.warn(`📡 Claim poll failed: ${err.message}`);
    setTimeout(pollForClaim, 15000);
  }
}

// Start core loops
function initRuntime() {
  logger.debug('🧠 Initializing runtime...');
  initBufferDB();
  setInterval(collectMetrics, config.pushInterval);
  setInterval(heartbeat, config.heartbeatInterval);
  logger.info('🎯 Runtime initialized with metric and heartbeat loops');
}

// Bootstrap agent
logger.info('🛰️ Syspectrum Agent starting...');
if (registered) {
  initRuntime();
}