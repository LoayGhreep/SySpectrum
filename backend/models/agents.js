const db = require('../db/sqlite');
const logger = require('../utils/logger');
const agentStatus = require('../utils/agentStatus');

// 🔹 Step 1: Register agent (Pending state)
function registerAgent({ hostname, platform, agentVersion }) {
  const now = Date.now();
  const existing = db.prepare(`SELECT hostname FROM agents WHERE hostname = ?`).get(hostname);

  if (existing) {
    logger.info(`🌀 Registration repeated for existing hostname: ${hostname}`);
    return false;
  }

  const agentId = `agent_${now}_${Math.floor(Math.random() * 100000)}`;

  db.prepare(`
    INSERT INTO agents (
      agent_id,
      hostname,
      first_seen,
      last_seen,
      platform,
      version,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(agentId, hostname, now, now, platform, agentVersion, agentStatus.PENDING);

  logger.info(`🎕 Agent registered and pending: ${hostname} → ${agentId}`);
  return true;
}

// 🔹 Step 2: Admin approves — backend sends confirmation (Claim)
function getClaimedAgent(hostname) {
  const agent = db.prepare(`
    SELECT agent_id, status FROM agents
    WHERE hostname = ? AND status = ?
  `).get(hostname, agentStatus.APPROVED);

  return agent || null;
}

// 🔹 Step 3: Agent handshakes back — move to Acknowledged
function acknowledgeAgent(agentId) {
  const now = Date.now();
  const result = db.prepare(`
    UPDATE agents
    SET status = ?, last_seen = ?
    WHERE agent_id = ? AND status = ?
  `).run(agentStatus.ACKNOWLEDGED, now, agentId, agentStatus.APPROVED);

  if (result.changes > 0) {
    logger.info(`🤝 Agent acknowledged: ${agentId}`);
    return true;
  } else {
    logger.warn(`❌ Acknowledge failed or invalid status: ${agentId}`);
    return false;
  }
}

// 🔹 Get all agents list
function getAllAgents() {
  return db.prepare(`
    SELECT agent_id, hostname, first_seen, last_seen, label, status, platform, version
    FROM agents
    ORDER BY last_seen DESC
  `).all();
}

// 🔹 Get single agent by ID
function getAgent(agentId) {
  return db.prepare(`
    SELECT * FROM agents
    WHERE agent_id = ?
  `).get(agentId);
}

// 🔹 Update agent (admin-level: label/status)
function updateAgent(agentId, fields) {
  const { label, status } = fields;

  db.prepare(`
    UPDATE agents
    SET label = COALESCE(?, label),
        status = COALESCE(?, status)
    WHERE agent_id = ?
  `).run(label || null, status || null, agentId);

  logger.info(`✏️ Agent updated: ${agentId}`);
}

// 🔹 Get agent health
function getAgentHealth(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return null;

  const now = Date.now();
  const minutesSinceLastSeen = (now - agent.last_seen) / 60000;

  return {
    agent_id: agent.agent_id,
    last_seen: agent.last_seen,
    minutes_since_last_seen: minutesSinceLastSeen,
    status: minutesSinceLastSeen < 10 ? 'healthy' : 'offline'
  };
}

// 🔹 Called by telemetry to update last seen (and eventually switch to STABLE)
function updateHeartbeat(agentId) {
  const now = Date.now();

  const agent = db.prepare(`SELECT status FROM agents WHERE agent_id = ?`).get(agentId);
  if (!agent) return;

  const newStatus =
    agent.status === agentStatus.ACKNOWLEDGED ? agentStatus.STABLE : agent.status;

  db.prepare(`
    UPDATE agents
    SET last_seen = ?, status = ?
    WHERE agent_id = ?
  `).run(now, newStatus, agentId);

  logger.debug(`🧽 Agent heartbeat updated: ${agentId}`);
}

// 🔹 Legacy fallback (still used by telemetry with hostname-only agents)
function upsertAgent(hostname) {
  const now = Date.now();
  const existing = db.prepare('SELECT hostname FROM agents WHERE hostname = ?').get(hostname);

  if (existing) {
    db.prepare('UPDATE agents SET last_seen = ? WHERE hostname = ?').run(now, hostname);
    logger.info(`🔄 Agent updated (legacy): ${hostname}`);
  } else {
    db.prepare('INSERT INTO agents (agent_id, hostname, first_seen, last_seen, status) VALUES (?, ?, ?, ?, ?)')
      .run(`legacy_${now}`, hostname, now, now, agentStatus.STABLE);
    logger.info(`🎕 Agent registered (legacy): ${hostname}`);
  }
}

module.exports = {
  registerAgent,
  getClaimedAgent,
  acknowledgeAgent,
  updateHeartbeat,
  upsertAgent,
  getAllAgents,
  getAgent,
  updateAgent,
  getAgentHealth
};
