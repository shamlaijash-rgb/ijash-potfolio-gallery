const opentype = require('opentype.js');
const fs = require('fs'), path = require('path');
const DIST = path.resolve(__dirname, '..', 'dist');
const buf = fs.readFileSync(path.join(DIST, 'fonts', 'URWGothic-Demi.otf'));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const SHIPPED = {
  I: 'M68 0H205V739H68Z',
  J: 'M277 739V216C277 151 255 119 211 119C177 119 155 138 146 175H9C15 117 26 87 56 54C94 11 152 -13 214 -13C338 -13 414 73 414 212V739Z',
  D: 'M68 0H240C352 0 419 11 479 41C593 97 660 219 660 368C660 509 602 624 499 686C441 721 353 739 237 739H68ZM205 131V608H232C320 608 366 600 409 578C479 542 522 463 522 368C522 279 481 200 415 164C374 142 317 131 235 131Z',
};
console.log('--- glyph outline match (font vs shipped svg) ---');
for (const [ch, shipped] of Object.entries(SHIPPED)) {
  const mine = font.charToGlyph(ch).path.toPathData(0);
  console.log(ch, 'advance=', font.charToGlyph(ch).advanceWidth, '| identical:', mine === shipped);
  if (mine !== shipped) console.log('   font   :', mine.slice(0, 90), '\n   shipped:', shipped.slice(0, 90));
}
console.log('\n--- advances used by the shipped artwork vs font advances ---');
const NAME = 'IJ DESIGNZ', PENS = [5, 23.8, 72.6, 116.6, 149.8, 183, 201.8, 254.2, 300.6], S = 0.06;
for (let i = 0; i < PENS.length; i++) {
  const ch = NAME[i];
  const ink = font.charToGlyph(ch).getBoundingBox();
  const step = i < PENS.length - 1 ? (PENS[i + 1] - PENS[i]) / S : null;
  console.log(`${ch}  font advance ${String(font.charToGlyph(ch).advanceWidth).padStart(4)}  ink ${ink.x1.toFixed(0)}..${ink.x2.toFixed(0)}  |  shipped step ${step === null ? '—' : step.toFixed(1)}`);
}
