const { execSync } = require('child_process');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

function runCommand(cmd) {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 🛠️ runCommand() called with: "${cmd}"`);

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const duration = Date.now() - start;
    logger.info(`[${traceId}] ✅ Command succeeded: "${cmd}"`);
    logger.debug(`[${traceId}] ⏱️ Duration: ${duration}ms`);
    logger.debug(`[${traceId}] 📤 Output: "${result.split('\n')[0]}${result.length > 100 ? ' ...' : ''}"`);

    return result;
  } catch (e) {
    const errOutput = e.stderr ? e.stderr.toString().trim() : e.message;
    logger.error(`[${traceId}] ❌ Command failed: "${cmd}"`);
    logger.error(`[${traceId}] 🧨 Error: ${errOutput}`, { stack: e.stack });
    return null;
  }
}

module.exports = { runCommand };
