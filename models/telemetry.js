const db = require('../db/sqlite');
const logger = require('../utils/logger');

// Insert telemetry record
function insertTelemetry(data) {
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
    logger.info(`✅ Telemetry inserted for host: ${data.hostname}`);
  } catch (err) {
    logger.error(`❌ Failed to insert telemetry: ${err.message}`);
    throw err;
  }
}

// Get latest telemetry snapshot for a host
function getLatestTelemetry(hostname) {
  const stmt = db.prepare(`
    SELECT * FROM telemetry
    WHERE hostname = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  return stmt.get(hostname);
}

// Get time-series telemetry for a host (for charts)
function getTelemetrySeries(hostname, fromTimestamp, toTimestamp) {
  const stmt = db.prepare(`
    SELECT timestamp, cpu_usage, memory_percent, temperature
    FROM telemetry
    WHERE hostname = ?
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(hostname, fromTimestamp, toTimestamp);
}

// Get paginated telemetry logs
function getTelemetryLogs(hostname, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const stmt = db.prepare(`
    SELECT * FROM telemetry
    WHERE hostname = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(hostname, limit, offset);
}

module.exports = {
  insertTelemetry,
  getLatestTelemetry,
  getTelemetrySeries,
  getTelemetryLogs
};
