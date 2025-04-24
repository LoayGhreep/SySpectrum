const winston = require('winston');
const path = require('path');
const config = require('../config');

const logPath = path.join(__dirname, '..', config.logFile);
const logLV = config.logLevel;

const logger = winston.createLogger({
  level: logLV,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: logPath }),
    new winston.transports.Console() // Optional: keep for dev
  ]
});

module.exports = logger;
