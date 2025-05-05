const express = require('express');
const router = express.Router();
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');
const agentStatus = require('../utils/agentStatus');
const { v4: uuidv4 } = require('uuid');

function traceScope() {
  return uuidv4();
}

// ----------------------------
// 🔹 ABIP: Agent-Bootstrap Identity Protocol
// ----------------------------

// Step 1: Register new agent
router.post('/register', validate([
  body('hostname').isString(),
  body('platform').isString(),
  body('agentVersion').isString()
]), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📝 POST /agents/register | payload=${JSON.stringify(req.body)}`);

  try {
    const registered = agentsModel.registerAgent(req.body);
    if (registered) {
      logger.info(`[${traceId}] ✅ Agent registered | hostname=${req.body.hostname}`);
      return success(res, { message: 'Registration received. Pending approval.' });
    } else {
      logger.warn(`[${traceId}] ⚠️ Duplicate registration | hostname=${req.body.hostname}`);
      return fail(res, 'Already registered', 409);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in /register: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to register agent');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /register complete | duration=${Date.now() - start}ms`);
  }
});

// Step 2: Agent polls claim status
router.get('/claim', validate([
  query('hostname').isString()
]), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 GET /agents/claim | hostname=${req.query.hostname}`);

  try {
    const result = agentsModel.getClaimedAgent(req.query.hostname);
    if (result) {
      logger.info(`[${traceId}] 📦 Claim approved | hostname=${req.query.hostname}`);
      return success(res, result);
    } else {
      logger.info(`[${traceId}] ⏳ Claim not approved | hostname=${req.query.hostname}`);
      return fail(res, 'Not approved yet', 404);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in /claim: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to check claim');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /claim complete | duration=${Date.now() - start}ms`);
  }
});

// Step 3: Agent confirms handshake
router.post('/handshake', validate([
  body('hostname').isString()
]), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🤝 POST /agents/handshake | hostname=${req.body.hostname}`);

  try {
    const result = agentsModel.acknowledgeAgent(req.body.hostname);
    if (result) {
      logger.info(`[${traceId}] ✅ Handshake acknowledged | hostname=${req.body.hostname}`);
      return success(res, { message: 'Handshake acknowledged' });
    } else {
      logger.warn(`[${traceId}] ❌ Handshake failed | hostname=${req.body.hostname}`);
      return fail(res, 'Agent not found or invalid status', 400);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in /handshake: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to process handshake');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /handshake complete | duration=${Date.now() - start}ms`);
  }
});

// Admin: List all agents
router.get('/', auth(), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔎 GET /agents`);

  try {
    const agents = agentsModel.getAllAgents();
    logger.info(`[${traceId}] 📋 Retrieved ${agents.length} agents`);
    return success(res, agents);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in GET /agents: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to fetch agents');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /agents list complete | duration=${Date.now() - start}ms`);
  }
});

// Admin: View one agent
router.get('/:hostname', auth(), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🧩 GET /agents/${req.params.hostname}`);

  try {
    const agent = agentsModel.getAgent(req.params.hostname);
    if (!agent) {
      logger.warn(`[${traceId}] ❌ Agent not found | hostname=${req.params.hostname}`);
      return fail(res, 'Agent not found', 404);
    }
    logger.info(`[${traceId}] 📦 Agent retrieved | hostname=${req.params.hostname}`);
    return success(res, agent);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in GET /agents/${req.params.hostname}: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to fetch agent');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /agents/:hostname complete | duration=${Date.now() - start}ms`);
  }
});

// Admin: Update label or status by hostname
router.patch('/:hostname', auth(), validate([
  body('label').optional().isString(),
  body('status').optional().isNumeric().isIn(Object.values(agentStatus))
]), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ✏️ PATCH /agents/${req.params.hostname} | payload=${JSON.stringify(req.body)}`);

  try {
    agentsModel.updateAgentByHostname(req.params.hostname, req.body);
    logger.info(`[${traceId}] ✅ Agent updated | hostname=${req.params.hostname}`);
    return success(res, { message: 'Agent updated' });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in PATCH /agents/${req.params.hostname}: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to update agent');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /agents/:hostname PATCH complete | duration=${Date.now() - start}ms`);
  }
});

// Admin: Get agent health
router.get('/:hostname/health', auth(), (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🫀 GET /agents/${req.params.hostname}/health`);

  try {
    const health = agentsModel.getAgentHealth(req.params.hostname);
    if (!health) {
      logger.warn(`[${traceId}] ❌ Health check failed - agent not found | hostname=${req.params.hostname}`);
      return fail(res, 'Agent not found', 404);
    }

    logger.info(`[${traceId}] 🩺 Agent health retrieved | hostname=${req.params.hostname}, status=${health.status}`);
    return success(res, health);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in GET /agents/${req.params.hostname}/health: ${err.message}`, { stack: err.stack });
    return fail(res, 'Failed to get agent health');
  } finally {
    logger.debug(`[${traceId}] ⏱️ /agents/:hostname/health complete | duration=${Date.now() - start}ms`);
  }
});

module.exports = router;
