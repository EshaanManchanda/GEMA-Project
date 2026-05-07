const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const docDir = path.join(__dirname, 'doc');
const pdfDir = path.join(docDir, 'pdf');

if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

function findMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'pdf' && !file.startsWith('.') && file !== 'node_modules') {
        findMdFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const mdFiles = findMdFiles(docDir);
console.log(`Found ${mdFiles.length} markdown files to convert.`);

let successCount = 0;
let failCount = 0;

for (const mdFile of mdFiles) {
  const relPath = path.relative(docDir, mdFile);
  const pdfPath = path.join(pdfDir, relPath.replace(/\.md$/, '.pdf'));
  
  const pdfFileDir = path.dirname(pdfPath);
  if (!fs.existsSync(pdfFileDir)) {
    fs.mkdirSync(pdfFileDir, { recursive: true });
  }

  console.log(`Converting ${relPath}...`);
  try {
    // using markdown-pdf for quick conversion
    execSync(`npx --yes markdown-pdf "${mdFile}" -o "${pdfPath}"`, { stdio: 'inherit' });
    successCount++;
  } catch (err) {
    console.error(`Failed to convert ${mdFile}`);
    failCount++;
  }
}

console.log(`\nConversion complete. Success: ${successCount}, Failed: ${failCount}`);
