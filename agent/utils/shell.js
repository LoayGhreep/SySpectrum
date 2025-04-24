const { execSync } = require('child_process');
const logger = require('./logger');

function runCommand(cmd) {
    try {
      return execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch (e) {
      const errOutput = e.stderr ? e.stderr.toString().trim() : e.message;
      const logger = require('./logger');
      logger.warn(`⚠️ Shell command failed: ${cmd} → ${errOutput}`);
      return null;
    }
  }
  
module.exports = { runCommand };
