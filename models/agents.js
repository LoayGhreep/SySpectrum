const db = require('../db/sqlite');
const logger = require('../utils/logger');

// Insert or update agent (called when telemetry is received)
function upsertAgent(hostname) {
  try {
    const now = Date.now();
    const existing = db.prepare('SELECT hostname FROM agents WHERE hostname = ?').get(hostname);

    if (existing) {
      db.prepare('UPDATE agents SET last_seen = ? WHERE hostname = ?').run(now, hostname);
      logger.info(`🔄 Agent updated: ${hostname}`);
    } else {
      db.prepare('INSERT INTO agents (hostname, first_seen, last_seen) VALUES (?, ?, ?)').run(hostname, now, now);
      logger.info(`🆕 Agent registered: ${hostname}`);
    }
  } catch (err) {
    logger.error(`❌ Failed to upsert agent: ${err.message}`);
    throw err;
  }
}

// Get all agents list
function getAllAgents() {
  const stmt = db.prepare(`
    SELECT hostname, first_seen, last_seen, label, status
    FROM agents
    ORDER BY last_seen DESC
  `);
  return stmt.all();
}

// Get single agent by hostname
function getAgent(hostname) {
  const stmt = db.prepare(`
    SELECT * FROM agents
    WHERE hostname = ?
  `);
  return stmt.get(hostname);
}

// Update agent metadata (label, status)
function updateAgent(hostname, fields) {
  const { label, status } = fields;
  const stmt = db.prepare(`
    UPDATE agents
    SET label = ?, status = ?
    WHERE hostname = ?
  `);
  stmt.run(label, status, hostname);
  logger.info(`✏️ Agent updated: ${hostname}`);
}

// Get agent health (uptime estimate based on last seen)
function getAgentHealth(hostname) {
  const agent = getAgent(hostname);
  if (!agent) return null;

  const now = Date.now();
  const minutesSinceLastSeen = (now - agent.last_seen) / 60000;

  return {
    hostname: agent.hostname,
    last_seen: agent.last_seen,
    minutes_since_last_seen: minutesSinceLastSeen,
    status: minutesSinceLastSeen < 10 ? 'healthy' : 'offline'
  };
}

module.exports = {
  upsertAgent,
  getAllAgents,
  getAgent,
  updateAgent,
  getAgentHealth
};
