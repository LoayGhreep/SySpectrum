const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

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
const traceId = uuidv4();
const agentData = loadAgentData();
if (agentData && agentData.agentId) {
  agentId = agentData.agentId;
  registered = true;
  logger.info(`[${traceId}] 🆔 Loaded agentId: ${agentId}`);
} else {
  logger.warn(`[${traceId}] 🔐 No agentId found — entering registration mode...`);
  registerAgent();
}

ensureDependencies();

function initBufferDB() {
  logger.debug(`[${traceId}] Initializing telemetry buffer DB`);
  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `, (err) => {
    if (err) logger.error(`[${traceId}] 🧱 Failed to initialize buffer DB: ${err.message}`, { stack: err.stack });
    else logger.info(`[${traceId}] 🧱 Telemetry buffer DB initialized`);
  });
}

function bufferPayload(json) {
  logger.debug(`[${traceId}] Buffering payload`);
  db.run(`INSERT INTO telemetry (data, timestamp) VALUES (?, ?)`, [JSON.stringify(json), Date.now()], err => {
    if (err) logger.error(`[${traceId}] ❌ Failed to buffer telemetry: ${err.message}`, { stack: err.stack });
    else logger.info(`[${traceId}] 📦 Telemetry buffered`);
  });
}

function flushBuffer() {
  logger.debug(`[${traceId}] Flushing telemetry buffer`);
  db.all(`SELECT * FROM telemetry ORDER BY timestamp ASC`, async (err, rows) => {
    if (err) {
      logger.error(`[${traceId}] 🚱 Failed to read buffer DB: ${err.message}`, { stack: err.stack });
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
        logger.info(`[${traceId}] ✅ Flushed buffered payload id=${row.id}`);
      } catch (err) {
        logger.warn(`[${traceId}] 🔁 Retry failed for buffered id=${row.id}: ${err.message}`);
        break;
      }
    }
  });
}

function validate(name, value) {
  const invalid =
    value === null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0);
  if (invalid) logger.warn(`[${traceId}] ⚠️ Module '${name}' returned empty or invalid data`);
  else logger.debug(`[${traceId}] ✅ Module '${name}' is valid`);
}

async function collectMetrics() {
  const collectionId = uuidv4();
  logger.debug(`[${collectionId}] 🔄 Starting metric collection`);
  const start = Date.now();

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

  logger.debug(`[${collectionId}] 📊 Collected metrics`);
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
    logger.info(`[${collectionId}] 📡 Telemetry sent successfully`);
    flushBuffer();
  } catch (e) {
    logger.error(`[${collectionId}] 📴 Failed to send telemetry: ${e.message}`, { stack: e.stack });
    bufferPayload(payload);
  }

  logger.debug(`[${collectionId}] ⏱️ Metric collection duration: ${Date.now() - start}ms`);
}

async function heartbeat() {
  const heartbeatId = uuidv4();
  logger.debug(`[${heartbeatId}] 💓 Sending heartbeat...`);

  if (!registered) return;

  const payload = {
    agentId,
    agentVersion: config.version,
    hostname: os.hostname(),
    timestamp: Date.now()
  };

  try {
    await axios.post(`${config.baseUrl}/api/agents/heartbeat`, payload, {
      headers: {
        'Agent-Version': config.version,
        'Agent-Id': agentId
      }
    });
    logger.debug(`[${heartbeatId}] ✅ Heartbeat sent`);
  } catch (err) {
    logger.warn(`[${heartbeatId}] 💔 Heartbeat failed: ${err.message}`);
  }
}

async function registerAgent() {
  const regId = uuidv4();
  const registerUrl = `${config.baseUrl}/api/agents/register`;
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    agentVersion: config.version,
    timestamp: Date.now()
  };

  logger.debug(`[${regId}] 📋 Registration payload: ${JSON.stringify(systemInfo, null, 2)}`);

  try {
    logger.info(`[${regId}] 🔐 Sending registration request`);
    await axios.post(registerUrl, systemInfo);
    logger.info(`[${regId}] 🕐 Registration request sent. Awaiting approval...`);
    pollForClaim();
  } catch (err) {
    logger.error(`[${regId}] ❌ Registration failed: ${err.message}`);
    setTimeout(registerAgent, 15000);
  }
}

async function pollForClaim() {
  const pollId = uuidv4();
  const claimUrl = `${config.baseUrl}/api/agents/claim`;

  logger.debug(`[${pollId}] 🔁 Polling for claim`);

  try {
    const res = await axios.get(claimUrl, {
      params: { hostname: os.hostname() }
    });

    logger.debug(`[${pollId}] 📨 Claim response: ${JSON.stringify(res.data)}`);

    if (res.data?.data?.agent_id) {
      agentId = res.data.data.agent_id;
      registered = true;
      saveAgentData({
        agentId,
        receivedAt: Date.now()
      });
      logger.info(`[${pollId}] ✅ Agent approved with ID: ${agentId}`);
      initRuntime();
    } else {
      logger.info(`[${pollId}] ⏳ Approval pending... retrying`);
      setTimeout(pollForClaim, 10000);
    }
  } catch (err) {
    logger.warn(`[${pollId}] 📡 Claim poll failed: ${err.message}`);
    setTimeout(pollForClaim, 15000);
  }
}

function initRuntime() {
  const runtimeId = uuidv4();
  logger.debug(`[${runtimeId}] 🧠 Initializing runtime`);
  initBufferDB();
  setInterval(collectMetrics, config.pushInterval);
  setInterval(heartbeat, config.heartbeatInterval);
  logger.info(`[${runtimeId}] 🎯 Runtime initialized with intervals`);
}

// Start bootstrap
logger.info(`[${traceId}] 🛰️ Syspectrum Agent starting...`);
if (registered) {
  initRuntime();
}
