const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.otf':'font/otf','.png':'image/png','.mjs':'text/javascript' };
const server = http.createServer((req,res)=>{ let f=path.join(root,decodeURIComponent(req.url.split('?')[0])); if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html'); fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });
server.listen(8261,'127.0.0.1', async () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => console.log('ERR', e.message.split('\n')[0]));
  const dom = await JSDOM.fromURL('http://127.0.0.1:8261/', {
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      w.matchMedia = q => ({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.fetch = (i,o)=>fetch(new URL(i,w.location.href).href,o);
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){ setTimeout(()=>this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this),0);} unobserve(){} disconnect(){} };
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  const d = dom.window.document;
  const hidden = [...d.querySelectorAll('.ij-rise:not(.ij-in), .ij-mask:not(.ij-in)')];
  console.log('total registered reveals:', d.querySelectorAll('[data-ij-reveal]').length);
  console.log('still hidden:', hidden.length);
  hidden.slice(0, 25).forEach(el => {
    const path = [];
    let n = el;
    while (n && n !== d.body && path.length < 5) { path.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0,2).join('.') : '')); n = n.parentElement; }
    console.log('   ', path.join(' > '), '| text:', JSON.stringify((el.textContent||'').trim().slice(0,40)));
  });
  server.close(); dom.window.close(); process.exit(0);
});
