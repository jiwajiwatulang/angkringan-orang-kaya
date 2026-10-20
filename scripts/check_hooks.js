const fs = require('fs');

const content = fs.readFileSync('src/app/owner/page.tsx', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
  const match = line.match(/\buse[A-Z]\w*/);
  if (match) {
    console.log(`Line ${idx + 1}: ${match[0]} -> ${line.trim()}`);
  }
});
