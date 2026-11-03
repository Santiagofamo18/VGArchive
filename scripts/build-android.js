const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: isWindows });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(process.execPath, [path.join(__dirname, 'copy-mobile-assets.js')]);
if (!fs.existsSync(path.join(root, 'android'))) run('pnpm', ['exec', 'cap', 'add', 'android']);
run('pnpm', ['exec', 'cap', 'sync', 'android']);
const gradle = isWindows ? 'gradlew.bat' : './gradlew';
run(gradle, ['assembleDebug'], path.join(root, 'android'));
console.log(`APK generado en ${path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`);
