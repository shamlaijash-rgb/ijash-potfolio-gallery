/* Rebuild the brand wordmark for the new name, in the same typeface,
   tracking and baseline as the shipped artwork.
 *
 * The original "IJ DESIGNZ" file sets each glyph at translate(x, 66) with
 * scale 0.06. Reverse-engineering those pen positions shows:
 *   tracking  = 33.333 font units between letters
 *   word gap  = a 300-unit advance, with no tracking added
 * The script asserts it reproduces every original pen position before it
 * writes anything, so the new mark sits on the same baseline and cap height.
 */
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const FONT = path.join(DIST, 'fonts', 'URWGothic-Demi.otf');
const SVG = path.join(DIST, 'brand-wordmark.svg');

const buffer = fs.readFileSync(FONT);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const glyph = (ch) => font.charToGlyph(ch);

const SCALE = 0.06;
const BASELINE = 66;
const PEN_START = 5.0;
const TRACKING = 33.3333;
const SPACE = 300;
const INK = '#f5f1e7';
const PEACH = '#efae79';
const NAME = process.argv[2] || 'IJASHUL HAQUE';

/* Reference: the artwork currently shipped, used as the metric test. */
const REFERENCE = {
  text: 'IJ DESIGNZ',
  pens: [5.0, 23.8, 72.6, 116.6, 149.8, 183.0, 201.8, 254.2, 300.6]
};

function layout(text) {
  const run = [];
  let pen = PEN_START;
  for (const ch of text) {
    if (ch === ' ') {
      pen += SPACE * SCALE; // the word gap is set as a 300-unit advance with no extra tracking
      continue;
    }
    const g = glyph(ch);
    run.push({ ch, pen, path: g.path, advance: g.advanceWidth });
    pen += (g.advanceWidth + TRACKING) * SCALE;
  }
  return run;
}

/* ---- verify the model against the shipped file ---- */
const check = layout(REFERENCE.text);
if (check.length !== REFERENCE.pens.length) throw new Error('glyph count mismatch');
let worst = 0;
check.forEach((item, i) => { worst = Math.max(worst, Math.abs(item.pen - REFERENCE.pens[i])); });
console.log('reference pens reproduced, worst drift:', worst.toFixed(4), 'px', worst < 0.05 ? '✓' : '✗');
if (worst >= 0.05) throw new Error('metric model does not match the shipped artwork');

/* ---- build the new mark ---- */
const run = layout(NAME);
const inkLeft = Math.min(...run.map((g) => g.pen + g.path.getBoundingBox().x1 * SCALE));
const inkRight = Math.max(...run.map((g) => g.pen + g.path.getBoundingBox().x2 * SCALE));
const RIGHT_PAD = 336 - (REFERENCE.pens[8] + 480 * SCALE); // keep the original right margin
const width = Math.ceil(inkRight + RIGHT_PAD);

const last = run[run.length - 1];
const body = run.map((g) => {
  const d = g.path.toPathData(0);
  const translate = g.pen.toFixed(3);
  const fill = g === last ? PEACH : INK;
  return `<path fill="${fill}" transform="translate(${translate} ${BASELINE}) scale(${SCALE.toFixed(7)} -${SCALE.toFixed(7)})" d="${d}"/>`;
}).join('');

const label = NAME.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
fs.writeFileSync(SVG, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 80" role="img"><title>${label}</title>${body}</svg>\n`);

const oldWidth = 336, ratio = width / oldWidth;
console.log('\nwrote', path.relative(process.cwd(), SVG));
console.log('name:        ', NAME);
console.log('viewBox:     0 0', width, '80   (was 0 0 336 80)');
console.log('ink extent:  ', inkLeft.toFixed(2), '→', inkRight.toFixed(2), ' (right margin', RIGHT_PAD.toFixed(1) + ')');
console.log('cap height:  ', (739 * SCALE).toFixed(2), 'px in both files — unchanged');
console.log('aspect ratio:', (width / 80).toFixed(3), 'was', (oldWidth / 80).toFixed(3));
console.log('\nheader widths to keep the rendered cap height identical (× ' + ratio.toFixed(3) + '):');
[['brand-type.css default', 224], ['editorial-redesign', 188], ['cinematic-gallery desktop', 174],
 ['cinematic-gallery mobile', 150], ['portfolio-polish mobile', 166], ['editorial mobile', 158],
 ['brand-type mobile', 190]].forEach(([where, px]) => {
  console.log(`  ${where.padEnd(28)} ${String(px).padStart(4)} → ${Math.round(px * ratio)}px`);
});
