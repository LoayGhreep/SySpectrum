const express = require('express');
const router = express.Router();
const usersModel = require('../models/users');
const auth = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const jwt = require('jsonwebtoken');
const { success, fail } = require('../utils/respond');

const SECRET = process.env.JWT_SECRET || 'dev_secret';

// POST /api/login — Login and get JWT
router.post('/login',
  [
    body('username').isString(),
    body('password').isString()
  ],
  validate,
  async (req, res) => {
    try {
      const user = await usersModel.authenticateUser(req.body.username, req.body.password);
      if (!user) return fail(res, 'Invalid credentials', 401);

      const token = jwt.sign({
        id: user.id,
        username: user.username,
        role: user.role
      }, SECRET, { expiresIn: '24h' });

      return success(res, { token });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

// GET /api/me — Get current user info
router.get('/me', auth(), (req, res) => {
  return success(res, {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
});

// GET /api/users — Admin-only: list users
router.get('/', auth('admin'), (req, res) => {
  try {
    const users = usersModel.listUsers();
    return success(res, users);
  } catch (err) {
    return fail(res, err.message);
  }
});

// POST /api/users — Admin-only: create user
router.post('/', auth('admin'),
  [
    body('username').isString(),
    body('password').isString(),
    body('role').isIn(['admin', 'operator'])
  ],
  validate,
  async (req, res) => {
    try {
      await usersModel.createUser(req.body.username, req.body.password, req.body.role);
      return success(res, { message: "User created" });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

// POST /api/users/:id — Admin-only: update user (password or role)
router.post('/:id', auth('admin'),
  [
    body('password').optional().isString(),
    body('role').optional().isIn(['admin', 'operator'])
  ],
  validate,
  async (req, res) => {
    try {
      await usersModel.updateUser(req.params.id, req.body);
      return success(res, { message: "User updated" });
    } catch (err) {
      return fail(res, err.message);
    }
  }
);

// DELETE /api/users/:id — Admin-only: delete user
router.delete('/:id', auth('admin'), (req, res) => {
  try {
    usersModel.deleteUser(req.params.id);
    return success(res, { message: "User deleted" });
  } catch (err) {
    return fail(res, err.message);
  }
});

module.exports = router;
