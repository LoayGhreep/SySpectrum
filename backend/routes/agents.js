const express = require('express');
const router = express.Router();
const agentsModel = require('../models/agents');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');

// GET /api/agents — List all agents
router.get('/', auth(), async (req, res) => {
  logger.info('[GET /agents] Fetching all agents');
  try {
    const agents = await agentsModel.getAllAgents();
    logger.info(`[GET /agents] Retrieved ${agents.length} agents`);
    return success(res, agents);
  } catch (err) {
    logger.error('[GET /agents] Error fetching agents', err);
    return fail(res, 'error');
  }
});

// GET /api/agents/:hostname — Get single agent profile
router.get('/:hostname', auth(), async (req, res) => {
  logger.info(`[GET /agents/${req.params.hostname}] Fetching agent profile`);
  try {
    const agent = await agentsModel.getAgent(req.params.hostname);
    if (!agent) {
      logger.warn(`[GET /agents/${req.params.hostname}] Agent not found`);
      return fail(res, 'Agent not found', 404);
    }
    logger.info(`[GET /agents/${req.params.hostname}] Agent profile retrieved`);
    return success(res, agent);
  } catch (err) {
    logger.error(`[GET /agents/${req.params.hostname}] Error fetching agent`, err);
    return fail(res, 'error');
  }
});

// PATCH /api/agents/:hostname — Update label, status
router.patch(
  '/:hostname',
  auth(),
  validate([
    body('label').optional().isString(),
    body('status').optional().isString()
  ]),
  async (req, res) => {
    logger.info(`[PATCH /agents/${req.params.hostname}] Updating agent`);
    try {
      await agentsModel.updateAgent(req.params.hostname, req.body);
      logger.info(`[PATCH /agents/${req.params.hostname}] Agent updated`);
      return success(res, { message: 'Agent updated' });
    } catch (err) {
      logger.error(`[PATCH /agents/${req.params.hostname}] Error updating agent`, err);
      return fail(res, 'error');
    }
  }
);

// GET /api/agents/:hostname/health — Get agent health (uptime status)
router.get('/:hostname/health', auth(), async (req, res) => {
  logger.info(`[GET /agents/${req.params.hostname}/health] Fetching agent health`);
  try {
    const health = await agentsModel.getAgentHealth(req.params.hostname);
    if (!health) {
      logger.warn(`[GET /agents/${req.params.hostname}/health] Agent health not found`);
      return fail(res, 'Agent not found', 404);
    }
    logger.info(`[GET /agents/${req.params.hostname}/health] Agent health retrieved`);
    return success(res, health);
  } catch (err) {
    logger.error(`[GET /agents/${req.params.hostname}/health] Error fetching agent health`, err);
    return fail(res, 'error');
  }
});

module.exports = router;
