/* Cascade audit: list every rule that touches the properties this layer
   animates, for the elements it animates, in stylesheet load order. */
const fs = require('fs');
const path = require('path');
const csstree = require('css-tree');

const ORDER = ['style.css','theme.css','professional.css','blueprint.css','illustrated.css','event-lab.css','seo.css','brand-type.css','portfolio-polish.css','creative-motion.css','editorial-redesign.css','cinematic-gallery.css','motion-studio.css'];
const PROPS = new Set(['transform','translate','scale','rotate','opacity','filter','clip-path','transition','animation','will-change','visibility','position','display','overflow','mask-image','-webkit-mask-image','aspect-ratio','transition-delay','animation-delay','animation-play-state','animation-duration','animation-iteration-count']);
const TARGETS = process.argv.slice(2);
if (!TARGETS.length) { console.log('usage: node cascade-audit.js .case-image .project-arrow'); process.exit(0); }

function specificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) || []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(\([^)]*\))?/g) || []).length;
  const types = (selector.replace(/[#.][\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, ' ').match(/[a-zA-Z][\w-]*/g) || []).length;
  return ids * 100 + classes * 10 + types;
}

const rows = [];
for (const file of ORDER) {
  const full = path.join('dist', file);
  if (!fs.existsSync(full)) continue;
  const ast = csstree.parse(fs.readFileSync(full, 'utf8'));
  csstree.walk(ast, {
    visit: 'Rule', enter(node) {
      const selector = csstree.generate(node.prelude);
      if (!TARGETS.some((target) => selector.includes(target))) return;
      const decls = [];
      node.block.children.forEach((decl) => {
        if (decl.type !== 'Declaration') return;
        if (PROPS.has(decl.property.toLowerCase())) decls.push(`${decl.property}:${csstree.generate(decl.value).slice(0, 64)}`);
      });
      if (decls.length) rows.push({ file, selector, spec: specificity(selector), decls });
    }
  });
}
for (const row of rows) {
  console.log(`${row.file} [${row.spec}] ${row.selector}\n    ${row.decls.join('\n    ')}`);
}
