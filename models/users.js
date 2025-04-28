const db = require('../db/sqlite');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// Create new user
async function createUser(username, password, role = 'operator') {
  const hashed = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `);
    stmt.run(username, hashed, role);
    logger.info(`🆕 User created: ${username} (${role})`);
  } catch (err) {
    logger.error(`❌ Failed to create user: ${err.message}`);
    throw err;
  }
}

// Authenticate user login
async function authenticateUser(username, password) {
  const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
  const user = stmt.get(username);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  // Remove sensitive fields
  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

// Get current user info by ID
function getUserById(id) {
  const stmt = db.prepare(`SELECT id, username, role FROM users WHERE id = ?`);
  return stmt.get(id);
}

// List all users (admin panel)
function listUsers() {
  const stmt = db.prepare(`SELECT id, username, role FROM users ORDER BY username ASC`);
  return stmt.all();
}

// Update user (change role or password)
async function updateUser(id, fields) {
  const { password, role } = fields;

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashed, id);
    logger.info(`🔑 Password updated for user ID: ${id}`);
  }

  if (role) {
    db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, id);
    logger.info(`🎛️ Role updated for user ID: ${id}`);
  }
}

// Delete user
function deleteUser(id) {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  logger.info(`🗑️ User deleted: ID ${id}`);
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  listUsers,
  updateUser,
  deleteUser
};
