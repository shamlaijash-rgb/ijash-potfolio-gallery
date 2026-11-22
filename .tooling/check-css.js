const fs = require('fs');
const csstree = require('css-tree');
const files = process.argv.slice(2);
let bad = 0;
for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  const errors = [];
  csstree.parse(css, {
    positions: true,
    onParseError(err) { errors.push(`${err.line}:${err.column} ${err.message}`); }
  });
  if (errors.length) { bad++; console.log('✗', file, '\n  ' + errors.slice(0, 12).join('\n  ')); }
  else console.log('✓', file);
}
process.exit(bad ? 1 : 0);
