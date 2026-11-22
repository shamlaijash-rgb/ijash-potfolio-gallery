const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.otf':'font/otf','.png':'image/png','.mjs':'text/javascript' };
const server = http.createServer((req,res)=>{ let f=path.join(root,decodeURIComponent(req.url.split('?')[0])); if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html'); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });

const css = fs.readFileSync(path.join(root, 'motion-studio.css'), 'utf8');

function ruleFor(selector) {
  // Exact selector match: the selector must be followed by "{" or ",",
  // otherwise ".ij-w" would match inside ".ij-wi".
  const pattern = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]');
  const found = pattern.exec(css);
  if (!found) return null;
  const open = css.indexOf('{', found.index);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close).replace(/\s+/g, ' ').trim();
}

server.listen(8274,'127.0.0.1', async () => {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = await JSDOM.fromURL('http://127.0.0.1:8274/', {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      w.matchMedia = q => ({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.fetch = (i,o)=>fetch(new URL(i,w.location.href).href,o);
      w.HTMLCanvasElement.prototype.getContext = () => null;   // no WebGL: the <img> is the visible media
      w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){setTimeout(()=>this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this),0);} unobserve(){} disconnect(){} };
      w.Element.prototype.getBoundingClientRect = function(){ return {x:0,y:0,top:0,left:0,right:240,bottom:48,width:240,height:48,toJSON(){return this;}}; };
      w.AudioContext = class { constructor(){this.currentTime=0;this.state='running';this.destination={};} createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};} createBiquadFilter(){return {type:'',frequency:{value:0},connect(){}};} createOscillator(){return {type:'',frequency:{value:0},detune:{value:0},connect(){},start(){},stop(){}};} resume(){return Promise.resolve();} suspend(){return Promise.resolve();} };
    }
  });
  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
  await sleep(1500);
  const doc = dom.window.document, win = dom.window;

  console.log('--- overlay in the scene ---');
  const art = doc.querySelector('.opening-art');
  const entry = doc.querySelector('.ij-hero-entry');
  console.log('  .opening-art found:', !!art);
  console.log('  .ij-hero-entry injected:', !!entry);
  console.log('  is the last child of the scene:', !!entry && art.lastElementChild === entry);
  console.log('  aria-hidden:', entry && entry.getAttribute('aria-hidden'));
  console.log('  scene children:', [...art.children].map((c) => c.tagName.toLowerCase() + (c.className ? '.' + String(c.className).split(' ')[0] : '')).join(', '));
  console.log('  pointing-events none (computed):', entry && win.getComputedStyle(entry).pointerEvents);
  console.log('  z-index (computed):', entry && win.getComputedStyle(entry).zIndex);
  console.log('  opacity (computed):', entry && win.getComputedStyle(entry).opacity);

  console.log('--- media the settle applies to ---');
  const img = art.querySelector(':scope > img');
  const canvas = art.querySelector(':scope > .hero-people');
  console.log('  img present:', !!img, '| canvas present:', !!canvas, '(no WebGL in jsdom, so the image is the visible media)');
  console.log('  img animation-name:', img && win.getComputedStyle(img).animationName);
  console.log('  img animation-delay:', img && win.getComputedStyle(img).animationDelay);
  console.log('  img animation-duration:', img && win.getComputedStyle(img).animationDuration);

  console.log('--- headline focus pull ---');
  const heading = doc.querySelector('.opening-copy h1');
  const words = [...doc.querySelectorAll('.opening-copy h1 .ij-w')];
  console.log('  hero words wrapped:', heading.classList.contains('ij-words-ready'), '| count:', words.length);
  console.log('  first word animation:', words[0] && win.getComputedStyle(words[0]).animationName);
  console.log('  first word --ij-i:', words[0] && words[0].style.getPropertyValue('--ij-i'));
  console.log('  hero base:', heading.style.getPropertyValue('--ij-hero-base') || '(unset)');

  console.log('--- stylesheet rules (timings) ---');
  ['body.ij-anim .ij-hero-entry::before','body.ij-anim .ij-hero-entry::after','body.ij-anim .opening-art > img','body.ij-anim .opening-copy h1.ij-words-ready .ij-w','body.ij-anim header:not(.ij-hide)','body.ij-entry-done .opening-art > img'].forEach((sel) => {
    const rule = ruleFor(sel);
    console.log('  ' + sel);
    console.log('     ' + (rule === null ? 'MISSING' : rule));
  });
  const keyframes = ['ij-house-lights','ij-hero-sweep','ij-hero-settle','ij-word-focus','ij-header-in'];
  console.log('  keyframes defined:', keyframes.filter((k) => css.includes('@keyframes ' + k + ' {')).join(', '), '/ ' + keyframes.length);

  console.log('--- safety release ---');
  console.log('  body.ij-entry-done at 1.5s (should be false):', doc.body.classList.contains('ij-entry-done'));
  let releasedAt = null;
  const started = Date.now();
  while (Date.now() - started < 9000) {
    if (doc.body.classList.contains('ij-entry-done')) { releasedAt = Date.now() - started + 1500; break; }
    await sleep(100);
  }
  console.log('  body.ij-entry-done appeared at ~' + (releasedAt === null ? 'NEVER (within 9s)' : releasedAt + 'ms'));
  const entryAfter = doc.querySelector('.ij-hero-entry');
  console.log('  overlay hidden after release (computed display):', entryAfter && win.getComputedStyle(entryAfter).display);

  console.log('--- nothing left hidden in the hero ---');
  console.log('  hero heading visible:', win.getComputedStyle(heading).opacity, '(words carry no inline opacity)');
  console.log('  eyebrow present:', !!doc.querySelector('.opening-copy .eyebrow'));
  console.log('  scene-motion control present:', !!doc.querySelector('.scene-motion'));
  console.log('  header not hidden:', !doc.querySelector('header').classList.contains('ij-hide'));

  console.log('--- errors ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  server.close(); dom.window.close(); process.exit(0);
});
