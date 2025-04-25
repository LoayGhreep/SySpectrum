const db = require('../db/sqlite');
const logger = require('../utils/logger');

try {
  logger.info('🚀 Running database migrations...');

  // Telemetry table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostname TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      cpu_usage REAL,
      cpu_cores INTEGER,
      memory_total INTEGER,
      memory_used INTEGER,
      memory_percent REAL,
      disk TEXT,            -- JSON string
      network TEXT,         -- JSON string
      processes TEXT,       -- JSON array
      temperature REAL
    );
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_host_time ON telemetry(hostname, timestamp DESC);`).run();

  // Agents table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS agents (
      hostname TEXT PRIMARY KEY,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      label TEXT,
      status TEXT DEFAULT 'active'
    );
  `).run();

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL
    );
  `).run();

  // Settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `).run();

  logger.info('✅ Database migrations completed successfully!');
} catch (err) {
  logger.error('❌ Migration failed: ' + err.message);
  process.exit(1);
}
