const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

const agentPath = path.join(__dirname, '..', 'agent.json');

function loadAgentData() {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 📥 loadAgentData() called`);

  try {
    if (fs.existsSync(agentPath)) {
      logger.debug(`[${traceId}] ✅ agent.json exists at ${agentPath}`);
      const raw = fs.readFileSync(agentPath, 'utf-8');
      const parsed = JSON.parse(raw);
      logger.info(`[${traceId}] ✅ Agent data loaded successfully`);
      logger.debug(`[${traceId}] ⏱️ loadAgentData() completed in ${Date.now() - start}ms`);
      return parsed;
    } else {
      logger.warn(`[${traceId}] ⚠️ agent.json does not exist at ${agentPath}`);
    }
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to load agent.json: ${err.message}`, { stack: err.stack });
  }

  logger.debug(`[${traceId}] ⏱️ loadAgentData() completed in ${Date.now() - start}ms`);
  return null;
}

function saveAgentData(data) {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 💾 saveAgentData() called`);

  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(agentPath, jsonString);
    logger.info(`[${traceId}] ✅ agent.json written successfully at ${agentPath}`);
    logger.debug(`[${traceId}] ⏱️ saveAgentData() completed in ${Date.now() - start}ms`);
    return true;
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to write agent.json: ${err.message}`, { stack: err.stack });
    return false;
  }
}

module.exports = {
  loadAgentData,
  saveAgentData,
  agentPath
};
