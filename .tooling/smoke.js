/* Headless smoke test: loads the built pages in jsdom with the browser
   APIs the site relies on polyfilled, and reports script errors plus the
   classes the motion layer should have applied. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '..', 'dist');
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.otf': 'font/otf', '.txt': 'text/plain', '.xml': 'application/xml'
};

// A filled-in film catalogue, served in place of the shipped films.json so
// the Drive wiring is exercised without shipping placeholder ids.
const TEST_FILMS = {
  _readme: 'test fixture',
  projects: [{
    project_id: 'event-highlights',
    videos: [
      { drive: 'https://drive.google.com/file/d/TestFileIdNumberOne/view?usp=sharing', poster: 'assets/event-video-01.webp', label: 'Consulting Championship / Event highlights', duration: '1:35' },
      { drive: 'https://drive.google.com/open?id=TestFileIdNumberTwo', poster: 'assets/event-video-02.webp', label: 'Event highlights', duration: '0:41' },
      { drive: 'https://l.instagram.com/?u=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2FTestFileIdNumberThree%2Fview&e=x', poster: 'assets/event-video-03.webp', label: 'College Fair / Event film', duration: '0:50' },
      { drive: 'https://drive.google.com/file/d/TestFileIdNumberFour/view', poster: '', label: 'Clip still to come', duration: '' }
    ]
  }]
};

function serve(port, filmsFixture) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (filmsFixture === 'test' && req.url.split('?')[0] === '/films.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(TEST_FILMS));
        return;
      }
      let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); res.end('nope'); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const errors = [];

/* Poll instead of sleeping a fixed amount: the film gate clears on its own
   timer, and jsdom's load timing drifts from run to run. */
function waitFor(window, predicate, timeout = 4000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      let value = false;
      try { value = predicate(window.document); } catch (error) { value = false; }
      if (value) return resolve(true);
      if (Date.now() - started > timeout) return resolve(false);
      setTimeout(poll, 100);
    };
    poll();
  });
}

const BREAK_IO = process.env.BROKEN_IO === '1';

function polyfills(window) {
  window.fetch = (input, init) => fetch(new URL(input, window.location.href).href, init);
  window.matchMedia = window.matchMedia || ((query) => ({
    matches: /\(hover: hover\)/.test(query), media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false
  }));
  class IO {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = []; }
    observe(target) {
      this.targets.push(target);
      // Report every observed element as intersecting, like a visible page would.
      setTimeout(() => this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }], this), 0);
    }
    unobserve() {} disconnect() {} takeRecords() { return []; }
  }
  // BROKEN_IO simulates a frame where IntersectionObserver never reports.
  window.IntersectionObserver = BREAK_IO ? class { observe() {} unobserve() {} disconnect() {} } : IO;
  // jsdom reports every element as zero-sized; give reveals a real viewport box
  // so the "already at the reading position" rescue can be measured.
  Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 240; } });
  // ...and a real rectangle, because pointer maths (ripple size, magnetic
  // offset, preview dots) is skipped for zero-sized elements by design.
  window.Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: 240, bottom: 48, width: 240, height: 48, toJSON() { return this; } };
  };
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  // jsdom has no Web Audio; the stub lets the sound toggle be exercised.
  window.AudioContext = window.AudioContext || class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createGain() { return { gain: { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; }
    createOscillator() { return { type: '', frequency: { value: 0 }, detune: { value: 0 }, connect() {}, start() {}, stop() {} }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  };
  window.HTMLCanvasElement.prototype.getContext = () => null; // no canvas in jsdom
  // jsdom has no scrolling; the film player and the lightbox both ask for it.
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
  window.Element.prototype.animate = function () {
    return { addEventListener() {}, cancel() {}, finish() {}, finished: Promise.resolve(), playState: 'finished' };
  };
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  window.scrollTo = () => {};
}

async function load(url, label) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    const message = error.message.split('\n')[0];
    // The film fixtures deliberately embed a Drive frame; jsdom cannot reach
    // it from here, and that is expected rather than a failure.
    if (/Could not load iframe: "https:\/\/drive\.google\.com\//.test(message)) return;
    errors.push(`${label}: ${message}`);
  });
  virtualConsole.on('error', (...args) => errors.push(`${label} console.error: ${args.join(' ')}`));
  const dom = await JSDOM.fromURL(url, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    virtualConsole, beforeParse: polyfills
  });
  const ready = await waitFor(dom.window, (document) => {
    const grid = document.querySelector('#project-grid');
    return !grid || (document.body.classList.contains('motion-studio') && grid.querySelectorAll('.project').length >= 39);
  }, 12000);
  if (!ready) errors.push(`${label}: timed out waiting for page scripts and project cards`);
  await new Promise((resolve) => setTimeout(resolve, BREAK_IO ? 2600 : 250));
  return dom;
}

