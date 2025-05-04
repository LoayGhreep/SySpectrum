const fs = require('fs');
const path = require('path');

const agentPath = path.join(__dirname, '..', 'agent.json');

function loadAgentData() {
  try {
    if (fs.existsSync(agentPath)) {
      const raw = fs.readFileSync(agentPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('⚠️ Failed to load agent.json:', err.message);
  }
  return null;
}

function saveAgentData(data) {
  try {
    fs.writeFileSync(agentPath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Failed to write agent.json:', err.message);
    return false;
  }
}

module.exports = {
  loadAgentData,
  saveAgentData,
  agentPath
};
