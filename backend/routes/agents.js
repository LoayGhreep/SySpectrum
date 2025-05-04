// backend/routes/agents.js
const express = require('express');
const router = express.Router();
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');
const agentStatus = require('../utils/agentStatus');

// ----------------------------
// 🔹 ABIP: Agent-Bootstrap Identity Protocol
// ----------------------------

// POST /api/agents/register — Step 1: Agent sends self-intro
router.post('/register', validate([
  body('hostname').isString(),
  body('platform').isString(),
  body('agentVersion').isString()
]), (req, res) => {
  try {
    const registered = agentsModel.registerAgent(req.body);
    if (registered) {
      return success(res, { message: 'Registration received. Pending approval.' });
    } else {
      return fail(res, 'Already registered', 409);
    }
  } catch (err) {
    logger.error(`[POST /agents/register] ${err.message}`);
    return fail(res, 'Failed to register agent');
  }
});

// GET /api/agents/claim?hostname=... — Step 2: Agent polls for approval
router.get('/claim', validate([
  query('hostname').isString()
]), (req, res) => {
  try {
    const result = agentsModel.getClaimedAgent(req.query.hostname);
    if (result) return success(res, result);
    else return fail(res, 'Not approved yet', 404);
  } catch (err) {
    logger.error(`[GET /agents/claim] ${err.message}`);
    return fail(res, 'Failed to check claim');
  }
});

// POST /api/agents/handshake — Step 3: Agent confirms receipt of ID
router.post('/handshake', validate([
  body('hostname').isString()
]), (req, res) => {
  try {
    const result = agentsModel.acknowledgeAgent(req.body.hostname);
    if (result) return success(res, { message: 'Handshake acknowledged' });
    else return fail(res, 'Agent not found or invalid status', 400);
  } catch (err) {
    logger.error(`[POST /agents/handshake] ${err.message}`);
    return fail(res, 'Failed to process handshake');
  }
});

// ----------------------------
// 🔹 Admin Endpoints
// ----------------------------

// GET /api/agents — Admin: List all agents
router.get('/', auth(), (req, res) => {
  try {
    const agents = agentsModel.getAllAgents();
    return success(res, agents);
  } catch (err) {
    logger.error('[GET /agents] Error:', err.message);
    return fail(res, 'Failed to fetch agents');
  }
});

// GET /api/agents/:hostname — Admin: View one agent
router.get('/:hostname', auth(), (req, res) => {
  try {
    const agent = agentsModel.getAgent(req.params.hostname);
    if (!agent) return fail(res, 'Agent not found', 404);
    return success(res, agent);
  } catch (err) {
    logger.error(`[GET /agents/${req.params.hostname}] Error:`, err.message);
    return fail(res, 'Failed to fetch agent');
  }
});

// PATCH /api/agents/:hostname — Admin: Update label/status
router.patch('/:hostname', auth(), validate([
  body('label').optional().isString(),
  body('status').optional().isNumeric().isIn(Object.values(agentStatus))
]), (req, res) => {
  try {
    agentsModel.updateAgent(req.params.hostname, req.body);
    return success(res, { message: 'Agent updated' });
  } catch (err) {
    logger.error(`[PATCH /agents/${req.params.hostname}] Error:`, err.message);
    return fail(res, 'Failed to update agent');
  }
});

// GET /api/agents/:hostname/health — Agent status tracker
router.get('/:hostname/health', auth(), (req, res) => {
  try {
    const health = agentsModel.getAgentHealth(req.params.hostname);
    if (!health) return fail(res, 'Agent not found', 404);
    return success(res, health);
  } catch (err) {
    logger.error(`[GET /agents/${req.params.hostname}/health] Error:`, err.message);
    return fail(res, 'Failed to get agent health');
  }
});

module.exports = router;
