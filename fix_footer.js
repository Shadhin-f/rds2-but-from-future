const fs = require('fs');
const path = require('path');

const dir = 'e:/git-respositories/rds2-but-from-future';
const files = fs.readdirSync(dir);

let count = 0;

for (const file of files) {
  if (file.endsWith('.html')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    const originalContent = content;
    content = content.replace(/\ufffd\s*&copy;/g, '&copy;');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      count++;
      console.log(`Cleaned up broken characters in ${file}`);
    }
  }
}

console.log(`Done. Updated ${count} files.`);
