const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '../dist');
const DIRS_TO_COPY = ['js', 'styles', 'assets'];
const FILES_TO_COPY = ['index.html', 'manifest.json', 'sw.js'];

// Clean build dir
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  }
}

// Copy DIRS
DIRS_TO_COPY.forEach(dir => {
  const dirPath = path.join(__dirname, '../', dir);
  if (fs.existsSync(dirPath)) {
    copyDir(dirPath, path.join(BUILD_DIR, dir));
  }
});

// Copy FILES
FILES_TO_COPY.forEach(file => {
  const filePath = path.join(__dirname, '../', file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(BUILD_DIR, file));
  }
});

console.log('Build completed to /dist');

// If --mobile flag passed, copy to native Capacitor containers
if (process.argv.includes('--mobile')) {
  console.log('Syncing assets to Capacitor mobile shell...');
  try {
    execSync('npx cap copy', { stdio: 'inherit' });
    console.log('Capacitor mobile sync complete.');
  } catch (err) {
    console.warn('Capacitor sync notice:', err.message);
  }
}