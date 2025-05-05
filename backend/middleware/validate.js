const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function validate(maybeRules) {
  const traceId = uuidv4();

  if (Array.isArray(maybeRules)) {
    logger.debug(`[${traceId}] 🧪 Validation middleware initialized with ${maybeRules.length} rules`);

    return [
      ...maybeRules,
      (req, res, next) => {
        const start = Date.now();
        logger.debug(`[${traceId}] 📝 Running validation on ${req.method} ${req.originalUrl}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const errorArray = errors.array();
          logger.warn(`[${traceId}] ❌ Validation failed: ${JSON.stringify(errorArray)}`);
          return res.status(422).json({ errors: errorArray });
        }

        logger.info(`[${traceId}] ✅ Validation passed`);
        logger.debug(`[${traceId}] ⏱️ Validation duration: ${Date.now() - start}ms`);
        next();
      }
    ];
  }

  logger.debug(`[${traceId}] 🧪 Validation middleware initialized without rules`);

  return (req, res, next) => {
    const start = Date.now();
    logger.debug(`[${traceId}] 📝 Running direct validation on ${req.method} ${req.originalUrl}`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      logger.warn(`[${traceId}] ❌ Direct validation failed: ${JSON.stringify(errorArray)}`);
      return res.status(422).json({ errors: errorArray });
    }

    logger.info(`[${traceId}] ✅ Direct validation passed`);
    logger.debug(`[${traceId}] ⏱️ Direct validation duration: ${Date.now() - start}ms`);
    next();
  };
}

module.exports = validate;
