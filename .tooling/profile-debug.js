const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.otf':'font/otf','.png':'image/png','.mjs':'text/javascript' };
const server = http.createServer((req,res)=>{ let f=path.join(root,decodeURIComponent(req.url.split('?')[0])); if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html'); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });

server.listen(8273,'127.0.0.1', async () => {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = await JSDOM.fromURL('http://127.0.0.1:8273/', {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      w.matchMedia = q => ({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.fetch = (i,o)=>fetch(new URL(i,w.location.href).href,o);
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){setTimeout(()=>this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this),0);} unobserve(){} disconnect(){} };
      w.Element.prototype.getBoundingClientRect = function(){ return {x:0,y:0,top:0,left:0,right:240,bottom:48,width:240,height:48,toJSON(){return this;}}; };
      w.AudioContext = class { constructor(){this.currentTime=0;this.state='running';this.destination={};} createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};} createBiquadFilter(){return {type:'',frequency:{value:0},connect(){}};} createOscillator(){return {type:'',frequency:{value:0},detune:{value:0},connect(){},start(){},stop(){}};} resume(){return Promise.resolve();} suspend(){return Promise.resolve();} };
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
    }
  });
  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
  await sleep(1800);
  const doc = dom.window.document, win = dom.window;
  const q = (sel) => doc.querySelector(sel);
  const qa = (sel) => [...doc.querySelectorAll(sel)];

  console.log('--- layout ---');
  const work = q('#work');
  console.log('  #work has .ij-profile:', work.classList.contains('ij-profile'));
  console.log('  rail is the first child:', work.firstElementChild && work.firstElementChild.className);
  console.log('  non-rail children:', [...work.children].filter(c=>!c.classList.contains('ij-profile-rail')).map(c=>c.className||c.tagName).join(', '));

  console.log('--- rail content ---');
  console.log('  mark image:', q('.ij-rail-mark img') ? q('.ij-rail-mark img').getAttribute('src') : 'MISSING');
  console.log('  name:', q('.ij-profile-name') && q('.ij-profile-name').textContent);
  console.log('  role:', q('.ij-role') && q('.ij-role').textContent);
  console.log('  facts:', qa('.ij-fact').map(f=>f.textContent).join(' | '));
  console.log('  focus items:', qa('.ij-rail-focus li').map(l=>l.textContent).join(' / '));
  console.log('  actions:', qa('.ij-rail-actions a').map(a=>a.textContent+' → '+a.getAttribute('href').slice(0,52)).join(' | '));

  console.log('--- rows ---');
  const rows = () => qa('#project-grid .project');
  console.log('  rows:', rows().length);
  console.log('  rows enriched:', rows().filter(r=>r.dataset.ijRow==='set').length);
  console.log('  rows with description:', qa('#project-grid .ij-row-desc').length);
  console.log('  rows with meta:', qa('#project-grid .ij-row-meta').length);
  const first = rows()[0];
  console.log('  first row title:', first.querySelector('h3').textContent);
  console.log('  first row subtitle:', first.querySelector('.project-info p').textContent.slice(0,60));
  console.log('  first row desc:', (first.querySelector('.ij-row-desc')||{textContent:'MISSING'}).textContent.slice(0,80));
  console.log('  first row meta:', (first.querySelector('.ij-row-meta')||{textContent:'MISSING'}).textContent);

  console.log('--- mosaic shapes ---');
  console.log('  #work has ij-mosaic:', work.classList.contains('ij-mosaic'));
  const shapes = rows().map((r) => (r.className.match(/ij-shape-\w+/) || ['—'])[0]);
  const tally = shapes.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  console.log('  shape tally:', JSON.stringify(tally));
  console.log('  first six:', rows().slice(0,6).map((r) => r.dataset.id + '=' + (r.className.match(/ij-shape-\w+/) || ['—'])[0]).join(', '));
  const beforeShapes = new Map(rows().map((r) => [r.dataset.id, (r.className.match(/ij-shape-\w+/) || ['—'])[0]]));

  console.log('--- layout switch ---');
  const switchBtns = qa('.ij-layout-switch button');
  console.log('  buttons:', switchBtns.map((b) => b.textContent + '(' + b.getAttribute('aria-pressed') + ')').join(' '));
  const rowsBtn = switchBtns.find((b) => /Rows/i.test(b.textContent));
  const mosaicBtn = switchBtns.find((b) => /Mosaic/i.test(b.textContent));
  rowsBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await sleep(80);
  console.log('  after Rows: ij-mosaic=' + work.classList.contains('ij-mosaic'), '| pressed=' + rowsBtn.getAttribute('aria-pressed') + '/' + mosaicBtn.getAttribute('aria-pressed'), '| stored=' + win.sessionStorage.getItem('ij-layout'));
  mosaicBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await sleep(80);
  console.log('  after Mosaic: ij-mosaic=' + work.classList.contains('ij-mosaic'), '| pressed=' + rowsBtn.getAttribute('aria-pressed') + '/' + mosaicBtn.getAttribute('aria-pressed'), '| stored=' + win.sessionStorage.getItem('ij-layout'));

  console.log('--- filtering still works ---');
  const chips = qa('#work .filters button');
  const target = chips.find(b=>/Trophies/i.test(b.textContent)) || chips[1];
  target.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  await sleep(320);
  console.log('  clicked chip:', target.textContent.trim());
  console.log('  rows after filter:', rows().length);
  console.log('  rows still enriched:', rows().filter(r=>r.dataset.ijRow==='set').length);
  console.log('  count text:', q('#count') && q('#count').textContent);
  const all = chips.find(b=>/^All/i.test(b.textContent.trim())) || chips[0];
  all.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  await sleep(320);
  console.log('  rows after reset:', rows().length, '(enriched:', rows().filter(r=>r.dataset.ijRow==='set').length + ')');
  const afterShapes = new Map(rows().map((r) => [r.dataset.id, (r.className.match(/ij-shape-\w+/) || ['—'])[0]]));
  const changed = [...beforeShapes.keys()].filter((id) => afterShapes.get(id) !== beforeShapes.get(id));
  console.log('  shapes kept through filtering:', changed.length === 0 ? 'yes (all ' + beforeShapes.size + ')' : 'NO — changed for ' + changed.join(', '));

  console.log('--- search still works ---');
  const search = q('#project-search');
  search.value = 'tera';
  search.dispatchEvent(new win.Event('input',{bubbles:true}));
  await sleep(320);
  console.log('  rows after search:', rows().length, rows().map(r=>r.querySelector('h3').textContent).join(', '));
  search.value = '';
  search.dispatchEvent(new win.Event('input',{bubbles:true}));
  await sleep(320);

  console.log('--- opening a project from a row ---');
  const row = rows()[2];
  const wanted = row.dataset.id;
  row.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  await sleep(300);
  const dialog = q('#project-dialog');
  console.log('  clicked row:', wanted);
  console.log('  dialog open:', dialog.hasAttribute('open'));
  console.log('  dialog title:', q('#dialog-title') && q('#dialog-title').textContent);
  console.log('  compare block present:', !!q('#project-dialog .ij-compare'));

  console.log('--- errors ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  server.close(); dom.window.close(); process.exit(0);
});
