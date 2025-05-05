const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const SECRET = process.env.JWT_SECRET || 'dev_secret';

function auth(requiredRole = null) {
  return function (req, res, next) {
    const traceId = uuidv4();
    const start = Date.now();
    req.traceId = traceId;
    res.setHeader('X-Trace-ID', traceId);

    logger.debug(`[${traceId}] 🔐 auth middleware invoked | requiredRole=${requiredRole || 'any'}`);

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`[${traceId}] 🚫 Missing or malformed Authorization header`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const user = jwt.verify(token, SECRET);

      logger.debug(`[${traceId}] ✅ Token verified | user=${user.username}, role=${user.role}`);

      if (requiredRole && user.role !== requiredRole) {
        logger.warn(`[${traceId}] ⛔ Forbidden access for role=${user.role} | required=${requiredRole}`);
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.user = user;
      logger.debug(`[${traceId}] 🔓 Access granted | user=${user.username}`);
      next();
    } catch (err) {
      logger.error(`[${traceId}] ❌ Invalid token: ${err.message}`, { stack: err.stack });
      return res.status(401).json({ error: 'Invalid token' });
    } finally {
      logger.debug(`[${traceId}] ⏱️ auth middleware complete | duration=${Date.now() - start}ms`);
    }
  };
}

module.exports = auth;
