const express = require('express');
const router = express.Router();
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');

// GET /api/agents — List all agents
router.get('/', auth(), (req, res) => {
  try {
    const agents = agentsModel.getAllAgents();
    return success(res, agents);
  } catch (err) {
    return fail(res, err.message);
  }
});

// GET /api/agents/:hostname — Get single agent profile
router.get('/:hostname', auth(), (req, res) => {
  try {
    const agent = agentsModel.getAgent(req.params.hostname);
    if (!agent) return fail(res, 'Agent not found', 404);
    return success(res, agent);
  } catch (err) {
    return fail(res, err.message);
  }
});

// PATCH /api/agents/:hostname — Update label, status
router.patch('/:hostname', auth(), [
  body('label').optional().isString(),
  body('status').optional().isString()
], validate, (req, res) => {
  try {
    agentsModel.updateAgent(req.params.hostname, req.body);
    return success(res, { message: "Agent updated" });
  } catch (err) {
    return fail(res, err.message);
  }
});

// GET /api/agents/:hostname/health — Get agent health (uptime status)
router.get('/:hostname/health', auth(), (req, res) => {
  try {
    const health = agentsModel.getAgentHealth(req.params.hostname);
    if (!health) return fail(res, 'Agent not found', 404);
    return success(res, health);
  } catch (err) {
    return fail(res, err.message);
  }
});

module.exports = router;
