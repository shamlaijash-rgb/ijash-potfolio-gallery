const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve('..', 'dist');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.otf': 'font/otf', '.png': 'image/png', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
server.listen(8251, '127.0.0.1', async () => {
  const mode = process.argv[2] || 'normal';
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => console.log('ERR', e.message.split('\n')[0]));
  const dom = await JSDOM.fromURL('http://127.0.0.1:8251/', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.fetch = (i, o) => fetch(new URL(i, w.location.href).href, o);
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.IntersectionObserver = mode === 'broken' ? class { observe() {} unobserve() {} disconnect() {} } : class { observe() {} unobserve() {} disconnect() {} };
    }
  });
  const sample = (label) => {
    const c = dom.window.document.querySelector('.ij-curtain');
    console.log(`[${mode}] t=${label}  curtain:${c ? 'present' : 'MISSING'}  classes:"${c ? c.className : '-'}"  body:"${dom.window.document.body.className}"`);
  };
  [0, 1000, 1800, 2600].forEach((t, i) => setTimeout(() => sample(t), t));
  setTimeout(() => { server.close(); dom.window.close(); process.exit(0); }, 3200);
});
