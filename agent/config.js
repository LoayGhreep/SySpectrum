module.exports = {
  backendUrl: 'http://localhost:8080/api/telemetry',
  pushInterval: 10000, // every 10 seconds
  heartbeatInterval: 5000, // heartbeat every 5s
  logFile: 'app.log',
  logLevel: 'info',
  version: '1.0.0',
  machineIdPath: '/etc/machine-id' // default for most distros
};
