const { runCommand } = require('./shell');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('./logger');

// Determine OS type and preferred installer
function getPackageManager() {
  const osRelease = fs.existsSync('/etc/os-release')
    ? fs.readFileSync('/etc/os-release', 'utf8')
    : '';

  if (/debian|ubuntu/i.test(osRelease)) return 'apt';
  if (/fedora|centos|rhel/i.test(osRelease)) return fs.existsSync('/usr/bin/dnf') ? 'dnf' : 'yum';
  if (/alpine/i.test(osRelease)) return 'apk';
  if (/arch/i.test(osRelease)) return 'pacman';

  return null;
}

function installSystemPackage(pkgName) {
  const manager = getPackageManager();
  let cmd;

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
      logger.warn(`❌ Unsupported system. Cannot install '${pkgName}'. Please install it manually.`);
      return;
  }

  logger.warn(`⚙ Installing '${pkgName}' using ${manager}...`);
  const result = runCommand(cmd);
  if (!result) {
    logger.error(`❌ Failed to install '${pkgName}'.`);
  } else {
    logger.info(`✅ Installed '${pkgName}' successfully.`);
  }
}

function ensureCommandInstalled(command, packageName = command) {
  if (!runCommand(`command -v ${command}`)) {
    installSystemPackage(packageName);
  } else {
    logger.info(`✔ '${command}' is already installed.`);
  }
}

function ensureNodeModules() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    logger.warn('⚠️ No package.json found. Skipping Node module check.');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const dependencies = Object.keys(pkg.dependencies || {});

  dependencies.forEach(dep => {
    try {
      require.resolve(dep);
    } catch {
      logger.warn(`📦 Missing Node module '${dep}', installing...`);
      const result = runCommand(`npm install ${dep}`);
      if (!result) {
        logger.error(`❌ Failed to install Node module '${dep}'.`);
      } else {
        logger.info(`✅ Installed Node module '${dep}'.`);
      }
    }
  });
}

function ensureDependencies() {
  ensureCommandInstalled('sensors', 'lm-sensors');
  ensureCommandInstalled('ps', 'procps'); // should always exist, but safe fallback
  ensureNodeModules();
}

module.exports = { ensureDependencies };
