// backend/utils/logger.js
const winston = require('winston');
const path = require('path');

const logPath = path.join(__dirname, '../../backend.log');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: logPath }),
    new winston.transports.Console()
  ]
});

module.exports = logger;
