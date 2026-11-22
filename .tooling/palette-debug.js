const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.otf':'font/otf','.png':'image/png','.mjs':'text/javascript' };
const server = http.createServer((req,res)=>{ let f=path.join(root,decodeURIComponent(req.url.split('?')[0])); if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html'); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });
server.listen(8271,'127.0.0.1', async () => {
  const vc = new VirtualConsole();
  const dom = await JSDOM.fromURL('http://127.0.0.1:8271/', {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      w.matchMedia = q => ({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.fetch = (i,o)=>fetch(new URL(i,w.location.href).href,o);
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){setTimeout(()=>this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this),0);} unobserve(){} disconnect(){} };
      w.Element.prototype.getBoundingClientRect = function(){ return {x:0,y:0,top:0,left:0,right:240,bottom:48,width:240,height:48,toJSON(){return this;}}; };
    }
  });
  await new Promise(r=>setTimeout(r,1500));
  const doc = dom.window.document, win = dom.window;
  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
  const until = async (fn, ms=6000) => { const t=Date.now(); for(;;){ const v=fn(); if(v) return v; if(Date.now()-t>ms) return null; await sleep(60);} };
  const queries = (process.env.QUERIES || 'tera,grad,energy').split(',');
  for (const query of queries) {
    win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));
    const input = await until(()=>doc.querySelector('#ij-palette-input'));
    if (!input) { console.log('\nquery "' + query + '" → PALETTE DID NOT OPEN'); continue; }
    input.value = query;
    input.dispatchEvent(new win.Event('input',{bubbles:true}));
    await sleep(30);
    const titles = [...doc.querySelectorAll('#ij-palette-list .ij-palette-item strong')].map(n=>n.textContent);
    console.log('\nquery "' + query + '" → ' + titles.length + ' results');
    titles.slice(0,14).forEach(t=>console.log('   ', t));
    const hit = doc.querySelector('#ij-palette-list .ij-palette-item strong');
    if (hit) {
      const marks = [...hit.querySelectorAll('mark')].map(m=>m.textContent);
      const broken = [...hit.querySelectorAll('mark')].some(m=>!m.closest('strong'));
      console.log('    marks:', JSON.stringify(marks), 'nested-ok:', !broken, '| text:', JSON.stringify(hit.textContent));
    }
    input.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    await until(()=>!doc.querySelector('#ij-palette-input'));
  }
  server.close(); dom.window.close(); process.exit(0);
});
