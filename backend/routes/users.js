const express = require('express');
const router = express.Router();
const usersModel = require('../models/users');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const jwt = require('jsonwebtoken');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');

const SECRET = process.env.JWT_SECRET || 'dev_secret';

// POST /api/login — Login and get JWT
router.post(
  '/login',
  validate([
    body('username').isString().notEmpty(),
    body('password').isString().notEmpty()
  ]),
  async (req, res) => {
    logger.info('[POST /login] Login attempt started');
    try {
      const user = await usersModel.authenticateUser(req.body.username, req.body.password);
      if (!user) {
        logger.warn('[POST /login] Invalid credentials for username:', req.body.username);
        return fail(res, 'Invalid credentials', 401);
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        SECRET,
        { expiresIn: '24h' }
      );

      logger.info(`[POST /login] Login successful for username: ${user.username}`);
      return success(res, { token });
    } catch (err) {
      logger.error('[POST /login] Login error', err);
      return fail(res, 'error');
    }
  }
);

// GET /api/me — Get current user info
router.get('/me', auth(), async (req, res) => {
  logger.info(`[GET /me] Fetching user info for ID: ${req.user.id}`);
  try {
    return success(res, {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    });
  } catch (err) {
    logger.error('[GET /me] Error fetching user info', err);
    return fail(res, 'error');
  }
});

// GET /api/users — Admin-only: list users
router.get('/', auth('admin'), async (req, res) => {
  logger.info('[GET /users] Listing all users');
  try {
    const users = await usersModel.listUsers();
    return success(res, users);
  } catch (err) {
    logger.error('[GET /users] Error listing users', err);
    return fail(res, 'error');
  }
});

// POST /api/users — Admin-only: create user
router.post(
  '/',
  auth('admin'),
  validate([
    body('username').isString().notEmpty(),
    body('password').isString().notEmpty(),
    body('role').isIn(['admin', 'operator'])
  ]),
  async (req, res) => {
    logger.info(`[POST /users] Creating user: ${req.body.username}`);
    try {
      await usersModel.createUser(req.body.username, req.body.password, req.body.role);
      logger.info(`[POST /users] User created: ${req.body.username}`);
      return success(res, { message: 'User created' });
    } catch (err) {
      logger.error('[POST /users] Error creating user', err);
      return fail(res, 'error');
    }
  }
);

// POST /api/users/:id — Admin-only: update user (password or role)
router.post(
  '/:id',
  auth('admin'),
  validate([
    body('password').optional().isString(),
    body('role').optional().isIn(['admin', 'operator'])
  ]),
  async (req, res) => {
    logger.info(`[POST /users/:id] Updating user with ID: ${req.params.id}`);
    try {
      await usersModel.updateUser(req.params.id, req.body);
      logger.info(`[POST /users/:id] User updated: ${req.params.id}`);
      return success(res, { message: 'User updated' });
    } catch (err) {
      logger.error('[POST /users/:id] Error updating user', err);
      return fail(res, 'error');
    }
  }
);

// DELETE /api/users/:id — Admin-only: delete user
router.delete('/:id', auth('admin'), async (req, res) => {
  logger.info(`[DELETE /users/:id] Deleting user with ID: ${req.params.id}`);
  try {
    await usersModel.deleteUser(req.params.id);
    logger.info(`[DELETE /users/:id] User deleted: ${req.params.id}`);
    return success(res, { message: 'User deleted' });
  } catch (err) {
    logger.error('[DELETE /users/:id] Error deleting user', err);
    return fail(res, 'error');
  }
});

module.exports = router;
