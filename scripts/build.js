const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../dist');
const DIRS_TO_COPY = ['js', 'styles'];
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
  if(fs.existsSync(path.join(__dirname, '../', dir))) {
    copyDir(path.join(__dirname, '../', dir), path.join(BUILD_DIR, dir));
  }
});

// Copy FILES
FILES_TO_COPY.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '../', file))) {
    fs.copyFileSync(path.join(__dirname, '../', file), path.join(BUILD_DIR, file));
  }
});

console.log('Build completed to /dist');