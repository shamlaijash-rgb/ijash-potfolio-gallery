const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.otf':'font/otf','.png':'image/png','.mjs':'text/javascript' };
const server = http.createServer((req,res)=>{ let f=path.join(root,decodeURIComponent(req.url.split('?')[0])); if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html'); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });

server.listen(8272,'127.0.0.1', async () => {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = await JSDOM.fromURL('http://127.0.0.1:8272/', {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      w.matchMedia = q => ({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.fetch = (i,o)=>fetch(new URL(i,w.location.href).href,o);
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){setTimeout(()=>this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this),0);} unobserve(){} disconnect(){} };
      w.Element.prototype.getBoundingClientRect = function(){ return {x:0,y:0,top:0,left:0,right:240,bottom:48,width:240,height:48,toJSON(){return this;}}; };
      // jsdom has no Web Audio; a stub lets the toggle logic be exercised.
      w.AudioContext = class {
        constructor(){ this.currentTime = 0; this.state = 'running'; this.destination = {}; }
        createGain(){ return { gain:{ value:1, cancelScheduledValues(){}, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }
        createBiquadFilter(){ return { type:'', frequency:{ value:0 }, connect(){} }; }
        createOscillator(){ return { type:'', frequency:{value:0}, detune:{value:0}, connect(){}, start(){}, stop(){} }; }
        resume(){ return Promise.resolve(); }
        suspend(){ return Promise.resolve(); }
      };
    }
  });
  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
  const until = async (fn, ms=8000) => { const t=Date.now(); for(;;){ const v=fn(); if(v) return v; if(Date.now()-t>ms) return null; await sleep(60);} };
  await sleep(1600);
  const doc = dom.window.document, win = dom.window;

  console.log('--- split display type ---');
  const splits = [...doc.querySelectorAll('.ij-split')];
  console.log('split headings:', splits.length);
  splits.forEach((el) => {
    const words = el.querySelectorAll('.ij-sw');
    const lines = new Set([...words].map((w) => w.style.getPropertyValue('--ij-line')));
    const dirty = [...words].some((w) => w.textContent.includes('<'));
    console.log(`  ${el.tagName} "${el.textContent.trim().slice(0,46)}" words=${words.length} lines=${lines.size} in=${el.classList.contains('ij-in')} marks=${dirty}`);
  });

  console.log('--- atmosphere ---');
  console.log('  #scroll-atmosphere exists:', !!doc.querySelector('#scroll-atmosphere'));
  console.log('  .ij-grain exists:', !!doc.querySelector('.ij-grain'));

  console.log('--- band ---');
  const band = await until(()=>doc.querySelector('.ij-band'));
  if (!band) console.log('  MISSING');
  else {
    await sleep(1400); // let the counters finish before reading them
    console.log('  stats:', [...band.querySelectorAll('.ij-stat')].map((s) => s.textContent).join(' | '));
    const groups = band.querySelectorAll('.ij-marquee-group');
    console.log('  marquee groups:', groups.length, '(must be 2 and identical)');
    if (groups.length === 2) console.log('  identical:', groups[0].outerHTML === groups[1].outerHTML);
    console.log('  first group:', groups[0] ? groups[0].textContent.trim().slice(0,90) : 'none');
    console.log('  position before #about:', band.nextElementSibling && band.nextElementSibling.id);
  }

  console.log('--- rail ---');
  const rail = doc.querySelector('.ij-rail');
  console.log('  rail exists:', !!rail, 'buttons:', rail ? rail.querySelectorAll('button').length : 0);
  if (rail) console.log('  current:', [...rail.querySelectorAll('button')].filter((b)=>b.classList.contains('is-current')).map((b)=>b.textContent).join(', ') || 'none');

  console.log('--- sound ---');
  const sound = doc.querySelector('.ij-sound');
  console.log('  button exists:', !!sound, 'pressed:', sound && sound.getAttribute('aria-pressed'));
  if (sound) {
    sound.dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
    await sleep(60);
    console.log('  after click pressed:', sound.getAttribute('aria-pressed'), '| label:', sound.getAttribute('aria-label'));
    console.log('  sessionStorage:', win.sessionStorage.getItem('ij-sound'));
    sound.dispatchEvent(new win.MouseEvent('click', { bubbles:true }));
    await sleep(60);
    console.log('  after second click pressed:', sound.getAttribute('aria-pressed'), '| storage:', win.sessionStorage.getItem('ij-sound'));
  }

  console.log('--- visibility fail-safes ---');
  const words = [...doc.querySelectorAll('.ij-sw')];
  console.log('  split words total:', words.length, '| headings visible (ij-in):', splits.filter((s)=>s.classList.contains('ij-in')).length + '/' + splits.length);
  console.log('--- errors ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  server.close(); dom.window.close(); process.exit(0);
});
