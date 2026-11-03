const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const output = path.join(root, 'www');
const files = ['index.html', 'styles.css', 'extra.css', 'app.js', 'platforms.js', 'manifest.json', 'service-worker.js', 'icon.svg'];

fs.mkdirSync(output, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(output, file));
console.log(`Archivos móviles preparados en ${output}`);
