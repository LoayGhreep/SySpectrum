// backend/scripts/migrate.js
const fs = require('fs');
const path = require('path');
const db = require('../db/sqlite');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

async function runMigrations() {
  try {
    logger.info('🚀 Running database migrations...');

    // Load schema.sql
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute each SQL statement
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      db.prepare(stmt).run();
    }

    logger.info('✅ Tables created from schema.sql');

    // Ensure default admin user exists
    const existingAdmin = db.prepare(`SELECT * FROM users WHERE username = 'admin'`).get();
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`)
        .run('admin', hashedPassword, 'admin');
      logger.info('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      logger.info('ℹ️ Default admin user already exists.');
    }

    logger.info('✅ Database migrations completed successfully!');
  } catch (err) {
    logger.error('❌ Migration failed: ' + err.message);
    throw err; // Let index.js handle the error and exit
  }
}

module.exports = runMigrations;
