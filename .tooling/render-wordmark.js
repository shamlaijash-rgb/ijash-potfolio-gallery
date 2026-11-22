/* Render the wordmark lockup so the redrawn mark can be checked by eye.
   Not part of the site build — a design check only. */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const SVG = fs.readFileSync(path.join(DIST, 'brand-wordmark.svg'), 'utf8');
const BODY = SVG.replace(/^<svg[^>]*>/, '').replace('</svg>', '');

const BG = '#080d13';    // header background in the cinematic layer
const SUB = '#aeb8bf';   // header subtitle colour
const PEACH = '#efae79';
const SUBTITLE = 'EXHIBITION &amp; 3D DESIGN PORTFOLIO';

const NATURAL = { w: 481, h: 80 };

function lockup({ markWidth, pad, labelSize, tracking, note }) {
  // The artwork is set in font units, so scale it to the rendered width.
  const scale = markWidth / NATURAL.w;
  const markHeight = NATURAL.h * scale;
  const w = Math.round(markWidth + pad * 2);
  const h = Math.round(pad * 2 + markHeight + labelSize * 2.2 + 46);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <g transform="translate(${pad} ${pad})">
    <g transform="scale(${scale})">${BODY}</g>
    <text y="${markHeight + labelSize * 1.7}" fill="${SUB}"
          font-family="Arial, Helvetica, sans-serif" font-size="${labelSize}"
          letter-spacing="${tracking}">${SUBTITLE}</text>
  </g>
  <text x="${pad}" y="${h - 18}" fill="#78848c" font-family="monospace" font-size="11"
        letter-spacing="1">${note}</text>
</svg>`;
}

const panels = [
  ['desktop', { markWidth: 249, pad: 30, labelSize: 9, tracking: 2, note: 'desktop header · mark 249px wide · cap height 22.9px (same as before)' }],
  ['mobile', { markWidth: 184, pad: 20, labelSize: 7, tracking: 1.25, note: 'mobile header · mark 184px wide' }]
];

const files = [];
for (const [name, options] of panels) {
  const file = `/home/user/preview-wordmark-${name}.png`;
  const png = new Resvg(lockup(options), { fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
  fs.writeFileSync(file, png);
  files.push([file, png.length]);
}
files.forEach(([file, size]) => console.log(file, size + ' bytes'));
