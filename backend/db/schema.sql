-- 📊 Telemetry Table — stores agent metrics over time
CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,                     -- Foreign key to agents.agent_id
  hostname TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  cpu_usage REAL,
  cpu_cores INTEGER,
  memory_total INTEGER,
  memory_used INTEGER,
  memory_percent REAL,
  disk TEXT,                                  -- JSON string
  network TEXT,                               -- JSON string
  processes TEXT,                             -- JSON array
  temperature REAL,
  FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telemetry_agent_time
  ON telemetry(agent_id, timestamp DESC);

-- 🛰️ Agents Table — registered agents with full metadata
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,                  -- Permanent UUID from backend
  hostname TEXT NOT NULL UNIQUE,              -- Last known hostname (can change)
  platform TEXT,                              -- linux, darwin, etc
  version TEXT,                               -- agent version string
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  label TEXT,
  status INTEGER DEFAULT 0                    -- See: agentStatus enum
);

-- 👥 Users Table — system users (admin/operator)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL
);

-- ⚙️ Settings Table — global settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
