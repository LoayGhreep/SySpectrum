const express = require('express');
const router = express.Router();
const usersModel = require('../models/users');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const jwt = require('jsonwebtoken');
const { success, fail } = require('../utils/respond');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const SECRET = process.env.JWT_SECRET || 'dev_secret';

function traceScope() {
  return uuidv4();
}

// POST /api/login — Login and get JWT
router.post(
  '/login',
  validate([
    body('username').isString().notEmpty(),
    body('password').isString().notEmpty()
  ]),
  async (req, res) => {
    const traceId = traceScope();
    const start = Date.now();
    const { username } = req.body;

    logger.debug(`[${traceId}] 🔐 POST /login | Attempting login for username=${username}`);

    try {
      const user = await usersModel.authenticateUser(username, req.body.password);

      if (!user) {
        logger.warn(`[${traceId}] ❌ Invalid login credentials | username=${username}`);
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

      logger.info(`[${traceId}] ✅ Login successful | username=${user.username}`);
      return success(res, { token });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Login error: ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ POST /login complete | duration=${Date.now() - start}ms`);
    }
  }
);

// GET /api/me — Get current user info
router.get('/me', auth(), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();

  logger.debug(`[${traceId}] 🙋‍♂️ GET /me | userId=${req.user.id}`);

  try {
    return success(res, {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error fetching current user info: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /me complete | duration=${Date.now() - start}ms`);
  }
});

// GET /api/users — Admin-only: list users
router.get('/', auth('admin'), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();

  logger.debug(`[${traceId}] 📋 GET /users | Admin request by userId=${req.user.id}`);

  try {
    const users = await usersModel.listUsers();
    logger.info(`[${traceId}] ✅ Users listed | count=${users.length}`);
    return success(res, users);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error listing users: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ GET /users complete | duration=${Date.now() - start}ms`);
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
    const traceId = traceScope();
    const start = Date.now();
    const { username, role } = req.body;

    logger.debug(`[${traceId}] ➕ POST /users | Creating user | username=${username}, role=${role}`);

    try {
      await usersModel.createUser(username, req.body.password, role);
      logger.info(`[${traceId}] ✅ User created | username=${username}`);
      return success(res, { message: 'User created' });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error creating user: ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ POST /users complete | duration=${Date.now() - start}ms`);
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
    const traceId = traceScope();
    const start = Date.now();
    const userId = req.params.id;

    logger.debug(`[${traceId}] ✏️ POST /users/${userId} | Updating user`);

    try {
      await usersModel.updateUser(userId, req.body);
      logger.info(`[${traceId}] ✅ User updated | userId=${userId}`);
      return success(res, { message: 'User updated' });
    } catch (err) {
      logger.error(`[${traceId}] ❌ Error updating user ${userId}: ${err.message}`, { stack: err.stack });
      return fail(res, 'error');
    } finally {
      logger.debug(`[${traceId}] ⏱️ POST /users/:id complete | duration=${Date.now() - start}ms`);
    }
  }
);

// DELETE /api/users/:id — Admin-only: delete user
router.delete('/:id', auth('admin'), async (req, res) => {
  const traceId = traceScope();
  const start = Date.now();
  const userId = req.params.id;

  logger.debug(`[${traceId}] 🗑️ DELETE /users/${userId} | Attempting delete`);

  try {
    await usersModel.deleteUser(userId);
    logger.info(`[${traceId}] ✅ User deleted | userId=${userId}`);
    return success(res, { message: 'User deleted' });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error deleting user ${userId}: ${err.message}`, { stack: err.stack });
    return fail(res, 'error');
  } finally {
    logger.debug(`[${traceId}] ⏱️ DELETE /users/:id complete | duration=${Date.now() - start}ms`);
  }
});

module.exports = router;
