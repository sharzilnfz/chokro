const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (file.endsWith('.md')) {
      results.push(full);
    }
  });
  return results;
}

const files = ['AGENTS.md', 'CLAUDE.md', ...getFiles('docs')];
let errors = 0;
let checked = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Strip code blocks
  content = content.replace(/```[\s\S]*?```/g, '');
  const dir = path.dirname(f);
  const regex = /\[.*?\]\(((\.{1,2}\/|docs\/|\.\/)[^)#\s]+)(?:#[^)]*)?\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let link = match[1];
    checked++;
    let resolved;
    if (link.startsWith('docs/')) {
      resolved = path.resolve(process.cwd(), link);
    } else {
      resolved = path.resolve(dir, link);
    }
    if (!fs.existsSync(resolved)) {
      console.error('BROKEN LINK in ' + f + ' -> ' + link + ' (resolved: ' + resolved + ')');
      errors++;
    }
  }
});

console.log('Checked ' + checked + ' links across ' + files.length + ' markdown files.');
if (errors === 0) {
  console.log('SUCCESS: All internal markdown links are VALID!');
  process.exit(0);
} else {
  console.error('FAILED: Found ' + errors + ' broken links.');
  process.exit(1);
}
