// backend/scripts/migrate.js
const fs = require('fs');
const path = require('path');
const db = require('../db/sqlite');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function runMigrations() {
  const traceId = uuidv4();
  const start = Date.now();

  logger.info(`[${traceId}] 🚀 Starting database migration`);

  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    logger.debug(`[${traceId}] 📄 Loading schema from ${schemaPath}`);

    const schema = fs.readFileSync(schemaPath, 'utf8');
    logger.debug(`[${traceId}] ✅ Schema file read successfully`);

    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    logger.debug(`[${traceId}] 🧱 Executing ${statements.length} schema statements`);

    for (const stmt of statements) {
      try {
        db.prepare(stmt).run();
        logger.debug(`[${traceId}] ✅ Executed statement: ${stmt.slice(0, 50)}...`);
      } catch (stmtErr) {
        logger.error(`[${traceId}] ❌ Statement failed: ${stmt.slice(0, 50)}...`, { stack: stmtErr.stack });
        throw stmtErr;
      }
    }

    logger.info(`[${traceId}] ✅ Tables created from schema.sql`);

    logger.debug(`[${traceId}] 🔎 Checking for default admin user`);
    const existingAdmin = db.prepare(`SELECT * FROM users WHERE username = 'admin'`).get();

    if (!existingAdmin) {
      logger.debug(`[${traceId}] 🆕 Admin user not found, creating default admin`);
      const hashedPassword = await bcrypt.hash('admin123', 10);

      db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`)
        .run('admin', hashedPassword, 'admin');

      logger.info(`[${traceId}] ✅ Default admin user created (username: admin)`);
    } else {
      logger.info(`[${traceId}] ℹ️ Default admin user already exists`);
    }

    logger.info(`[${traceId}] ✅ Database migrations completed successfully in ${Date.now() - start}ms`);
  } catch (err) {
    logger.error(`[${traceId}] ❌ Migration failed: ${err.message}`, { stack: err.stack });
    throw err; // Let index.js handle the error and exit
  }
}

module.exports = runMigrations;