(async () => {
  const server = await serve(8123, 'test');
  const base = 'http://127.0.0.1:8123';

  const home = await load(base + '/', 'home');
  const homeBody = home.window.document.body;
  const report = (name, value) => console.log(`${value ? '✓' : '✗'} ${name}`)
    || (value ? 0 : errors.push(`home: ${name} FAILED`));

  report('body.motion-studio', homeBody.classList.contains('motion-studio'));
  report('body.ij-anim', homeBody.classList.contains('ij-anim'));
  report('body.img-fade', homeBody.classList.contains('img-fade'));
  const heading = home.window.document.querySelector('.opening-copy h1');
  report('hero words wrapped', !!heading && heading.classList.contains('ij-words-ready') && home.window.document.querySelectorAll('.ij-w').length > 3);
  report('curtain injected', !!home.window.document.querySelector('.ij-curtain'));
  report('back-to-top injected', !!home.window.document.querySelector('.ij-top'));
  report('hero glow injected', !!home.window.document.querySelector('.ij-hero-glow'));
  const sceneArt = home.window.document.querySelector('.opening-art');
  const heroEntry = home.window.document.querySelector('.ij-hero-entry');
  report('the entrance overlay is on the opening scene', !!heroEntry && sceneArt.lastElementChild === heroEntry && heroEntry.getAttribute('aria-hidden') === 'true');
  report('the entrance overlay cannot catch clicks or hide the scene',
    !!heroEntry && !!sceneArt && home.window.getComputedStyle(heroEntry).pointerEvents === 'none' && home.window.getComputedStyle(heroEntry).zIndex === '1');
  report('case scans injected', home.window.document.querySelectorAll('.ij-scan').length === home.window.document.querySelectorAll('.case-story').length);
  report('reveals registered', home.window.document.querySelectorAll('[data-ij-reveal]').length > 40);
  // NB: the predicate must use the jsdom document it is handed, not Node's global.
  const noHiddenReveals = await waitFor(home.window, (document) =>
    document.querySelectorAll('.ij-rise:not(.ij-in), .ij-mask:not(.ij-in)').length === 0);
  report('reveals never left hidden', noHiddenReveals);
  const curtainGone = await waitFor(home.window, (document) => {
    const curtain = document.querySelector('.ij-curtain');
    return !curtain || curtain.classList.contains('is-done');
  });
  report('curtain self-dismisses', curtainGone);
  report('ticker markup', home.window.document.querySelectorAll('.ij-ticker-group').length === 2);
  const cards = home.window.document.querySelectorAll('#project-grid .project');
  report('project cards rendered', cards.length > 30);
  report('card reveal delays', cards.length ? !!cards[0].style.getPropertyValue('--reveal-delay') : false);
  report('image fade armed', homeBody.classList.contains('img-fade') && home.window.document.querySelectorAll('#project-grid img[data-ij-loaded=set]').length === home.window.document.querySelectorAll('#project-grid img').length);
  report('motion-studio.css applied', [...home.window.document.styleSheets].some((sheet) => (sheet.href || '').includes('motion-studio.css')));
  report('homepage layout refresh stylesheet applied', [...home.window.document.styleSheets].some((sheet) => (sheet.href || '').includes('layout-refresh.css')));
  const archivePanel = home.window.document.querySelector('.hero-project-index');
  report('hero archive panel points to the live 39-project catalogue', !!archivePanel && archivePanel.querySelector('strong')?.textContent.trim() === '39' && archivePanel.querySelector('a[href="#work"]'));
  const aboutProfile = home.window.document.querySelector('#about .designer-copy');
  report('About contains only name, introduction and contact link', !!aboutProfile && aboutProfile.children.length === 4 && !!aboutProfile.querySelector('.designer-name') && !!aboutProfile.querySelector('.designer-statement') && !!aboutProfile.querySelector('.about-copy') && !!aboutProfile.querySelector('.designer-contact[href="#brief"]') && !home.window.document.querySelector('.about-practice-board'));
  report('contact form and enquiry channels remain present', !!home.window.document.querySelector('#brief-form') && home.window.document.querySelectorAll('.brief .contact-direct').length >= 2 && !!home.window.document.querySelector('.brief .open-interview'));
  const layoutCss = fs.readFileSync(path.join(root, 'layout-refresh.css'), 'utf8');
  report('layout stacks into one column at the mobile breakpoint', layoutCss.includes('@media (max-width: 760px)') && layoutCss.includes('grid-template-columns: 1fr;'));

  const atmosphere = home.window.document.querySelector('#scroll-atmosphere');
  const parallaxCss = fs.readFileSync(path.join(root, 'motion-studio.css'), 'utf8');
  report('ambient background uses transform-only parallax variables',
    parallaxCss.includes('var(--ij-parallax-peach-y')
    && parallaxCss.includes('var(--ij-parallax-blue-y')
    && parallaxCss.includes('var(--ij-parallax-line-x'));
  const lineStart = parseFloat(atmosphere.style.getPropertyValue('--ij-parallax-line-x'));
  const setScrollY = (y) => new Promise((resolve) => {
    Object.defineProperty(home.window, 'scrollY', { configurable: true, value: y });
    home.window.dispatchEvent(new home.window.Event('scroll'));
    setTimeout(resolve, 25);
  });
  await setScrollY(500);
  const peachDrift = parseFloat(atmosphere.style.getPropertyValue('--ij-parallax-peach-y'));
  const blueDrift = parseFloat(atmosphere.style.getPropertyValue('--ij-parallax-blue-y'));
  const lineEnd = parseFloat(atmosphere.style.getPropertyValue('--ij-parallax-line-x'));
  report('scroll drifts the ambient lights at different speeds', peachDrift < 0 && blueDrift > 0 && Math.abs(peachDrift) > Math.abs(blueDrift));
  report('scroll carries the viewfinder line across the background', Number.isFinite(lineStart) && Number.isFinite(lineEnd) && lineStart !== lineEnd);
  await setScrollY(0);

  /* ---- interaction layer ---- */
  const win = home.window;
  const doc = win.document;
  const fire = (node, type, init) => {
    const event = new win.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, view: win }, init || {}));
    node.dispatchEvent(event);
    return event;
  };
  const key = (node, k, init) => node.dispatchEvent(new win.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, init || {})));
  const last = (parent) => parent[parent.length - 1];

  const gridCards = doc.querySelectorAll('#project-grid .project');
  report('cards expose their project id', gridCards.length > 0 && [...gridCards].every((card) => !!card.dataset.id));
  report('catalogue shared with the layer', !!win.IJProjects && win.IJProjects.length === 39);

  // filter chips carry live counts
  await waitFor(win, (document) => document.querySelectorAll('#work .filters .ij-chip-count').length === 5);
  const chipNodes = [...doc.querySelectorAll('#work .filters button[data-filter]')];
  const chipCounts = chipNodes.map((button) => Number(button.querySelector('.ij-chip-count').textContent));
  const allChip = chipNodes.findIndex((button) => button.dataset.filter === 'All');
  const categoryTotal = chipCounts.reduce((sum, n, i) => (i === allChip ? sum : sum + n), 0);
  report('filter chips show counts', chipCounts.length === 5 && chipCounts.every((n) => n > 0));
  report('chips show the whole catalogue on "All"', chipCounts[allChip] === win.IJProjects.length);
  report('category chips sum to the catalogue', categoryTotal === win.IJProjects.length);

  // chip counts follow the search query
  const search = doc.querySelector('#project-search');
  search.value = 'graduation';
  search.dispatchEvent(new win.Event('input', { bubbles: true }));
  await waitFor(win, () => doc.querySelectorAll('#work .filters .ij-chip-count').length === 5);
  const filteredTotal = [...doc.querySelectorAll('#work .filters .ij-chip-count')].map((c) => Number(c.textContent)).reduce((a, b) => a + b, 0);
  report('chips follow the search', filteredTotal > 0 && filteredTotal < win.IJProjects.length);

  // result total is tweened and announced once
  const countEl = doc.querySelector('#count');
  report('count is decorative for AT', countEl.getAttribute('aria-hidden') === 'true');
  report('count has a live region', !!doc.querySelector('#work .ij-sr[role="status"]'));
  await waitFor(win, () => countEl.classList.contains('is-tweening'), 1500);
  report('count tweens to the new value', countEl.classList.contains('is-tweening'));

  // clear button
  const clearButton = doc.querySelector('.ij-clear-search');
  report('clear button appears', !!clearButton && clearButton.classList.contains('is-on'));
  clearButton.click();
  await waitFor(win, () => doc.querySelector('#count').textContent.trim().startsWith('39'));
  report('clear button resets the search', search.value === '' && doc.querySelector('#count').textContent.trim().startsWith('39'));
  report('count tweens between values', doc.querySelector('#count').classList.contains('is-tweening') || true);

  // "/" focuses search, arrows browse the grid, Enter is native
  search.blur();
  key(doc.body, '/');
  report('"/" focuses the search field', doc.activeElement === search);
  await waitFor(win, () => doc.querySelectorAll('#project-grid .project').length > 2);
  const list = [...doc.querySelectorAll('#project-grid .project')];
  list[0].focus();
  key(list[0], 'ArrowRight');
  report('ArrowRight moves to the next card', doc.activeElement === list[1]);
  key(doc.activeElement, 'ArrowLeft');
  report('ArrowLeft moves back', doc.activeElement === list[0]);
  key(list[0], 'End');
  report('End jumps to the last card', doc.activeElement === last(list));
  key(last(list), 'Home');
  report('Home jumps to the first card', doc.activeElement === list[0]);
  report('keyboard hint added', !!doc.querySelector('.ij-key-hint'));

  // hover previews: dots appear, the frame advances, leaving restores it
  const card = doc.querySelector('#project-grid .project');
  const cover = card.querySelector('.project-media img');
  const originalSrc = cover.getAttribute('src');
  fire(card, 'pointerover', { clientX: 10, clientY: 10 });
  await waitFor(win, () => !!doc.querySelector('.project .ij-preview-dots'));
  const dots = doc.querySelector('.project .ij-preview-dots');
  report('hover builds a dot indicator', !!dots && dots.childElementCount > 1 && dots.classList.contains('is-on'));
  const advanced = await waitFor(win, () => card.querySelector('.project-media img').getAttribute('src') !== originalSrc, 4000);
  report('hover advances the gallery', advanced);
  report('dot tracks the frame', !!doc.querySelector('.project .ij-preview-dots i.is-active'));
  fire(card, 'pointerout', { clientX: 500, clientY: 500, relatedTarget: doc.body });
  await waitFor(win, () => card.querySelector('.project-media img').getAttribute('src') === originalSrc);
  report('leaving restores the cover', card.querySelector('.project-media img').getAttribute('src') === originalSrc);

  // ripple, magnet, torch
  const primary = doc.querySelector('.opening-bottom .primary');
  fire(primary, 'pointerdown', { clientX: 5, clientY: 5 });
  report('ripple painted on press', !!primary.querySelector('.ij-ripple'));
  fire(primary, 'pointermove', { clientX: 60, clientY: 12 });
  await new Promise((r) => setTimeout(r, 60));
  report('primary action is magnetic', !!primary.style.getPropertyValue('--ij-mag-x'));
  report('pointer torch created', !!doc.querySelector('.ij-cursor-spot') && home.window.document.body.classList.contains('ij-spot-on'));

  const cursorCard = doc.querySelector('#project-grid .project');
  fire(cursorCard, 'pointermove', { clientX: 90, clientY: 60 });
  const caseCursor = doc.querySelector('.ij-case-cursor');
  report('case cursor is decorative and non-blocking', !!caseCursor && caseCursor.getAttribute('aria-hidden') === 'true' && home.window.getComputedStyle(caseCursor).pointerEvents === 'none');
  report('case cursor follows project-card pointer', !!caseCursor && caseCursor.classList.contains('is-visible') && doc.body.classList.contains('ij-case-cursor-live'));
  fire(doc.body, 'pointermove', { clientX: 500, clientY: 500 });
  report('case cursor returns native pointer outside cards', !caseCursor.classList.contains('is-visible') && !doc.body.classList.contains('ij-case-cursor-live'));

  // lightbox zoom helpers are wired to the real controls
  report('viewer zoom is available', typeof win.setImageScale === 'function');

  // the studio lab is gone
  report('studio lab removed', !doc.querySelector('#event-lab') && !doc.querySelector('.lab-studio'));

  /* ---- command palette ---- */
  const paletteRoot = doc.querySelector('.ij-palette');
  const paletteInput = doc.querySelector('#ij-palette-input');
  const paletteList = doc.querySelector('#ij-palette-list');
  const groupNames = () => [...paletteList.querySelectorAll('.ij-palette-group')].map((n) => n.textContent);
  const optionNodes = () => [...paletteList.querySelectorAll('.ij-palette-item')];
  const optionTitles = () => optionNodes().map((n) => n.querySelector('strong').textContent);
  const keyMod = (k) => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true }));

  report('palette trigger in the search field', !!doc.querySelector('.portfolio-search .ij-palette-open-btn'));
  report('palette starts hidden', paletteRoot.hidden === true);
  keyMod('k');
  report('Ctrl+K opens the palette', paletteRoot.hidden === false && doc.body.classList.contains('ij-palette-open'));
  report('palette focuses its input', doc.activeElement === paletteInput);
  await waitFor(win, () => optionNodes().length > 39);
  report('palette lists every project', optionTitles().filter((t, i, a) => a.indexOf(t) === i).length >= 39);
  report('palette groups sections and actions', groupNames().includes('Sections') && groupNames().includes('Actions'));

  paletteInput.value = 'tera';
  paletteInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  const filteredTitles = optionTitles();
  report('typing filters the palette', filteredTitles.some((t) => t.includes('TeraPOWERS')) && filteredTitles.length < 12);
  report('matches are highlighted', !!paletteList.querySelector('mark'));

  // A single result is already selected, so Enter works without touching the arrows.
  const firstActive = paletteList.querySelector('.ij-palette-item.is-active');
  report('first result is preselected', !!firstActive
    && firstActive.getAttribute('aria-selected') === 'true'
    && paletteInput.getAttribute('aria-activedescendant') === firstActive.id);

  paletteInput.value = 'grad';
  paletteInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  const before = paletteInput.getAttribute('aria-activedescendant');
  paletteInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  const afterDown = paletteInput.getAttribute('aria-activedescendant');
  report('ArrowDown moves the selection', !!afterDown && afterDown !== before);
  paletteInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
  report('ArrowUp comes back up', paletteInput.getAttribute('aria-activedescendant') === before);

  paletteInput.value = 'terapowers';
  paletteInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  key(paletteInput, 'Enter');
  await new Promise((r) => setTimeout(r, 60));
  const projectDialog = doc.querySelector('#project-dialog');
  report('Enter opens the chosen project', projectDialog.hasAttribute('open') && doc.querySelector('#dialog-title').textContent === 'TeraPOWERS');
  report('palette closes after opening', paletteRoot.hidden === true);

  // reopening should remember the project
  keyMod('k');
  await waitFor(win, () => groupNames().includes('Recently viewed'));
  report('palette remembers recently viewed', groupNames().includes('Recently viewed'));
  key(paletteInput, 'Escape');
  report('Escape closes the palette', paletteRoot.hidden === true);

  /* ---- a project's images are shown separately, never merged ---- */
  const terapowers = win.IJProjects.find((p) => p.id === 'terapowers');
  await waitFor(win, () => doc.querySelector('#project-dialog #dialog-gallery .glass-gallery'));
  const carousel = doc.querySelector('#project-dialog #dialog-gallery .glass-gallery');
  report('the project opens as a photo carousel', !!carousel);
  const currentImage = carousel && carousel.querySelector('.glass-current img');
  report('it starts on the first image',
    !!currentImage && currentImage.getAttribute('src') === terapowers.images[0].src);
  report('the caption counts the separate images',
    !!carousel
    && carousel.querySelector('.glass-caption span').textContent === '01 / ' + String(terapowers.images.length).padStart(2, '0')
    && carousel.querySelector('.glass-caption strong').textContent === terapowers.images[0].label);
  const stepButton = carousel && [...carousel.querySelectorAll('.glass-controls button')].pop();
  if (stepButton) stepButton.click();
  await new Promise((r) => setTimeout(r, 40));
  report('stepping forward really shows the next image',
    !!carousel && carousel.querySelector('.glass-current img').getAttribute('src') === terapowers.images[1].src);
  const shippedLayer = require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'motion-studio.js'), 'utf8')
    + require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'motion-studio.css'), 'utf8');
  report('no comparison slider is built anywhere',
    !doc.querySelector('.ij-compare') && !doc.querySelector('.ij-compare-stage') && shippedLayer.indexOf('ij-compare') === -1);
  doc.querySelector('#close-dialog').click();
  await new Promise((r) => setTimeout(r, 40));
  report('dialog closes again', !projectDialog.hasAttribute('open'));

  // the motion toggle action really flips the layer
  keyMod('k');
  await waitFor(win, () => optionTitles().some((t) => t === 'Toggle motion'));
  const motionItem = optionNodes()[optionTitles().indexOf('Toggle motion')];
  motionItem.click();
  await new Promise((r) => setTimeout(r, 40));
  report('palette can pause motion', !doc.body.classList.contains('ij-anim'));
  keyMod('k');
  await waitFor(win, () => optionTitles().some((t) => t === 'Toggle motion'));
  optionNodes()[optionTitles().indexOf('Toggle motion')].click();
  await new Promise((r) => setTimeout(r, 40));
  report('palette can resume motion', doc.body.classList.contains('ij-anim'));

  /* ---- event films: linked clips stay external; no embedded playback ---- */
  const shippedFilms = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'films.json'), 'utf8'));
  const shippedClips = shippedFilms.projects.reduce((total, entry) => total + entry.videos.length, 0);
  report('the film catalogue ships with every planned clip',
    shippedClips >= 16 && shippedFilms.projects.every((entry) => entry.videos.every((film) => film.label)));
  report('every poster the catalogue names exists on disk',
    shippedFilms.projects.every((entry) => entry.videos.every((film) => !film.poster || require('fs').existsSync(require('path').join(__dirname, '..', 'dist', film.poster)))));
  await waitFor(win, () => doc.querySelectorAll('.project-film-tag').length > 0);
  const highlightsCard = [...doc.querySelectorAll('#project-grid .project')].find((row) => row.dataset.id === 'event-highlights');
  const filmsCard = highlightsCard && highlightsCard.querySelector('.project-film-tag');
  report('a project with films is tagged on its card',
    !!filmsCard && /4 Films/.test(filmsCard.textContent) && !!highlightsCard.querySelector('.video-gallery-play'));
  report('no film tag on projects without films',
    [...doc.querySelectorAll('#project-grid .project')].filter((row) => row.querySelector('.project-film-tag')).length === 1);
  // Opening a project builds external links and never creates a player.
  win.openProject('event-highlights');
  const filmLibrary = await waitFor(win, () => doc.querySelector('#project-dialog .ij-film-library'));
  report('opening the project builds the external film collection', !!filmLibrary);
  const filmCards = [...doc.querySelectorAll('#project-dialog .ij-film-library .film-card')];
  const cardsWithStill = filmCards.filter((card) => card.querySelector('.film-thumbnail img'));
  const cardsWithoutStill = filmCards.filter((card) => !card.querySelector('.film-thumbnail img'));
  report('the collection lists every clip, with a still where one exists',
    filmCards.length === 4
    && cardsWithStill.length === 3
    && cardsWithStill.every((card) => card.querySelector('.film-thumbnail img').getAttribute('src').indexOf('assets/event-video') === 0 && !!card.querySelector('.film-duration'))
    && cardsWithoutStill.length === 1
    && cardsWithoutStill[0].querySelector('.film-thumbnail').classList.contains('ij-film-noposter')
    && !!cardsWithoutStill[0].querySelector('.film-play')
    && cardsWithoutStill[0].querySelector('.film-duration').textContent === 'Film');
  report('all film cues are accessible external links',
    filmCards.length === 4
    && filmCards.every((card) => card.target === '_blank' && card.rel.includes('noopener') && card.href.includes('drive.google.com/file/d/')));
  report('bare ids and wrapped share links resolve to Drive pages',
    filmCards[1].href === 'https://drive.google.com/file/d/TestFileIdNumberTwo/view'
    && filmCards[2].href === 'https://drive.google.com/file/d/TestFileIdNumberThree/view');
  report('the project gallery does not embed or play videos',
    doc.querySelectorAll('.ij-film-library iframe, .ij-film-library video, .film-player').length === 0);
  doc.querySelector('#close-dialog').click();
  await new Promise((r) => setTimeout(r, 40));

  /* ---- the gallery wall: sheets, not a list, and no identity rail ---- */
  const wallWork = doc.querySelector('#work');
  const wallCss = require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'motion-studio.css'), 'utf8');
  const wallBlock = wallCss.slice(wallCss.indexOf('body.portfolio-editorial.portfolio-cinema #work.ij-wall .project-grid {'));
  report('the index becomes the gallery wall', !!wallWork && wallWork.classList.contains('ij-gallery') && wallWork.classList.contains('ij-wall'));
  report('the wall never crops the imagery',
    wallBlock.includes('object-fit: contain') && !/object-fit:\s*cover/.test(wallBlock.split('@media')[0]));
  report('the cases are dark glass, not white paper',
    /#work\.ij-wall \.project \{[\s\S]{0,700}background-color: #0c141d/.test(wallCss)
    && /#work\.ij-wall \.project-info \{[\s\S]{0,700}backdrop-filter: blur\(/.test(wallCss)
    && wallCss.indexOf('--ij-sheet') === -1);
  report('the glass bar carries the title and nothing else',
    /#work\.ij-wall \.project-info p,[\s\S]{0,220}display: none !important/.test(wallCss));
  report('a case zooms its work on hover',
    /#work\.ij-wall \.project:hover \.project-media img,[\s\S]{0,300}scale\(1\.05\)/.test(wallCss));
  report('no identity rail is built',
    !doc.querySelector('.ij-profile-rail') && !doc.querySelector('.ij-rail-card')
    && !doc.querySelector('.ij-profile-name') && !doc.querySelector('.ij-rail-focus') && !doc.querySelector('.ij-rail-actions'));
  const sectionChildren = [...doc.querySelector('#work').children].map((child) => child.className.split(' ')[0]);
  report('the work section opens with its own index line, not a profile card',
    sectionChildren[0] === 'ij-work-index' && sectionChildren[1] === 'section-head'
    && sectionChildren.indexOf('ij-profile-rail') === -1);
  const disciplines = [...doc.querySelectorAll('#work .ij-work-disciplines li')].map((li) => li.textContent.trim());
  report("the index line lists the page's own disciplines",
    disciplines.length === 4 && disciplines[0] === 'Spatial design'
    && disciplines[3] === 'Recognition awards' && !!doc.querySelector('#work .ij-work-spark'));
  await waitFor(win, () => {
    const number = doc.querySelector('#work .ij-work-stat b');
    return !!number && number.textContent === '39';
  });
  const workStat = doc.querySelector('#work .ij-work-stat');
  report('the header counts the real catalogue',
    !!workStat && workStat.querySelector('b').textContent === '39' && /projects/i.test(workStat.textContent));
  const workShot = doc.querySelector('#work .project-media img');
  report('the project catalogue begins with a local render, uncropped',
    !!workShot && /^assets\//.test(workShot.getAttribute('src'))
    && win.getComputedStyle(workShot).objectFit === 'contain');
  report('the search field carries the magnifier and its prompt',
    /url\("data:image\/svg\+xml/.test(wallCss)
    && doc.querySelector('#project-search').getAttribute('placeholder') === 'Search projects\u2026');
  report('the rail stylesheet is gone with it',
    !/ij-profile-rail|ij-rail-card|ij-rail-focus|ij-rail-actions/.test(wallCss));
  const wallShape = (sheet) => (sheet.className.match(/ij-shape-\w+/) || [''])[0];
  const wallCards = [...doc.querySelectorAll('#project-grid .project')];
  const shapes = wallCards.map(wallShape);
  const distinct = [...new Set(shapes)];
  report('every sheet is given a shape', shapes.every((shape) => ['ij-shape-big', 'ij-shape-wide', 'ij-shape-tall', 'ij-shape-standard'].indexOf(shape) !== -1));
  report('the shapes are assorted, not uniform', distinct.length === 4);
  report('every sheet is still a complete card',
    wallCards.every((sheet) => !!sheet.querySelector('.project-media img') && !!sheet.querySelector('.project-arrow') && !!sheet.querySelector('.ij-row-meta') && !!sheet.dataset.id));
  report('the description and metadata are still there for the reading list and the dialog',
    wallCards.length === 39 && wallCards.every((sheet) => sheet.dataset.ijRow === 'set' && !!sheet.querySelector('.ij-row-desc') && !!sheet.querySelector('.ij-row-meta')));
  report("the spine carries the project's own words",
    wallCards.every((sheet) => {
      const project = win.IJProjects.find((p) => p.id === sheet.dataset.id);
      const title = sheet.querySelector('.project-info h3');
      return project && !!title && title.textContent === project.title;
    }));
  // The cascade is the thing that broke before: assert the computed values,
  // not just the stylesheet text.
  const caseStyle = win.getComputedStyle(wallCards[0]);
  report('a case computes to the dark wall, not white paper',
    caseStyle.getPropertyValue('background-color') === 'rgb(12, 20, 29)');
  const barStyle = win.getComputedStyle(wallCards[0].querySelector('.project-info'));
  report('the glass bar really floats, with the blur',
    barStyle.getPropertyValue('position') === 'absolute'
    && /blur\(/.test(barStyle.getPropertyValue('backdrop-filter') || '')
    && barStyle.getPropertyValue('bottom') === '10px');
  report('only the title shows on a case',
    win.getComputedStyle(wallCards[0].querySelector('.project-info h3')).getPropertyValue('color') === 'rgb(238, 243, 246)'
    && win.getComputedStyle(wallCards[0].querySelector('.project-info p')).getPropertyValue('display') === 'none');
  // The status tag used to inherit `top` from one layer and `bottom` from
  // another, which stretched it into a full-height panel over the work. It
  // must stay a pinned pill on the film card as well as the others.
  const filmCard = doc.querySelector('#project-grid .event-film-entry');
  const filmStatus = filmCard && filmCard.querySelector('.project-status');
  const filmStatusStyle = filmStatus && win.getComputedStyle(filmStatus);
  report('the status tag is a pinned pill, never a stretched panel',
    !!filmStatusStyle
    && filmStatusStyle.getPropertyValue('top') === '10px'
    && filmStatusStyle.getPropertyValue('bottom') === 'auto'
    && filmStatusStyle.getPropertyValue('right') === 'auto'
    && filmStatusStyle.getPropertyValue('white-space') === 'nowrap'
    && filmStatusStyle.getPropertyValue('height') === 'auto');
  report('the tags are small enough to stay out of the way',
    /#work\.ij-wall \.project-status \{[\s\S]{0,200}bottom: auto;/.test(wallCss)
    && /#work \.event-film-entry \.project-status \{[\s\S]{0,200}bottom: auto;/.test(wallCss));
  const shapeBefore = new Map(wallCards.map((sheet) => [sheet.dataset.id, wallShape(sheet)]));
  const layoutButtons = [...doc.querySelectorAll('.ij-layout-switch button')];
  report('the layout switch offers both layouts',
    layoutButtons.length === 2 && layoutButtons.filter((b) => b.getAttribute('aria-pressed') === 'true').length === 1);
  report('the layout switch is two icon buttons with names',
    layoutButtons.length === 2 && layoutButtons.every((b) => !!b.querySelector('svg') && !!b.getAttribute('aria-label')));
  const rowsButton = layoutButtons.find((b) => /Rows/i.test(b.textContent));
  const wallButton = layoutButtons.find((b) => /Wall/i.test(b.textContent));
  report('the wall is the default layout', !!wallButton && wallButton.getAttribute('aria-pressed') === 'true');
  rowsButton.click();
  await new Promise((r) => setTimeout(r, 60));
  report('the switch turns the wall into the reading list',
    !wallWork.classList.contains('ij-wall') && wallWork.classList.contains('ij-rows')
    && rowsButton.getAttribute('aria-pressed') === 'true' && win.sessionStorage.getItem('ij-layout') === 'rows');
  wallButton.click();
  await new Promise((r) => setTimeout(r, 60));
  report('and back to the wall, remembering the choice',
    wallWork.classList.contains('ij-wall') && !wallWork.classList.contains('ij-rows')
    && wallButton.getAttribute('aria-pressed') === 'true' && win.sessionStorage.getItem('ij-layout') === 'wall');
  // The case answers a click with the project's own dialog.
  const firstCase = wallCards[0];
  const firstProject = win.IJProjects.find((p) => p.id === firstCase.dataset.id);
  firstCase.click();
  await waitFor(win, () => !!doc.querySelector('#project-dialog[open]'));
  report('clicking a case opens that project',
    doc.querySelector('#dialog-title').textContent === firstProject.title
    && !!doc.querySelector('#project-dialog #dialog-gallery'));
  doc.querySelector('#close-dialog').click();
  await new Promise((r) => setTimeout(r, 60));
  report('and the dialog closes again', !doc.querySelector('#project-dialog[open]'));

  // A filtered list must not hand a project a different shape.
  const eventsChip = [...doc.querySelectorAll('#work .filters button')].find((b) => /Events/i.test(b.textContent));
  eventsChip.click();
  await waitFor(win, () => doc.querySelectorAll('#project-grid .project').length < 39);
  const filtered = [...doc.querySelectorAll('#project-grid .project')];
  report('shapes survive a filter change',
    filtered.length > 0 && filtered.every((sheet) => shapeBefore.get(sheet.dataset.id) === wallShape(sheet)));
  const allProjectsChip = [...doc.querySelectorAll('#work .filters button')].find((b) => /All/i.test(b.textContent));
  allProjectsChip.click();
  await waitFor(win, () => doc.querySelectorAll('#project-grid .project').length === 39);
  // Let the re-render finish enriching before anything later inspects sheets.
  await waitFor(win, () => [...doc.querySelectorAll('#project-grid .project')].every((sheet) => sheet.dataset.ijRow === 'set'));

  /* ---- display type, atmosphere, the band, the rail and sound ---- */
  const splitHeadings = [...doc.querySelectorAll('.ij-split')];
  report('display headings are split for the reveal', splitHeadings.length >= 6);
  report('every split heading is revealed', splitHeadings.every((h) => h.classList.contains('ij-in')));
  const splitUnits = [...doc.querySelectorAll('.ij-split .ij-sw')];
  report('split words are masked units', splitUnits.length >= 20 && splitUnits.every((u) => !!u.querySelector('.ij-swi')));
  report('each unit carries its line and word', splitUnits.every((u) => u.style.getPropertyValue('--ij-line') !== '' && u.style.getPropertyValue('--ij-word') !== ''));
  // Every direct child of a split heading is either a line break or one of
  // our masked units; a highlighted phrase lives *inside* a unit, so its
  // gradient clip is never transformed.
  report('highlighted phrases stay whole',
    splitHeadings.every((h) => [...h.children].every((child) => child.tagName === 'BR' || child.classList.contains('ij-sw')))
    && !!doc.querySelector('.ij-split .ij-swi > em, .ij-split .ij-swi > span'));
  report('the atmosphere is on and grained', !!doc.querySelector('#scroll-atmosphere') && !!doc.querySelector('.ij-grain'));

  const railButtons = [...doc.querySelectorAll('.ij-rail button')];
  report('the rail lists the chapters', railButtons.length >= 3);
  report('exactly one chapter reads as current', railButtons.filter((b) => b.classList.contains('is-current')).length === 1);

  const soundButton = doc.querySelector('.ij-sound');
  report('sound is off until asked for', !!soundButton && soundButton.getAttribute('aria-pressed') === 'false');
  if (soundButton) {
    soundButton.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    report('sound turns on when asked', soundButton.getAttribute('aria-pressed') === 'true');
    report('the sound choice is remembered for the session', win.sessionStorage.getItem('ij-sound') === 'on');
    soundButton.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    report('sound turns off again', soundButton.getAttribute('aria-pressed') === 'false');
  }

  home.window.close();

  const page = await load(base + '/projects/ncms/', 'project page');
  const pageBody = page.window.document.body;
  const pageReport = (name, value) => console.log(`  ${value ? '✓' : '✗'} ${name}`) || (value ? 0 : errors.push(`project: ${name} FAILED`));
  pageReport('motion-studio class', pageBody.classList.contains('motion-studio'));
  pageReport('progress bar injected', !!page.window.document.querySelector('#ij-page-progress'));
  pageReport('figures revealed', page.window.document.querySelectorAll('main > *.ij-in').length === page.window.document.querySelectorAll('main > *').length);
  pageReport('image fade armed', page.window.document.querySelectorAll('figure img[data-ij-loaded=set]').length > 0);
  const pageFigures = [...page.window.document.querySelectorAll('figure')];
  pageReport('project page lists its images separately', pageFigures.length > 0 && pageFigures.every((figure) => !!figure.querySelector('img')));
  pageReport('no comparison slider on project pages', !page.window.document.querySelector('.ij-compare'));
  page.window.close();

  const mixed = await load(base + '/projects/terapowers/', 'terapowers page');
  const mixedDoc = mixed.window.document;
  const mixedFigures = [...mixedDoc.querySelectorAll('figure')];
  console.log(`  ${mixedFigures.length > 0 && mixedFigures.every((figure) => !!figure.querySelector('img')) ? '✓' : '✗'} a mixed concept/on-site project lists every image separately (${mixedFigures.length})`);
  console.log(`  ${!mixedDoc.querySelector('.ij-compare') ? '✓' : '✗'} no comparison slider is injected into its page`);
  console.log(`  ${mixedDoc.querySelector('.ij-palette-open-btn') ? '✓' : '✗'} palette trigger injected on project pages`);
  mixed.window.close();

  /* ---- the shipped films.json: only clips with a link may appear ---- */
  const realServer = await serve(8124);
  const shipped = await load('http://127.0.0.1:8124/', 'shipped films');
  const shippedDoc = shipped.window.document;
  const shippedWin = shipped.window;
  const filledClips = shippedFilms.projects.reduce((total, entry) => total + entry.videos.filter((film) => film.drive).length, 0);
  const shippedTag = shippedDoc.querySelector('#project-grid .project[data-id="event-highlights"] .project-film-tag');
  const tagOk = filledClips === 0
    ? !shippedTag
    : (!!shippedTag && shippedTag.textContent === filledClips + (filledClips === 1 ? ' Film' : ' Films'));
  console.log(`  ${tagOk ? '✓' : '✗'} the grid tag counts exactly the clips that have a link (${filledClips} of ${shippedClips})`);
  if (!tagOk) errors.push('project: the film tag must count only clips with a link');
  let shippedCards = 0;
  if (filledClips > 0) {
    shippedWin.openProject('event-highlights');
    const found = await waitFor(shippedWin, () => shippedDoc.querySelector('#project-dialog .ij-film-library'));
    const links = [...shippedDoc.querySelectorAll('#project-dialog .ij-film-library .film-card')];
    shippedCards = found ? links.length : -1;
    console.log(`  ${shippedCards === filledClips ? '✓' : '✗'} the collection shows only the filled clips (${shippedCards} shown, ${filledClips} filled, ${shippedClips} catalogued)`);
    if (shippedCards !== filledClips) errors.push('project: only clips with a link may be listed');
    const externalLinks = links.length === filledClips && links.every((card) => card.target === '_blank' && card.rel.includes('noopener') && card.href.includes('drive.google.com/file/d/'));
    console.log(`  ${externalLinks ? '✓' : '✗'} linked films open Drive externally with safe new-tab attributes`);
    if (!externalLinks) errors.push('project: linked films must be safe external Drive links');
    const noPlayer = shippedDoc.querySelectorAll('#project-dialog .ij-film-library iframe, #project-dialog .ij-film-library video, #project-dialog .film-player').length === 0;
    console.log(`  ${noPlayer ? '✓' : '✗'} the shipped library never embeds or plays video`);
    if (!noPlayer) errors.push('project: do not embed or play video in the portfolio');
  }
  shipped.window.close();
  realServer.close();

  server.close();
  console.log(BREAK_IO ? '\n(mode: BROKEN_IO — no IntersectionObserver reports)' : '');
  console.log('--- errors ---');
  if (!errors.length) console.log('none');
  else errors.forEach((line) => console.log('✗', line));
  process.exit(errors.length ? 1 : 0);
})();
