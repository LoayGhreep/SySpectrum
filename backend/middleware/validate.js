const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

function validate(maybeRules) {
  if (Array.isArray(maybeRules)) {
    logger.info(`[VALIDATE] Validation rules attached (${maybeRules.length} rules)`);

    return [
      ...maybeRules,
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          logger.warn(`[VALIDATE] Validation failed: ${JSON.stringify(errors.array())}`);
          return res.status(422).json({ errors: errors.array() });
        }
        logger.info(`[VALIDATE] Validation passed (rules applied)`);
        next();
      }
    ];
  }

  logger.info(`[VALIDATE] No rules passed, direct validation mode`);

  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`[VALIDATE] Validation failed: ${JSON.stringify(errors.array())}`);
      return res.status(422).json({ errors: errors.array() });
    }
    logger.info(`[VALIDATE] Validation passed (no rules)`);
    next();
  };
}

module.exports = validate;
