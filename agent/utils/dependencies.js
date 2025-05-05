const { runCommand } = require('./shell');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

function getPackageManager() {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 🛠️ getPackageManager() called`);

  let osRelease = '';
  try {
    if (fs.existsSync('/etc/os-release')) {
      osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    }
  } catch (err) {
    logger.warn(`[${traceId}] ⚠️ Failed to read /etc/os-release: ${err.message}`);
  }

  let manager = null;
  if (/debian|ubuntu/i.test(osRelease)) manager = 'apt';
  else if (/fedora|centos|rhel/i.test(osRelease)) manager = fs.existsSync('/usr/bin/dnf') ? 'dnf' : 'yum';
  else if (/alpine/i.test(osRelease)) manager = 'apk';
  else if (/arch/i.test(osRelease)) manager = 'pacman';

  logger.info(`[${traceId}] 📦 Detected package manager: ${manager || 'none'}`);
  logger.debug(`[${traceId}] ⏱️ getPackageManager() completed in ${Date.now() - start}ms`);
  return manager;
}

function installSystemPackage(pkgName) {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 🧩 installSystemPackage(${pkgName}) called`);

  const manager = getPackageManager();
  let cmd = null;

  switch (manager) {
    case 'apt':
      cmd = `sudo apt-get update && sudo apt-get install -y ${pkgName}`;
      break;
    case 'yum':
      cmd = `sudo yum install -y ${pkgName}`;
      break;
    case 'dnf':
      cmd = `sudo dnf install -y ${pkgName}`;
      break;
    case 'apk':
      cmd = `sudo apk add ${pkgName}`;
      break;
    case 'pacman':
      cmd = `sudo pacman -Sy --noconfirm ${pkgName}`;
      break;
    default:
      logger.warn(`[${traceId}] ❌ Unsupported system. Cannot install '${pkgName}'. Please install it manually.`);
      return;
  }

  logger.info(`[${traceId}] ⚙ Installing '${pkgName}' using ${manager}...`);
  const result = runCommand(cmd);
  if (!result) {
    logger.error(`[${traceId}] ❌ Failed to install '${pkgName}'.`);
  } else {
    logger.info(`[${traceId}] ✅ Installed '${pkgName}' successfully.`);
  }

  logger.debug(`[${traceId}] ⏱️ installSystemPackage() completed in ${Date.now() - start}ms`);
}

function ensureCommandInstalled(command, packageName = command) {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 🔍 ensureCommandInstalled(${command}, ${packageName}) called`);

  const isInstalled = runCommand(`command -v ${command}`);
  if (!isInstalled) {
    logger.warn(`[${traceId}] 🔧 '${command}' not found. Attempting to install '${packageName}'...`);
    installSystemPackage(packageName);
  } else {
    logger.info(`[${traceId}] ✔ '${command}' is already installed.`);
  }

  logger.debug(`[${traceId}] ⏱️ ensureCommandInstalled() completed in ${Date.now() - start}ms`);
}

function ensureNodeModules() {
  const traceId = uuidv4();
  const start = Date.now();
  logger.debug(`[${traceId}] 📦 ensureNodeModules() called`);

  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    logger.warn(`[${traceId}] ⚠️ No package.json found. Skipping Node module check.`);
    return;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const dependencies = Object.keys(pkg.dependencies || {});
    logger.debug(`[${traceId}] 📋 Found ${dependencies.length} dependencies to verify.`);

    dependencies.forEach(dep => {
      try {
        require.resolve(dep);
        logger.debug(`[${traceId}] ✔ '${dep}' is already resolved`);
      } catch {
        logger.warn(`[${traceId}] 📦 Missing Node module '${dep}', installing...`);
        const result = runCommand(`npm install ${dep}`);
        if (!result) {
          logger.error(`[${traceId}] ❌ Failed to install Node module '${dep}'.`);
        } else {
          logger.info(`[${traceId}] ✅ Installed Node module '${dep}'.`);
        }
      }
    });
  } catch (err) {
    logger.error(`[${traceId}] ❌ Failed to process dependencies: ${err.message}`, { stack: err.stack });
  }

  logger.debug(`[${traceId}] ⏱️ ensureNodeModules() completed in ${Date.now() - start}ms`);
}

function ensureDependencies() {
  const traceId = uuidv4();
  const start = Date.now();
  logger.info(`[${traceId}] 🧪 ensureDependencies() called`);

  ensureCommandInstalled('sensors', 'lm-sensors');
  ensureCommandInstalled('ps', 'procps');
  ensureNodeModules();

  logger.info(`[${traceId}] ✅ All dependencies verified`);
  logger.debug(`[${traceId}] ⏱️ ensureDependencies() completed in ${Date.now() - start}ms`);
}

module.exports = { ensureDependencies };
