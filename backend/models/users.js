const db = require('../db/sqlite');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Utility to generate trace ID
function traceScope() {
  return uuidv4();
}

// Create new user
async function createUser(username, password, role = 'operator') {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ➕ Enter createUser | username=${username}, role=${role}`);

  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `);
    stmt.run(username, hashed, role);

    logger.info(`[${traceId}] 🆕 User created: ${username} (${role})`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to create user '${username}': ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit createUser | duration=${Date.now() - start}ms`);
  }
}

// Authenticate user login
async function authenticateUser(username, password) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔐 Enter authenticateUser | username=${username}`);

  try {
    const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
    const user = stmt.get(username);

    if (!user) {
      logger.warn(`[${traceId}] ⚠️ Authentication failed: user not found | username=${username}`);
      return null;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      logger.warn(`[${traceId}] ❌ Authentication failed: invalid password | username=${username}`);
      return null;
    }

    logger.info(`[${traceId}] ✅ Authentication successful for user: ${username}`);
    return {
      id: user.id,
      username: user.username,
      role: user.role
    };
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in authenticateUser | username=${username}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit authenticateUser | duration=${Date.now() - start}ms`);
  }
}

// Get current user info by ID
function getUserById(id) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 👤 Enter getUserById | id=${id}`);

  try {
    const stmt = db.prepare(`SELECT id, username, role FROM users WHERE id = ?`);
    const user = stmt.get(id);
    logger.debug(`[${traceId}] 📤 getUserById result | found=${!!user}`);
    return user;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in getUserById | id=${id}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit getUserById | duration=${Date.now() - start}ms`);
  }
}

// List all users (admin panel)
function listUsers() {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 📋 Enter listUsers`);

  try {
    const stmt = db.prepare(`SELECT id, username, role FROM users ORDER BY username ASC`);
    const users = stmt.all();
    logger.debug(`[${traceId}] 📤 listUsers result | count=${users.length}`);
    return users;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in listUsers: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit listUsers | duration=${Date.now() - start}ms`);
  }
}

// Update user (change role or password)
async function updateUser(id, fields) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] ✏️ Enter updateUser | id=${id}, fields=${JSON.stringify(Object.keys(fields))}`);

  try {
    const { password, role } = fields;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashed, id);
      logger.info(`[${traceId}] 🔑 Password updated for user ID: ${id}`);
    }

    if (role) {
      db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, id);
      logger.info(`[${traceId}] 🎛️ Role updated for user ID: ${id} to ${role}`);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in updateUser | id=${id}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit updateUser | duration=${Date.now() - start}ms`);
  }
}

// Delete user
function deleteUser(id) {
  const traceId = traceScope();
  const start = Date.now();
  logger.debug(`[${traceId}] 🗑️ Enter deleteUser | id=${id}`);

  try {
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    logger.info(`[${traceId}] 🗑️ User deleted: ID ${id}`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Error in deleteUser | id=${id}: ${err.message}`, { stack: err.stack });
    throw err;
  } finally {
    logger.debug(`[${traceId}] ⏱️ Exit deleteUser | duration=${Date.now() - start}ms`);
  }
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  listUsers,
  updateUser,
  deleteUser
};
