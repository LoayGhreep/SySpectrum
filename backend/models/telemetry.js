const db = require('../db/sqlite');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Generate scoped trace ID
function traceScope() {
  return uuidv4();
}

// Insert telemetry record
function insertTelemetry(data) {
  const traceId = traceScope();
  const start = Date.now();

  const safePreview = {
    agentId: data.agentId,
    hostname: data.hostname,
    timestamp: data.timestamp,
    cpu: data.cpu,
    memory: data.memory,
    disk: data.disk,
    network: data.network,
    temperature: data.temperature,
    top_processes: data.top_processes
  };

  logger.debug(`[${traceId}] 📥 Enter insertTelemetry | safePreview=${JSON.stringify(safePreview)}`);

  try {
    const stmt = db.prepare(`
      INSERT INTO telemetry (
        agent_id, hostname, timestamp,
        cpu_usage, cpu_cores,
        memory_total, memory_used, memory_percent,
        disk, network, processes, temperature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.agentId,
      data.hostname,
      data.timestamp,
      data.cpu?.usage ?? null,
      data.cpu?.cores ?? null,
      data.memory?.total ?? null,
      data.memory?.used ?? null,
      data.memory?.percent ?? null,
      JSON.stringify(data.disk ?? {}),
      JSON.stringify(data.network ?? {}),
      JSON.stringify(data.top_processes ?? []),
      typeof data.temperature === 'object'
        ? data.temperature?.cpu ?? null
        : data.temperature ?? null // support legacy or simplified inputs
    );

    logger.info(`[${traceId}] ✅ Telemetry inserted for agent: ${data.agentId}`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to insert telemetry: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit insertTelemetry | duration=${Date.now() - start}ms`);
  }
}

// Get latest telemetry snapshot for a host
function getLatestTelemetry(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔍 Enter getLatestTelemetry | hostname=${hostname}`);

  try {
    const stmt = db.prepare(`
      SELECT * FROM telemetry
      WHERE hostname = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const result = stmt.get(hostname);
    logger.debug(`[${traceId}] 📤 getLatestTelemetry result | found=${!!result}`);
    return result;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getLatestTelemetry: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getLatestTelemetry | duration=${Date.now() - start}ms`);
  }
}

// Get time-series telemetry for a host (for charts)
function getTelemetrySeries(hostname, fromTimestamp, toTimestamp) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📈 Enter getTelemetrySeries | hostname=${hostname}, from=${fromTimestamp}, to=${toTimestamp}`);

  try {
    const stmt = db.prepare(`
      SELECT *
      FROM telemetry
      WHERE hostname = ?
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(hostname, fromTimestamp, toTimestamp);

    // Parse JSON fields
    for (const row of rows) {
      row.disk = JSON.parse(row.disk || '{}');
      row.network = JSON.parse(row.network || '{}');
      row.processes = JSON.parse(row.processes || '[]');
    }

    logger.debug(`[${traceId}] 📊 getTelemetrySeries result | count=${rows.length}`);
    return rows;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getTelemetrySeries: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getTelemetrySeries | duration=${Date.now() - start}ms`);
  }
}

// Get paginated telemetry logs
function getTelemetryLogs(hostname, page = 1, limit = 50) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📃 Enter getTelemetryLogs | hostname=${hostname}, page=${page}, limit=${limit}`);

  try {
    const offset = (page - 1) * limit;

    const stmt = db.prepare(`
      SELECT * FROM telemetry
      WHERE hostname = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(hostname, limit, offset);
    logger.debug(`[${traceId}] 📄 getTelemetryLogs result | count=${rows.length}`);
    return rows;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getTelemetryLogs: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getTelemetryLogs | duration=${Date.now() - start}ms`);
  }
}

module.exports = {
  insertTelemetry,
  getLatestTelemetry,
  getTelemetrySeries,
  getTelemetryLogs
};
