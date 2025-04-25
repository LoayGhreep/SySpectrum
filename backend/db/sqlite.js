const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../syspectrum.db');

const db = new Database(dbPath);

logger.info(`📦 SQLite DB loaded from ${dbPath}`);
module.exports = db;
