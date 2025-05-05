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
    hostname: data.hostname,
    timestamp: data.timestamp,
    cpu_usage: data.cpu_usage,
    memory_percent: data.memory_percent,
    temperature: data.temperature
  };

  logger.debug(`[${traceId}] 📥 Enter insertTelemetry | safePreview=${JSON.stringify(safePreview)}`);

  try {
    const stmt = db.prepare(`
      INSERT INTO telemetry (
        hostname, timestamp,
        cpu_usage, cpu_cores,
        memory_total, memory_used, memory_percent,
        disk, network, processes, temperature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.hostname,
      data.timestamp,
      data.cpu_usage,
      data.cpu_cores,
      data.memory_total,
      data.memory_used,
      data.memory_percent,
      JSON.stringify(data.disk),
      JSON.stringify(data.network),
      JSON.stringify(data.top_processes),
      data.temperature
    );

    logger.info(`[${traceId}] ✅ Telemetry inserted for host: ${data.hostname}`);
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
      SELECT timestamp, cpu_usage, memory_percent, temperature
      FROM telemetry
      WHERE hostname = ?
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(hostname, fromTimestamp, toTimestamp);
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
