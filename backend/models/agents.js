const db = require('../db/sqlite');
const logger = require('../utils/logger');
const agentStatus = require('../utils/agentStatus');
const { v4: uuidv4 } = require('uuid');

// Utility to generate trace ID
function traceScope() {
  return uuidv4();
}

// 🔹 Step 1: Register agent (Pending state)
function registerAgent({ hostname, platform, agentVersion }) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ➕ Enter registerAgent | hostname=${hostname}, platform=${platform}, agentVersion=${agentVersion}`);

  try {
    const now = Date.now();
    const existing = db.prepare(`SELECT hostname FROM agents WHERE hostname = ?`).get(hostname);

    if (existing) {
      logger.info(`[${traceId}] 🌀 Registration repeated for existing hostname: ${hostname}`);
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

    logger.info(`[${traceId}] 🎕 Agent registered and pending: ${hostname} → ${agentId}`);
    return true;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in registerAgent: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit registerAgent | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Step 2: Agent polls for claim — only when APPROVED
function getClaimedAgent(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔍 Enter getClaimedAgent | hostname=${hostname}`);

  try {
    const agent = db.prepare(`
      SELECT agent_id, status FROM agents
      WHERE hostname = ? AND status = ?
    `).get(hostname, agentStatus.APPROVED);

    logger.debug(`[${traceId}] ↩️ getClaimedAgent result | found=${!!agent}`);
    return agent || null;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getClaimedAgent: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getClaimedAgent | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Step 3: Agent handshakes back — move to ACKNOWLEDGED
function acknowledgeAgent(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🤝 Enter acknowledgeAgent | hostname=${hostname}`);

  try {
    const now = Date.now();
    const result = db.prepare(`
      UPDATE agents
      SET status = ?, last_seen = ?
      WHERE hostname = ? AND status = ?
    `).run(agentStatus.ACKNOWLEDGED, now, hostname, agentStatus.APPROVED);

    if (result.changes > 0) {
      logger.info(`[${traceId}] 🤝 Agent acknowledged: ${hostname}`);
      return true;
    } else {
      logger.warn(`[${traceId}] ❌ Acknowledge failed or invalid status: ${hostname}`);
      return false;
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in acknowledgeAgent: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit acknowledgeAgent | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Update agent using hostname
function updateAgentByHostname(hostname, fields) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ✏️ Enter updateAgentByHostname | hostname=${hostname}, fields=${JSON.stringify(fields)}`);

  try {
    const { label, status } = fields;

    db.prepare(`
      UPDATE agents
      SET label = COALESCE(?, label),
          status = COALESCE(?, status)
      WHERE hostname = ?
    `).run(label || null, status ?? null, hostname);

    logger.info(`[${traceId}] ✏️ Agent updated via hostname: ${hostname}`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in updateAgentByHostname: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit updateAgentByHostname | duration=${Date.now() - start}ms`);
  }
}

// 🔹 List all agents
function getAllAgents() {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📋 Enter getAllAgents`);

  try {
    const result = db.prepare(`
      SELECT agent_id, hostname, first_seen, last_seen, label, status, platform, version
      FROM agents
      ORDER BY last_seen DESC
    `).all();

    logger.debug(`[${traceId}] 📋 Retrieved ${result.length} agents`);
    return result;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getAllAgents: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getAllAgents | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Get agent by hostname
function getAgent(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔍 Enter getAgent | hostname=${hostname}`);

  try {
    const result = db.prepare(`
      SELECT * FROM agents
      WHERE hostname = ?
    `).get(hostname);

    logger.debug(`[${traceId}] 🔍 getAgent result | found=${!!result}`);
    return result;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getAgent: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getAgent | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Get agent health by hostname
function getAgentHealth(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🩺 Enter getAgentHealth | hostname=${hostname}`);

  try {
    const agent = getAgent(hostname);
    if (!agent) {
      logger.warn(`[${traceId}] 🛑 Agent not found: ${hostname}`);
      return null;
    }

    const now = Date.now();
    const minutesSinceLastSeen = (now - agent.last_seen) / 60000;

    const health = {
      agent_id: agent.agent_id,
      last_seen: agent.last_seen,
      minutes_since_last_seen: minutesSinceLastSeen,
      status: minutesSinceLastSeen < 10 ? 'healthy' : 'offline'
    };

    logger.debug(`[${traceId}] 🩺 Agent health computed: ${JSON.stringify(health)}`);
    return health;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getAgentHealth: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getAgentHealth | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Heartbeat (background keep-alive ping)
function updateHeartbeat(agentId) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ❤️ Enter updateHeartbeat | agentId=${agentId}`);

  try {
    const now = Date.now();

    const agent = db.prepare('SELECT status FROM agents WHERE agent_id = ?').get(agentId);
    if (!agent) {
      logger.warn(`[${traceId}] ❌ Agent not found for heartbeat: ${agentId}`);
      return;
    }

    const newStatus = agent.status === agentStatus.ACKNOWLEDGED
      ? agentStatus.STABLE
      : agent.status;

    db.prepare(`
      UPDATE agents
      SET last_seen = ?, status = ?
      WHERE agent_id = ?
    `).run(now, newStatus, agentId);

    logger.debug(`[${traceId}] 🧽 Agent heartbeat updated: ${agentId}, newStatus=${newStatus}`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in updateHeartbeat: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit updateHeartbeat | duration=${Date.now() - start}ms`);
  }
}

// 🔹 Legacy fallback — upsert by hostname
function upsertAgent(hostname) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ♻️ Enter upsertAgent | hostname=${hostname}`);

  try {
    const now = Date.now();
    const existing = db.prepare('SELECT hostname FROM agents WHERE hostname = ?').get(hostname);

    if (existing) {
      db.prepare('UPDATE agents SET last_seen = ? WHERE hostname = ?').run(now, hostname);
      logger.info(`[${traceId}] 🔄 Agent updated (legacy): ${hostname}`);
    } else {
      db.prepare(`
        INSERT INTO agents (agent_id, hostname, first_seen, last_seen, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(`legacy_${now}`, hostname, now, now, agentStatus.STABLE);
      logger.info(`[${traceId}] 🎕 Agent registered (legacy): ${hostname}`);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in upsertAgent: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit upsertAgent | duration=${Date.now() - start}ms`);
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
  getAgentHealth,
  updateAgentByHostname
};
