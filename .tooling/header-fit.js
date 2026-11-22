/* Report the header row maths at each breakpoint using the widths the
   stylesheets actually resolve to for the wordmark. */
const fs = require('fs');
const MARK_ASPECT = 481 / 80;      // new artwork
const SUBTITLE = 'EVENT · 3D DESIGN';
const TOGGLE = { text: 'Menu +', padding: 26, font: 12 };  // .site-menu-toggle
const NAV_ITEMS = ['Work', 'Designer', 'Studio lab', "Let's talk ↗"];

const widths = [['desktop >980', 249], ['980-761', 249], ['760-431', 215], ['430-361', 178], ['<=360', 178]];
console.log('wordmark widths resolved for body.portfolio-editorial.portfolio-cinema:');
for (const [bp, w] of widths) {
  console.log(`  ${bp.padEnd(14)} mark ${w}px  (height ${(w / MARK_ASPECT).toFixed(1)}px, cap height ${(w / 481 * 44.34).toFixed(1)}px)`);
}
console.log('\nheader row at 390px viewport (mobile):');
const viewport = 390, pad = 18, mark = 178, toggle = TOGGLE.text.length * 7 + TOGGLE.padding;
console.log(`  padding ${pad}*2 + mark ${mark} + toggle ${toggle} = ${pad * 2 + mark + toggle}px of ${viewport}px`,
  pad * 2 + mark + toggle <= viewport ? '✓ fits on one row' : '✗ wraps');
console.log('\nheader row at 360px viewport:');
console.log(`  ${pad * 2 + mark + toggle}px of 360px`, pad * 2 + mark + toggle <= 360 ? '✓ fits' : '✗ too tight');
console.log('\nheader row at 1440px viewport (nav + mark):');
const nav = NAV_ITEMS.reduce((n, t) => n + t.length * 6.2 + 28, 0);
console.log(`  padding 56*2 + mark 249 + nav ${Math.round(nav)} = ${Math.round(56 * 2 + 249 + nav)}px of 1440px`,
  56 * 2 + 249 + nav <= 1440 ? '✓ fits' : '✗ overflow');
