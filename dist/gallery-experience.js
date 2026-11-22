import * as THREE from 'three';
import { interviewQuestions, briefText } from './brief-flow.mjs';

const WHATSAPP_NUMBER = '966511377306';
const PHONE_NUMBER = '+966 58 571 3603';

const smallMQ = window.matchMedia(
  '(max-width: 819px), (orientation: portrait) and (max-width: 1100px), (orientation: landscape) and (max-height: 500px)'
);
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

const isSmall = () => smallMQ.matches;
const isPortraitSmall = () =>
  smallMQ.matches && window.innerHeight > window.innerWidth;
const isReduced = () => reducedMQ.matches;

/* ---------------- State ---------------- */
const state = {
  projects: [],
  films: [],
  activeCategory: 'ALL',
  listCategory: 'ALL',
  listStage: 'ALL',
  activeView: 'gallery', // 'gallery' | 'list' | 'info'
  activeProjectIndex: null,
  activeImageIndex: 0,
  savedIds: new Set(),
  briefItems: [],
  selectedOptions: {
    type: 'Exhibition Booth',
    scale: '6 × 6 m',
    deliverables: '3D Model + Renders',
    stage: '3D Concept'
  },
  selectedQty: 1,
  lightboxOpen: false,
  lightboxZoomed: false,
  searchOpen: false,
  searchCursor: 0,
  interviewStep: 0,
  interviewAnswers: {}
};

try {
  const savedRaw = sessionStorage.getItem('ij_saved_ids');
  if (savedRaw) JSON.parse(savedRaw).forEach((id) => state.savedIds.add(id));
  const briefRaw = sessionStorage.getItem('ij_brief_items');
  if (briefRaw) state.briefItems = JSON.parse(briefRaw);
} catch {
  /* ignore storage errors */
}

function persistSession() {
  try {
    sessionStorage.setItem('ij_saved_ids', JSON.stringify([...state.savedIds]));
    sessionStorage.setItem('ij_brief_items', JSON.stringify(state.briefItems));
  } catch {
    /* ignore */
  }
}

/* ---------------- DOM Refs ---------------- */
const galleryEl = document.getElementById('gallery');
const veilEl = document.getElementById('veil');
const fallbackEl = document.getElementById('webgl-fallback');
const openPillEl = document.getElementById('open-pill');
const hintLine1El = document.getElementById('hint-line-1');
const hintLine2El = document.getElementById('hint-line-2');
const toggleGalleryBtn = document.getElementById('toggle-gallery');
const toggleListBtn = document.getElementById('toggle-list');
const arrowPrevBtn = document.getElementById('arrow-prev');
const arrowNextBtn = document.getElementById('arrow-next');
const catPillBtn = document.getElementById('nav-cat-pill');
const catMenuEl = document.getElementById('nav-cat-menu');
const catLabelEl = document.getElementById('nav-cat-label');
const briefBadgeEl = document.getElementById('brief-badge');

const pageEl = document.getElementById('page');
const pageArtFrameEl = document.getElementById('page-art-frame');
const pageMainImgEl = document.getElementById('page-main-img');
const pageMetaRowEl = document.getElementById('page-meta-row');
const pageCounterEl = document.getElementById('page-counter');
const pageThumbsEl = document.getElementById('page-thumbs');
const pageRightEl = document.getElementById('page-right');
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const pageDescEl = document.getElementById('page-desc');
const pageCaptionEl = document.getElementById('page-caption');
const pageFilmSlotEl = document.getElementById('page-film-slot');
const pageSaveBtn = document.getElementById('page-save-btn');
const pageQtyEl = document.getElementById('page-qty');
const collectionBandEl = document.getElementById('collection-band');
const collectionRowEl = document.getElementById('collection-row');

const listEl = document.getElementById('list');
const listGridEl = document.getElementById('list-grid');
const listCountEl = document.getElementById('list-count');
const infoPageEl = document.getElementById('info-page');

const drawerEl = document.getElementById('brief-drawer');
const drawerBackdropEl = document.getElementById('drawer-backdrop');
const drawerBodyEl = document.getElementById('drawer-body');
const drawerCountEl = document.getElementById('drawer-count');

const searchModalEl = document.getElementById('search-modal');
const searchInputEl = document.getElementById('search-input');
const searchResultsEl = document.getElementById('search-results');

const lightboxEl = document.getElementById('lightbox');
const lbImgEl = document.getElementById('lb-img');
const lbCounterEl = document.getElementById('lb-counter');
const lbCaptionEl = document.getElementById('lb-caption');

/* ---------------- Helpers ---------------- */
function getCoverSrc(project) {
  if (!project) return '';
  if (project.cover && project.cover.src) return project.cover.src;
  if (project.images && project.images.length) return project.images[0].src;
  return '';
}

function getMediaSize(project, imgObj) {
  const src = imgObj || (project && (project.cover || (project.images && project.images[0])));
  const rawW = Number(src && src.width) || Number(project && project.cover && project.cover.width) || 4;
  const rawH = Number(src && src.height) || Number(project && project.cover && project.cover.height) || 3;
  const rawAr = rawW / Math.max(1, rawH);
  const ar = Math.max(0.52, Math.min(2.35, rawAr));
  return { w: rawW, h: rawH, ar };
}

function getFrameSize(project) {
  const { ar } = getMediaSize(project);
  const targetArea = 2.25;
  let fw = Math.sqrt(targetArea * ar);
  let fh = fw / ar;

  const maxW = 2.12;
  const minW = 1.04;
  const maxH = 1.88;
  const minH = 0.92;

  if (fw > maxW) {
    const s = maxW / fw;
    fw *= s;
    fh *= s;
  }
  if (fh > maxH) {
    const s = maxH / fh;
    fw *= s;
    fh *= s;
  }
  if (fw < minW) {
    const s = minW / fw;
    fw *= s;
    fh = Math.min(maxH, fh * s);
  }
  if (fh < minH) {
    const s = minH / fh;
    fh *= s;
    fw = Math.min(maxW, fw * s);
  }
  return { fw, fh, ar };
}

function getCategoryList(projects) {
  return ['ALL', ...Array.from(new Set(projects.map((p) => p.category)))];
}

function matchesCategory(project, cat) {
  if (!cat || cat === 'ALL') return true;
  if (cat === 'SAVED') return state.savedIds.has(project.id);
  return project.category === cat;
}

function matchesStage(project, stage) {
  if (!stage || stage === 'ALL') return true;
  const s = (project.status || '').toLowerCase();
  if (stage === 'ONSITE') return s.includes('on-site') || s.includes('finished');
  if (stage === 'CONCEPT') return s.includes('concept');
  return true;
}

function clampAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function nearestAngleCopy(targetAngle, currentTh) {
  return currentTh + clampAngle(targetAngle - currentTh);
}

/* ---------------- Three.js Curved Gallery ---------------- */
const R = 18;
const RIN = 12.2;
const H = 6.2;
const PW = 1.36;
const PH = (1.36 * 763) / 567;
const PY = 1.95;
const OUTER_COUNT = 40;
const INNER_COUNT = 24;
const STEP = (Math.PI * 2) / OUTER_COUNT;

const getD = () => (isPortraitSmall() ? 0.14 + 0.9 * STEP : 0.14);

function getWalkPose() {
  if (isPortraitSmall()) {
    return { r: 15.4, yaw: -0.42, y: 1.90, pitch: -0.10 };
  }
  return { r: 15.6, yaw: -0.30, y: 1.92, pitch: -0.12 };
}

function getFocusPose(wall, frame) {
  const portrait = isPortraitSmall();
  const baseDist = portrait ? 5.2 : 4.26;
  const fw = frame && frame.fw ? frame.fw : PW;
  const maxSafeDist = R - RIN - 0.5;
  const dist = Math.min(maxSafeDist, baseDist * (fw > 1.6 ? 1.12 : 1));
  const y = portrait ? PY - 1.05 : PY - 0.52;
  if (wall === 'outer') {
    return { r: R - dist, yaw: Math.PI / 2, y, pitch: 0 };
  }
  return { r: RIN + dist, yaw: -Math.PI / 2, y, pitch: 0 };
}

let renderer = null;
let scene = null;
let camera = null;
let frames = []; // { group, hitMesh, artMesh, frameMat, wall, th, projectIndex }
let projectTextures = []; // 40 CanvasTextures
let projectCanvases = [];
let labelTextures = []; // 40 CanvasTextures
let needsRender = true;
let isAnimating = true;
let webglReady = false;
let isSoftwareGl = false;

const camState = {
  th: 0.14,
  targetTh: 0.14,
  r: 15.6,
  yaw: -0.30,
  y: 1.92,
  pitch: -0.12
};

const glide = {
  active: false,
  elapsed: 0,
  duration: 0.95,
  from: { th: 0, r: 15.6, yaw: -0.3, y: 1.92, pitch: -0.12 },
  to: { th: 0, r: 15.6, yaw: -0.3, y: 1.92, pitch: -0.12 },
  focusedFrame: null
};

const intro = {
  started: false,
  active: false,
  elapsed: 0,
  duration: 1.4,
  fromTh: 0.30,
  fromR: 15.25
};

const pointerState = {
  down: false,
  dragging: false,
  startX: 0,
  startY: 0,
  startTh: 0,
  lastX: 0,
  lastY: 0,
  hoveredFrame: null
};

// Pre-allocated math helpers for zero GC in render loop
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _look = new THREE.Vector3();
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _corner = new THREE.Vector3();
const _proj = new THREE.Vector3();

function detectSoftwareGl() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function makeVerticalGradientTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([pos, col]) => g.addColorStop(pos, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFloorTexture(maxAniso) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#EDD6B0';
  ctx.fillRect(0, 0, 1024, 1024);
  const innerR = (512 * RIN) / R;
  const g = ctx.createRadialGradient(512, 512, innerR, 512, 512, 512);
  g.addColorStop(0, '#EDD6B0');
  g.addColorStop(0.55, '#F3E1C3');
  g.addColorStop(1, '#EFDAB8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(512, 512, 512, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeCeilingTexture(maxAniso) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#F2E3C9';
  ctx.fillRect(0, 0, 1024, 1024);

  const innerPx = (512 * RIN) / R;
  const g = ctx.createRadialGradient(512, 512, innerPx, 512, 512, 512);
  g.addColorStop(0, '#EEE0C6');
  g.addColorStop(0.18, '#FAF1E0');
  g.addColorStop(0.5, '#FFFDF7');
  g.addColorStop(0.82, '#FAF1E0');
  g.addColorStop(1, '#EEE0C6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(512, 512, 512, 0, Math.PI * 2);
  ctx.fill();

  const drawCoveGlow = (worldR, widthPx, color) => {
    const px = (512 * worldR) / R;
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.beginPath();
    ctx.arc(512, 512, px, 0, Math.PI * 2);
    ctx.stroke();
  };
  drawCoveGlow(R - 1.38, 30, 'rgba(255, 253, 246, 0.85)');
  drawCoveGlow(RIN + 1.38, 30, 'rgba(255, 253, 246, 0.85)');
  drawCoveGlow(R - 0.14, 8, 'rgba(220, 198, 162, 0.45)');
  drawCoveGlow(RIN + 0.14, 8, 'rgba(220, 198, 162, 0.45)');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeLightBeamTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const halfSigma = 0.045 + t * 0.25;
    const onset = Math.min(1, t / 0.045);
    const decay = Math.pow(1 - t, 1.35);
    const vFade = onset * decay;
    for (let x = 0; x < w; x++) {
      const u = (x / (w - 1) - 0.5) * 2;
      const radial = Math.exp(-(u * u) / (2 * halfSigma * halfSigma));
      const edgeMask = Math.max(0, 1 - Math.pow(Math.abs(u), 3));
      const a = Math.max(0, Math.min(255, Math.round(vFade * radial * edgeMask * 115)));
      const idx = (y * w + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 252;
      data[idx + 2] = 238;
      data[idx + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWallWashTexture() {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const halfSigma = 0.08 + t * 0.36;
    const vFade = Math.sin(Math.PI * Math.pow(t, 0.72));
    for (let x = 0; x < w; x++) {
      const u = (x / (w - 1) - 0.5) * 2;
      const radial = Math.exp(-(u * u) / (2 * halfSigma * halfSigma));
      const edgeMask = Math.max(0, 1 - Math.pow(Math.abs(u), 3));
      const a = Math.max(0, Math.min(255, Math.round(vFade * radial * edgeMask * 145)));
      const idx = (y * w + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 252;
      data[idx + 2] = 240;
      data[idx + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCrossedBeamGeometry(width, length) {
  const p1 = new THREE.PlaneGeometry(width, length);
  p1.translate(0, -length / 2, 0);
  const p2 = p1.clone();
  p2.rotateY(Math.PI / 2);

  const pos1 = p1.attributes.position.array;
  const uv1 = p1.attributes.uv.array;
  const idx1 = p1.index.array;
  const pos2 = p2.attributes.position.array;
  const uv2 = p2.attributes.uv.array;
  const idx2 = p2.index.array;

  const vCount1 = pos1.length / 3;
  const positions = new Float32Array(pos1.length + pos2.length);
  positions.set(pos1, 0);
  positions.set(pos2, pos1.length);

  const uvs = new Float32Array(uv1.length + uv2.length);
  uvs.set(uv1, 0);
  uvs.set(uv2, uv1.length);

  const indices = new Uint16Array(idx1.length + idx2.length);
  indices.set(idx1, 0);
  for (let i = 0; i < idx2.length; i++) {
    indices[idx1.length + i] = idx2[i] + vCount1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function makeRadialSpriteTexture(innerColor, innerStop, outerColor) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, innerColor);
  g.addColorStop(innerStop, innerColor);
  g.addColorStop(1, outerColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawMattedArt(canvas, img) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#F6EAD8';
  ctx.fillRect(0, 0, W, H);

  const pad = Math.max(12, Math.round(Math.min(W, H) * 0.032));
  const boxW = W - pad * 2;
  const boxH = H - pad * 2;

  ctx.strokeStyle = 'rgba(58, 53, 80, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad - 2, pad - 2, boxW + 4, boxH + 4);

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = pad + (boxW - dw) / 2;
    const dy = pad + (boxH - dh) / 2;

    ctx.fillStyle = '#EAE0D0';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 4) {
      last = last.slice(0, -1);
    }
    if (words.join(' ') !== lines.join(' ')) {
      lines[maxLines - 1] = last.replace(/[.,;:\s]+$/, '') + '…';
    }
  }
  return lines;
}

function drawLabelCanvas(canvas, project, index) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#3A3550';
  ctx.textBaseline = 'alphabetic';

  // Line 1: Category · Status
  const kicker = `${project.category} · ${project.status}`;
  ctx.font = '500 40px "Newsreader", Georgia, serif';
  let kText = kicker;
  while (ctx.measureText(kText).width > W - 50 && kText.length > 6) {
    kText = kText.slice(0, -2) + '…';
  }
  ctx.fillText(kText, 30, 74);

  // Line 2: Project Title (italic Newsreader)
  ctx.font = 'italic 400 44px "Newsreader", Georgia, serif';
  const titleLines = wrapLines(ctx, project.title, W - 50, 2);
  if (titleLines.length === 1) {
    ctx.fillText(titleLines[0], 30, 144);
  } else {
    ctx.font = 'italic 400 37px "Newsreader", Georgia, serif';
    const compact = wrapLines(ctx, project.title, W - 50, 2);
    ctx.fillText(compact[0] || '', 30, 128);
    ctx.fillText(compact[1] || '', 30, 170);
  }

  // Line 3: Index & Media count (DM Mono)
  const num = String(index + 1).padStart(2, '0');
  const imgCount = (project.images || []).length;
  const meta = `${num} / ${state.projects.length} · ${imgCount} VISUAL${imgCount === 1 ? '' : 'S'}`;
  ctx.fillStyle = 'rgba(58, 53, 80, 0.7)';
  ctx.font = '400 28px "DM Mono", ui-monospace, monospace';
  ctx.fillText(meta, 30, 224);
}

function initThree() {
  isSoftwareGl = detectSoftwareGl();

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
  } catch {
    showFallback();
    return false;
  }

  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    isAnimating = false;
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    needsRender = true;
    isAnimating = true;
    startLoop();
  });

  galleryEl.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff9ec);
  scene.fog = new THREE.Fog(0xfff9ec, 10, 46);

  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const fov = window.innerWidth >= window.innerHeight ? 56 : 70;
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.05, 100);

  // Studio lights (kept as specified; surfaces use MeshBasicMaterial)
  const hemi = new THREE.HemisphereLight(0xfffdf6, 0xe9cfa6, 1.55);
  const amb = new THREE.AmbientLight(0xfff6e6, 0.55);
  scene.add(hemi, amb);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // Outer Wall
  const outerTex = makeVerticalGradientTexture([
    [0, '#F5EBD8'],
    [0.2, '#FBF3E3'],
    [0.6, '#FBF3E3'],
    [0.86, '#F8EDD9'],
    [1, '#EFDFC4']
  ]);
  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 160, 1, true),
    new THREE.MeshBasicMaterial({ map: outerTex, side: THREE.BackSide })
  );
  outerWall.position.y = H / 2;
  scene.add(outerWall);

  // Inner Pillar
  const innerTex = makeVerticalGradientTexture([
    [0, '#F7EEDD'],
    [0.3, '#FFFAF0'],
    [0.8, '#FDF5E6'],
    [1, '#F1E1C6']
  ]);
  const innerPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(RIN, RIN, H, 120, 1, true),
    new THREE.MeshBasicMaterial({ map: innerTex, side: THREE.FrontSide })
  );
  innerPillar.position.y = H / 2;
  scene.add(innerPillar);

  // Floor
  const floorTex = makeFloorTexture(maxAniso);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(R, 160),
    new THREE.MeshBasicMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Ceiling with warm recessed cove glow
  const ceilingTex = makeCeilingTexture(maxAniso);
  const ceiling = new THREE.Mesh(
    new THREE.CircleGeometry(R, 160),
    new THREE.MeshBasicMaterial({ map: ceilingTex, side: THREE.BackSide })
  );
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = H;
  scene.add(ceiling);

  // Architectural Museum Ceiling Track Rails & Spotlights
  const OUTER_TRACK_R = R - 1.38;
  const INNER_TRACK_R = RIN + 1.38;
  const TRACK_Y = H - 0.14;
  const CAN_Y = H - 0.28;

  const trackMat = new THREE.MeshBasicMaterial({ color: 0x453f5c });
  [OUTER_TRACK_R, INNER_TRACK_R].forEach((tr) => {
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(tr, 0.022, 8, 160),
      trackMat
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = TRACK_Y;
    scene.add(rail);
  });

  // Instanced Spotlight Stems, Aimed Fixture Cans, Warm Lenses, Light Shafts & Floor Pools
  const lightSpecs = [];
  for (let s = 0; s < OUTER_COUNT; s++) {
    lightSpecs.push({ wall: 'outer', th: s * STEP, trackR: OUTER_TRACK_R, wallR: R - 0.02 });
  }
  for (let k = 0; k < INNER_COUNT; k++) {
    lightSpecs.push({
      wall: 'inner',
      th: ((k + 0.5) * Math.PI * 2) / INNER_COUNT,
      trackR: INNER_TRACK_R,
      wallR: RIN + 0.02
    });
  }

  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, H - TRACK_Y + 0.14, 8);
  const canGeo = new THREE.CylinderGeometry(0.062, 0.046, 0.22, 14);
  canGeo.rotateX(Math.PI / 2);
  const lensGeo = new THREE.CircleGeometry(0.054, 14);
  lensGeo.translate(0, 0, 0.112);

  const beamTex = makeLightBeamTexture();
  const beamGeo = makeCrossedBeamGeometry(1.75, 4.15);
  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true
  });

  const floorPoolTex = makeRadialSpriteTexture('rgba(255, 253, 245, 0.48)', 0.18, 'rgba(255, 253, 245, 0)');
  const floorPoolGeo = new THREE.PlaneGeometry(2.35, 2.35);
  floorPoolGeo.rotateX(-Math.PI / 2);
  const floorPoolMat = new THREE.MeshBasicMaterial({
    map: floorPoolTex,
    transparent: true,
    depthWrite: false,
    fog: true
  });

  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffef8 });

  const stemInst = new THREE.InstancedMesh(stemGeo, trackMat, lightSpecs.length);
  const canInst = new THREE.InstancedMesh(canGeo, trackMat, lightSpecs.length);
  const lensInst = new THREE.InstancedMesh(lensGeo, lensMat, lightSpecs.length);
  const beamInst = new THREE.InstancedMesh(beamGeo, beamMat, lightSpecs.length);
  const floorPoolInst = new THREE.InstancedMesh(floorPoolGeo, floorPoolMat, lightSpecs.length);

  const _dummy = new THREE.Object3D();
  const _beamDummy = new THREE.Object3D();
  const _downVec = new THREE.Vector3(0, -1, 0);
  const _beamDir = new THREE.Vector3();
  const _fixturePos = new THREE.Vector3();
  const _artTarget = new THREE.Vector3();

  lightSpecs.forEach((spec, i) => {
    const cosT = Math.cos(spec.th);
    const sinT = Math.sin(spec.th);
    const fx = spec.trackR * cosT;
    const fz = spec.trackR * sinT;

    // Ceiling suspension stem
    _dummy.position.set(fx, (H + CAN_Y) * 0.5, fz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    stemInst.setMatrixAt(i, _dummy.matrix);

    // Spotlight housing & glowing aperture aimed at artwork center
    _fixturePos.set(fx, CAN_Y, fz);
    _artTarget.set(spec.wallR * cosT, PY + 0.1, spec.wallR * sinT);
    _dummy.position.copy(_fixturePos);
    _dummy.lookAt(_artTarget);
    _dummy.updateMatrix();
    canInst.setMatrixAt(i, _dummy.matrix);
    lensInst.setMatrixAt(i, _dummy.matrix);

    // Soft downward volumetric light shaft from spotlight lens
    _beamDir.copy(_artTarget).sub(_fixturePos).normalize();
    _beamDummy.position.copy(_fixturePos).addScaledVector(_beamDir, 0.11);
    _beamDummy.quaternion.setFromUnitVectors(_downVec, _beamDir);
    _beamDummy.updateMatrix();
    beamInst.setMatrixAt(i, _beamDummy.matrix);

    // Subtle warm ceiling light pool on the floor directly along fixture throw
    const poolR = spec.wall === 'outer' ? spec.trackR + 0.35 : spec.trackR - 0.35;
    _dummy.position.set(poolR * cosT, 0.008, poolR * sinT);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    floorPoolInst.setMatrixAt(i, _dummy.matrix);
  });

  stemInst.instanceMatrix.needsUpdate = true;
  canInst.instanceMatrix.needsUpdate = true;
  lensInst.instanceMatrix.needsUpdate = true;
  beamInst.instanceMatrix.needsUpdate = true;
  floorPoolInst.instanceMatrix.needsUpdate = true;
  scene.add(stemInst, canInst, lensInst, beamInst, floorPoolInst);

  // Shared Halo, Wall-Wash Scallop & Shadow textures & adaptive frame geometry cache
  const haloTex = makeRadialSpriteTexture('rgba(255,255,255,0.95)', 0.35, 'rgba(255,255,255,0)');
  const shadowTex = makeRadialSpriteTexture('rgba(120,90,50,0.28)', 0.25, 'rgba(120,90,50,0)');
  const wallWashTex = makeWallWashTexture();

  const labelGeo = new THREE.PlaneGeometry(0.92, (0.92 * 260) / 640);
  const frameGeoCache = new Map();

  function getFrameGeos(fw, fh) {
    const key = `${fw.toFixed(3)}x${fh.toFixed(3)}`;
    if (!frameGeoCache.has(key)) {
      frameGeoCache.set(key, {
        washGeo: new THREE.PlaneGeometry(fw * 2.15, H - 0.85),
        haloGeo: new THREE.PlaneGeometry(fw * 1.85, fh * 1.65),
        shadowGeo: new THREE.PlaneGeometry(fw * 1.18, fh * 1.16),
        frameGeo: new THREE.BoxGeometry(fw + 0.07, fh + 0.07, 0.06),
        artGeo: new THREE.PlaneGeometry(fw, fh)
      });
    }
    return frameGeoCache.get(key);
  }

  const wallWashMat = new THREE.MeshBasicMaterial({
    map: wallWashTex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    fog: true
  });
  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    fog: true
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false
  });

  // Prepare 40 aspect-matched artwork & label textures
  projectCanvases = [];
  projectTextures = state.projects.map((p) => {
    const { fw, fh } = getFrameSize(p);
    const longEdge = 720;
    const c = document.createElement('canvas');
    if (fw >= fh) {
      c.width = longEdge;
      c.height = Math.max(240, Math.round(longEdge * (fh / fw)));
    } else {
      c.height = longEdge;
      c.width = Math.max(240, Math.round(longEdge * (fw / fh)));
    }
    drawMattedArt(c, null);
    projectCanvases.push(c);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  });

  labelTextures = state.projects.map((p, idx) => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 260;
    drawLabelCanvas(c, p, idx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.userData = { canvas: c, project: p, index: idx };
    return tex;
  });

  function createFrameSlot(wall, th, projectIndex) {
    const project = state.projects[projectIndex];
    const { fw, fh } = getFrameSize(project);
    const { washGeo, haloGeo, shadowGeo, frameGeo, artGeo } = getFrameGeos(fw, fh);

    const group = new THREE.Group();
    const rad = wall === 'outer' ? R - 0.02 : RIN + 0.02;
    const x = rad * Math.cos(th);
    const z = rad * Math.sin(th);
    group.position.set(x, 0, z);
    if (wall === 'outer') {
      group.lookAt(0, 0, 0);
    } else {
      group.lookAt(2 * x, 0, 2 * z);
    }

    const wallWash = new THREE.Mesh(washGeo, wallWashMat);
    wallWash.position.set(0, H - (H - 0.85) / 2 - 0.04, 0.002);

    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, PY + 0.05, 0.006);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0.05, PY - 0.06, 0.01);

    const frameMat = new THREE.MeshBasicMaterial({ color: 0xd3aa72 });
    const frameBox = new THREE.Mesh(frameGeo, frameMat);
    frameBox.position.set(0, PY, 0.045);

    const artMat = new THREE.MeshBasicMaterial({
      map: projectTextures[projectIndex],
      transparent: true,
      opacity: 1
    });
    const artPlane = new THREE.Mesh(artGeo, artMat);
    artPlane.position.set(0, PY, 0.077);

    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTextures[projectIndex],
      transparent: true,
      depthWrite: false
    });
    const labelPlane = new THREE.Mesh(labelGeo, labelMat);
    labelPlane.position.set(-fw / 2 + 0.46, PY - fh / 2 - 0.36, 0.02);

    group.add(wallWash, halo, shadow, frameBox, artPlane, labelPlane);
    scene.add(group);

    const entry = {
      group,
      hitMesh: artPlane,
      artMat,
      frameMat,
      labelMat,
      wall,
      th,
      projectIndex,
      fw,
      fh
    };
    artPlane.userData.frameEntry = entry;
    frames.push(entry);
  }

  for (let s = 0; s < OUTER_COUNT; s++) {
    createFrameSlot('outer', s * STEP, s % state.projects.length);
  }
  for (let k = 0; k < INNER_COUNT; k++) {
    const pIdx = Math.floor((k * state.projects.length) / INNER_COUNT) % state.projects.length;
    createFrameSlot('inner', ((k + 0.5) * Math.PI * 2) / INNER_COUNT, pIdx);
  }

  // Initial pose (slightly behind walk pose for intro step-in)
  const walk = getWalkPose();
  const D = getD();
  camState.targetTh = D;
  if (isReduced()) {
    camState.th = D;
    camState.r = walk.r;
    camState.yaw = walk.yaw;
    camState.y = walk.y;
    camState.pitch = walk.pitch;
  } else {
    intro.fromTh = D + 0.16;
    intro.fromR = walk.r - 0.35;
    camState.th = intro.fromTh;
    camState.r = intro.fromR;
    camState.yaw = walk.yaw;
    camState.y = walk.y;
    camState.pitch = walk.pitch;
  }
  applyCameraPose();

  webglReady = true;
  loadAllTexturesAndFonts();
  startLoop();
  return true;
}

function showFallback() {
  fallbackEl.classList.add('is-visible');
  veilEl.classList.add('is-cleared');
  document.body.classList.add('ui-ready');
}

function loadProjectTexture(idx) {
  return new Promise((resolve) => {
    const p = state.projects[idx];
    const src = getCoverSrc(p);
    if (!src) return resolve();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawMattedArt(projectCanvases[idx], img);
      projectTextures[idx].needsUpdate = true;
      needsRender = true;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function loadAllTexturesAndFonts() {
  const priorityIndices = [0, 1, 2, 3, 38, 39, 15, 24, 32];
  const remaining = [];
  for (let i = 0; i < state.projects.length; i++) {
    if (!priorityIndices.includes(i)) remaining.push(i);
  }

  const priorityPromise = Promise.all(priorityIndices.filter((i) => i < state.projects.length).map(loadProjectTexture));
  const fontsPromise = document.fonts.ready.then(() => {
    labelTextures.forEach((tex) => {
      drawLabelCanvas(tex.userData.canvas, tex.userData.project, tex.userData.index);
      tex.needsUpdate = true;
    });
    needsRender = true;
  });

  const failsafe = new Promise((r) => setTimeout(r, 4000));
  await Promise.race([Promise.all([priorityPromise, fontsPromise]), failsafe]);
  beginOpeningAnimation();

  // Stream remaining textures in small batches so frame pacing stays silky
  for (let i = 0; i < remaining.length; i += 4) {
    await Promise.all(remaining.slice(i, i + 4).map(loadProjectTexture));
  }
}

function beginOpeningAnimation() {
  if (intro.started) return;
  intro.started = true;

  if (isReduced()) {
    veilEl.classList.add('is-cleared');
    document.body.classList.add('ui-ready');
    needsRender = true;
    return;
  }

  veilEl.classList.add('is-cleared');
  document.body.classList.add('animate-intro');
  document.body.classList.add('ui-ready');
  intro.active = true;
  intro.elapsed = 0;
  needsRender = true;
}

function applyCameraPose() {
  if (!camera) return;
  const { th, r, yaw, y, pitch } = camState;
  const cosT = Math.cos(th);
  const sinT = Math.sin(th);
  _pos.set(r * cosT, y, r * sinT);

  // Tangent (sin th, 0, -cos th), Outward normal (cos th, 0, sin th)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  _dir.set(
    cosY * sinT + sinY * cosT,
    0,
    cosY * -cosT + sinY * sinT
  );

  camera.position.copy(_pos);
  _look.copy(_pos).add(_dir);
  _look.y += pitch;
  camera.lookAt(_look);
}

/* ---------------- Walking & Focus Glide ---------------- */
function setHintMode(focused) {
  if (focused) {
    hintLine1El.textContent = 'Click the project to open it';
    hintLine2El.textContent = 'Esc or click away to step back';
  } else {
    hintLine1El.textContent = 'Scroll or drag to walk round';
    hintLine2El.textContent = 'Click a project to look closer';
  }
}

function startGlide(toPose, focusedFrame) {
  glide.focusedFrame = focusedFrame;
  setHintMode(Boolean(focusedFrame));

  if (isReduced()) {
    camState.th = toPose.th;
    camState.targetTh = toPose.th;
    camState.r = toPose.r;
    camState.yaw = toPose.yaw;
    camState.y = toPose.y;
    camState.pitch = toPose.pitch;
    glide.active = false;
    applyCameraPose();
    needsRender = true;
    updateOpenPillPosition();
    return;
  }

  glide.from = {
    th: camState.th,
    r: camState.r,
    yaw: camState.yaw,
    y: camState.y,
    pitch: camState.pitch
  };
  glide.to = { ...toPose };
  glide.elapsed = 0;
  glide.active = true;
  camState.targetTh = toPose.th;
  needsRender = true;
  startLoop();
}

function focusFrame(frame) {
  const fPose = getFocusPose(frame.wall, frame);
  const shortTh = nearestAngleCopy(frame.th, camState.th);
  startGlide(
    {
      th: shortTh,
      r: fPose.r,
      yaw: fPose.yaw,
      y: fPose.y,
      pitch: fPose.pitch
    },
    frame
  );
}

function stepBackToWalk(newTargetTh) {
  const walk = getWalkPose();
  const nextTh = typeof newTargetTh === 'number' ? newTargetTh : camState.th + getD();
  hideOpenPill();
  startGlide(
    {
      th: nextTh,
      r: walk.r,
      yaw: walk.yaw,
      y: walk.y,
      pitch: walk.pitch
    },
    null
  );
}

function snapWalkStep(dir) {
  const D = getD();
  if (glide.focusedFrame) {
    const baseTh = glide.focusedFrame.th + D;
    const next = (Math.round((baseTh - D) / STEP) - dir) * STEP + D;
    stepBackToWalk(next);
    return;
  }
  camState.targetTh = (Math.round((camState.targetTh - D) / STEP) - dir) * STEP + D;
  needsRender = true;
  startLoop();
}

/* ---------------- Render Loop ---------------- */
let rafId = 0;
let lastTime = 0;
let renderBusy = false;

function startLoop() {
  if (rafId) return;
  lastTime = performance.now();
  rafId = requestAnimationFrame(tick);
}

function tick(now) {
  rafId = 0;
  if (!webglReady) return;

  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  let active = false;

  if (intro.active) {
    intro.elapsed += dt;
    const t = Math.min(1, intro.elapsed / intro.duration);
    const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const walk = getWalkPose();
    const D = getD();
    camState.th = intro.fromTh + (D - intro.fromTh) * e;
    camState.r = intro.fromR + (walk.r - intro.fromR) * e;
    camState.targetTh = D;
    if (t >= 1) intro.active = false;
    else active = true;
    needsRender = true;
  } else if (glide.active) {
    glide.elapsed += dt;
    const t = Math.min(1, glide.elapsed / glide.duration);
    const eTh = 1 - Math.pow(1 - t, 4); // quartic
    const eYaw = 1 - Math.pow(1 - t, 2); // quadratic
    const eCub = 1 - Math.pow(1 - t, 3); // cubic

    camState.th = glide.from.th + (glide.to.th - glide.from.th) * eTh;
    camState.yaw = glide.from.yaw + (glide.to.yaw - glide.from.yaw) * eYaw;
    camState.r = glide.from.r + (glide.to.r - glide.from.r) * eCub;
    camState.y = glide.from.y + (glide.to.y - glide.from.y) * eCub;
    camState.pitch = glide.from.pitch + (glide.to.pitch - glide.from.pitch) * eCub;
    camState.targetTh = camState.th;

    if (t >= 1) {
      glide.active = false;
      updateOpenPillPosition();
    } else {
      active = true;
    }
    needsRender = true;
  } else if (!glide.focusedFrame) {
    const diff = camState.targetTh - camState.th;
    if (Math.abs(diff) > 1e-5) {
      if (isReduced()) {
        camState.th = camState.targetTh;
      } else {
        camState.th += diff * (1 - Math.exp(-dt / 0.36));
        active = true;
      }
      needsRender = true;
    } else if (diff !== 0) {
      camState.th = camState.targetTh;
      needsRender = true;
    }
  }

  if (needsRender && !renderBusy) {
    needsRender = false;
    applyCameraPose();
    renderer.render(scene, camera);
    if (glide.focusedFrame && isSmall()) {
      updateOpenPillPosition();
    }
  }

  if (active || needsRender) {
    rafId = requestAnimationFrame(tick);
  }
}

/* ---------------- Projection & Flyer Transition ---------------- */
function getProjectedFrameRect(frame) {
  if (!camera || !frame) return null;
  frame.hitMesh.updateMatrixWorld(true);
  const hw = (frame.fw || PW) / 2;
  const hh = (frame.fh || PH) / 2;
  const corners = [
    [-hw, hh, 0],
    [hw, hh, 0],
    [-hw, -hh, 0],
    [hw, -hh, 0]
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const [cx, cy, cz] of corners) {
    _corner.set(cx, cy, cz).applyMatrix4(frame.hitMesh.matrixWorld);
    _proj.copy(_corner).project(camera);
    const sx = ((_proj.x + 1) * 0.5) * w;
    const sy = ((1 - _proj.y) * 0.5) * h;
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (sx > maxX) maxX = sx;
    if (sy > maxY) maxY = sy;
  }
  return {
    left: minX,
    top: minY,
    width: Math.max(40, maxX - minX),
    height: Math.max(40, maxY - minY)
  };
}

function hideOpenPill() {
  openPillEl.classList.remove('is-visible');
}

function updateOpenPillPosition(clientX, clientY) {
  if (!glide.focusedFrame || state.activeView !== 'gallery') {
    hideOpenPill();
    return;
  }
  if (isSmall()) {
    const rect = getProjectedFrameRect(glide.focusedFrame);
    if (!rect) return;
    openPillEl.style.left = `${rect.left + rect.width * 0.5}px`;
    openPillEl.style.top = `${rect.top + rect.height * 0.55}px`;
    openPillEl.classList.add('is-visible');
    return;
  }
  if (typeof clientX === 'number' && typeof clientY === 'number') {
    openPillEl.style.left = `${clientX}px`;
    openPillEl.style.top = `${clientY}px`;
    openPillEl.classList.add('is-visible');
  }
}

/* ---------------- Open Project Page ---------------- */
let detailRevealTimer = 0;

function openProject(projectIndex, sourceRect) {
  const project = state.projects[projectIndex];
  if (!project) return;

  clearTimeout(detailRevealTimer);
  state.activeProjectIndex = projectIndex;
  state.activeImageIndex = 0;
  state.selectedQty = 1;
  state.activeView = 'page';

  hideOpenPill();
  document.body.classList.add('overlay-open');
  listEl.classList.remove('is-open');
  infoPageEl.classList.remove('is-open');
  pageEl.classList.add('is-open');
  pageEl.scrollTop = 0;

  // Populate content
  pageTitleEl.textContent = project.title;
  pageSubtitleEl.textContent = `${project.subtitle} · ${project.category} · ${project.status}`;
  pageDescEl.textContent = project.description;
  pageQtyEl.textContent = '1';

  const images = project.images && project.images.length
    ? project.images
    : [{ src: getCoverSrc(project), alt: project.title, label: project.status, width: project.cover?.width, height: project.cover?.height }];

  function syncArtFrameAspect(item) {
    const m = getMediaSize(project, item);
    pageArtFrameEl.style.aspectRatio = `${m.w} / ${m.h}`;
    if (!isSmall()) {
      pageArtFrameEl.style.width =
        m.ar >= 1.1
          ? 'min(100%, calc(480 * var(--w)))'
          : m.ar >= 0.85
            ? 'min(100%, calc(410 * var(--w)))'
            : 'min(100%, calc(340 * var(--w)))';
    } else {
      pageArtFrameEl.style.width = '';
    }
  }

  function renderActiveImage(imgIdx) {
    state.activeImageIndex = imgIdx;
    const item = images[imgIdx];
    syncArtFrameAspect(item);
    pageMainImgEl.onload = () => {
      if (pageMainImgEl.naturalWidth > 0 && pageMainImgEl.naturalHeight > 0) {
        pageArtFrameEl.style.aspectRatio = `${pageMainImgEl.naturalWidth} / ${pageMainImgEl.naturalHeight}`;
      }
    };
    pageMainImgEl.src = item.src;
    pageMainImgEl.alt = item.alt || item.label || project.title;
    pageCaptionEl.textContent = item.label || `${project.title} — Visual ${imgIdx + 1}`;
    pageCounterEl.textContent = `${imgIdx + 1} / ${images.length}`;
    pageThumbsEl.querySelectorAll('.page-thumb-btn').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === imgIdx);
    });
  }

  pageThumbsEl.innerHTML = '';
  if (images.length > 1) {
    images.forEach((img, idx) => {
      const m = getMediaSize(project, img);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `page-thumb-btn${idx === 0 ? ' is-active' : ''}`;
      b.style.aspectRatio = `${m.w} / ${m.h}`;
      b.setAttribute('aria-label', `View image ${idx + 1}: ${img.label || project.title}`);
      const im = document.createElement('img');
      im.src = img.src;
      im.alt = '';
      im.width = m.w;
      im.height = m.h;
      im.loading = 'lazy';
      im.referrerPolicy = 'no-referrer';
      b.appendChild(im);
      b.addEventListener('click', () => renderActiveImage(idx));
      pageThumbsEl.appendChild(b);
    });
  }
  renderActiveImage(0);

  // Update mini frame preview thumbnails with distinct aspect-matched project visuals
  const coverSrc = getCoverSrc(project);
  const conceptItem =
    images.find((it) => /concept|3d|render/i.test(`${it.stage || ''} ${it.label || ''}`)) || images[0];
  const onsiteItem =
    images.find((it) => it !== conceptItem && /on-site|site|built|install/i.test(`${it.stage || ''} ${it.label || ''}`)) ||
    images.find((it) => it !== conceptItem) ||
    conceptItem;
  const thirdItem =
    images.find((it) => it !== conceptItem && it !== onsiteItem) ||
    images[images.length - 1] ||
    conceptItem;
  const chipItems = [conceptItem, onsiteItem, thirdItem];

  document.querySelectorAll('.frame-mini').forEach((mini, idx) => {
    const item = chipItems[idx] || conceptItem;
    const m = getMediaSize(project, item);
    const scale = Math.min(64 / m.w, 46 / m.h);
    mini.style.width = `${Math.max(24, Math.round(m.w * scale))}px`;
    mini.style.height = `${Math.max(24, Math.round(m.h * scale))}px`;
    const im = mini.querySelector('img');
    if (im) {
      im.src = item.src || coverSrc;
      im.alt = item.label || project.title;
      im.width = m.w;
      im.height = m.h;
    }
  });

  // Update save state
  updateSaveButton();

  // Film links (only valid Drive links from films.json)
  pageFilmSlotEl.innerHTML = '';
  if (project.id === 'event-highlights' && state.films.length) {
    const linked = state.films.filter((v) => v.drive && v.drive.trim());
    linked.forEach((clip) => {
      const card = document.createElement('div');
      card.className = 'page-film-card';
      card.innerHTML = `
        <div>
          <strong>${clip.label || 'Event film'}</strong>
          <span>External Google Drive reel · Opens in a new tab</span>
        </div>
        <a class="page-film-link" href="${clip.drive}" target="_blank" rel="noopener noreferrer">Watch film ↗</a>
      `;
      pageFilmSlotEl.appendChild(card);
    });
  }

  // More from the archive (next 4 projects)
  collectionRowEl.innerHTML = '';
  for (let offset = 1; offset <= 4; offset++) {
    const idx = (projectIndex + offset) % state.projects.length;
    const p = state.projects[idx];
    const card = buildProjectCard(p, idx);
    collectionRowEl.appendChild(card);
  }

  // Reveal choreography (Flyer + 1.0s detail fade, or instant under reduced motion)
  pageMetaRowEl.classList.remove('is-revealed');
  pageThumbsEl.classList.remove('is-revealed');
  pageRightEl.classList.remove('is-revealed');
  collectionBandEl.classList.remove('is-revealed');

  if (isReduced() || !sourceRect) {
    pageArtFrameEl.classList.remove('is-flying-hidden');
    pageMetaRowEl.classList.add('is-revealed');
    pageThumbsEl.classList.add('is-revealed');
    pageRightEl.classList.add('is-revealed');
    collectionBandEl.classList.add('is-revealed');
    return;
  }

  pageArtFrameEl.classList.add('is-flying-hidden');
  requestAnimationFrame(() => {
    const targetRect = pageArtFrameEl.getBoundingClientRect();
    const flyer = document.createElement('div');
    flyer.style.position = 'fixed';
    flyer.style.left = `${sourceRect.left}px`;
    flyer.style.top = `${sourceRect.top}px`;
    flyer.style.width = `${sourceRect.width}px`;
    flyer.style.height = `${sourceRect.height}px`;
    flyer.style.zIndex = '28';
    flyer.style.background = '#F6EAD8';
    flyer.style.padding = '8px';
    flyer.style.border = '1px solid rgba(211, 170, 114, 0.72)';
    flyer.style.display = 'flex';
    flyer.style.alignItems = 'center';
    flyer.style.justifyContent = 'center';
    flyer.style.pointerEvents = 'none';
    flyer.style.transformOrigin = 'top left';

    const fImg = document.createElement('img');
    fImg.src = (images[0] && images[0].src) || coverSrc;
    fImg.alt = '';
    fImg.style.width = '100%';
    fImg.style.height = '100%';
    fImg.style.objectFit = 'contain';
    flyer.appendChild(fImg);
    document.body.appendChild(flyer);

    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const sx = targetRect.width / Math.max(1, sourceRect.width);
    const sy = targetRect.height / Math.max(1, sourceRect.height);

    const anim = flyer.animate(
      [
        { transform: 'translate(0px, 0px) scale(1, 1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }
      ],
      { duration: 300, easing: 'cubic-bezier(0.25, 0.75, 0.25, 1)', fill: 'forwards' }
    );

    anim.onfinish = () => {
      pageArtFrameEl.classList.remove('is-flying-hidden');
      flyer.remove();
    };
  });

  detailRevealTimer = setTimeout(() => {
    pageMetaRowEl.classList.add('is-revealed');
    pageThumbsEl.classList.add('is-revealed');
    pageRightEl.classList.add('is-revealed');
    collectionBandEl.classList.add('is-revealed');
  }, 1000);
}

function updateSaveButton() {
  if (state.activeProjectIndex === null) return;
  const p = state.projects[state.activeProjectIndex];
  const isSaved = state.savedIds.has(p.id);
  pageSaveBtn.classList.toggle('is-saved', isSaved);
  pageSaveBtn.querySelector('span').textContent = isSaved ? 'Saved' : 'Save';
}

/* ---------------- Cards & List View ---------------- */
function buildProjectCard(project, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-tile';
  const coverSrc = getCoverSrc(project);
  const count = (project.images || []).length;
  const m = getMediaSize(project);
  const frameDimStyle =
    m.ar >= 4 / 3
      ? `aspect-ratio: ${m.w} / ${m.h}; width: 100%; height: auto;`
      : `aspect-ratio: ${m.w} / ${m.h}; width: ${(75 * m.ar).toFixed(3)}%; height: auto;`;

  btn.innerHTML = `
    <div class="card-tile-media">
      <div class="card-tile-frame" style="${frameDimStyle}">
        <img src="${coverSrc}" alt="${project.title}" width="${m.w}" height="${m.h}" loading="lazy" referrerpolicy="no-referrer" />
      </div>
    </div>
    <span class="card-tile-title">${project.title}</span>
    <span class="card-tile-sub">${project.subtitle}</span>
    <span class="card-tile-meta">${project.category} · ${project.status} · ${count}</span>
  `;

  btn.addEventListener('click', () => {
    const frameEl = btn.querySelector('.card-tile-frame') || btn.querySelector('.card-tile-media');
    const mediaRect = frameEl.getBoundingClientRect();
    openProject(index, mediaRect);
  });

  return btn;
}

function renderListGrid() {
  listGridEl.innerHTML = '';
  const filtered = [];
  state.projects.forEach((p, idx) => {
    if (matchesCategory(p, state.listCategory) && matchesStage(p, state.listStage)) {
      filtered.push({ p, idx });
    }
  });
  filtered.forEach(({ p, idx }) => {
    listGridEl.appendChild(buildProjectCard(p, idx));
  });
  listCountEl.textContent = `Showing ${filtered.length} of ${state.projects.length} projects`;

  document.querySelectorAll('[data-list-cat]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.listCat === state.listCategory);
  });
  document.querySelectorAll('[data-list-stage]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.listStage === state.listStage);
  });
}

/* ---------------- View Switching ---------------- */
function updateNavActive() {
  document.querySelectorAll('.nav-link').forEach((el) => {
    const target = el.dataset.nav;
    el.classList.toggle('is-active', target === state.activeView);
  });
  toggleGalleryBtn.classList.toggle('is-active', state.activeView === 'gallery');
  toggleListBtn.classList.toggle('is-active', state.activeView === 'list');
}

function openGalleryView(focusLast = true) {
  clearTimeout(detailRevealTimer);
  const wasInOverlay = state.activeView !== 'gallery';
  const lastIdx = state.activeProjectIndex;

  state.activeView = 'gallery';
  document.body.classList.remove('overlay-open');
  pageEl.classList.remove('is-open');
  listEl.classList.remove('is-open');
  infoPageEl.classList.remove('is-open');
  updateNavActive();

  if (wasInOverlay && focusLast && lastIdx !== null && frames.length) {
    // Find outer-wall copy of last viewed project closest to current angle
    const outerMatches = frames.filter((f) => f.wall === 'outer' && f.projectIndex === lastIdx);
    const chosen = outerMatches[0] || frames[0];
    focusFrame(chosen);
  }
}

function openListView(catOverride) {
  clearTimeout(detailRevealTimer);
  if (catOverride) state.listCategory = catOverride;
  state.activeView = 'list';
  hideOpenPill();
  document.body.classList.add('overlay-open');
  pageEl.classList.remove('is-open');
  infoPageEl.classList.remove('is-open');
  listEl.classList.add('is-open');
  listEl.scrollTop = 0;
  renderListGrid();
  updateNavActive();
}

function openInfoView() {
  clearTimeout(detailRevealTimer);
  state.activeView = 'info';
  hideOpenPill();
  document.body.classList.add('overlay-open');
  pageEl.classList.remove('is-open');
  listEl.classList.remove('is-open');
  infoPageEl.classList.add('is-open');
  infoPageEl.scrollTop = 0;
  updateNavActive();
}

function applyGalleryCategory(cat) {
  state.activeCategory = cat;
  state.listCategory = cat;
  catLabelEl.textContent = cat === 'ALL' ? `ALL · ${state.projects.length}` : cat;
  catMenuEl.querySelectorAll('.nav-cat-option').forEach((opt) => {
    opt.classList.toggle('is-selected', opt.dataset.cat === cat);
  });

  frames.forEach((f) => {
    const p = state.projects[f.projectIndex];
    const match = matchesCategory(p, cat);
    f.artMat.opacity = match ? 1 : 0.25;
    f.labelMat.opacity = match ? 1 : 0.28;
    f.frameMat.color.setHex(match ? 0xd3aa72 : 0xe4d6be);
  });
  needsRender = true;
  startLoop();

  if (state.activeView === 'list') {
    renderListGrid();
  } else if (cat !== 'ALL' && frames.length) {
    // Walk to first matching outer frame
    const matchFrame = frames.find((f) => f.wall === 'outer' && matchesCategory(state.projects[f.projectIndex], cat));
    if (matchFrame) {
      stepBackToWalk(nearestAngleCopy(matchFrame.th + getD(), camState.th));
    }
  }
}

/* ---------------- Brief Drawer ---------------- */
function openDrawer() {
  drawerEl.classList.add('is-open');
  drawerBackdropEl.classList.add('is-open');
  renderDrawer();
}

function closeDrawer() {
  drawerEl.classList.remove('is-open');
  drawerBackdropEl.classList.remove('is-open');
}

function updateBriefBadge() {
  const total = state.briefItems.reduce((acc, item) => acc + item.qty, 0);
  briefBadgeEl.textContent = String(total);
  briefBadgeEl.hidden = total === 0;
  drawerCountEl.textContent = `${total} reference${total === 1 ? '' : 's'}`;
}

function addCurrentProjectToBrief() {
  if (state.activeProjectIndex === null) return;
  const project = state.projects[state.activeProjectIndex];
  const { type, scale, deliverables, stage } = state.selectedOptions;
  const key = `${project.id}|${type}|${scale}|${deliverables}|${stage}`;
  const existing = state.briefItems.find((x) => x.key === key);
  if (existing) {
    existing.qty = Math.min(9, existing.qty + state.selectedQty);
    existing.justAdded = true;
  } else {
    const m = getMediaSize(project);
    state.briefItems.push({
      key,
      id: project.id,
      title: project.title,
      subtitle: project.subtitle,
      thumb: getCoverSrc(project),
      thumbW: m.w,
      thumbH: m.h,
      type,
      scale,
      deliverables,
      stage,
      qty: state.selectedQty,
      justAdded: true
    });
  }
  persistSession();
  updateBriefBadge();
  openDrawer();
}

function renderDrawer() {
  updateBriefBadge();
  drawerBodyEl.innerHTML = '';

  if (state.briefItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'drawer-empty';
    empty.innerHTML = `
      YOUR ENQUIRY BRIEF IS EMPTY<br><br>
      Explore any project in the 3D gallery and add it as a visual reference, or open the Guided Interview in About.
    `;
    drawerBodyEl.appendChild(empty);
    return;
  }

  state.briefItems.forEach((item, idx) => {
    const proj = state.projects.find((p) => p.id === item.id);
    const m = item.thumbW && item.thumbH
      ? { w: item.thumbW, h: item.thumbH, ar: Math.max(0.52, Math.min(2.35, item.thumbW / item.thumbH)) }
      : getMediaSize(proj);
    const thumbStyle = m.ar >= 1
      ? `aspect-ratio: ${m.w} / ${m.h}; width: 100%;`
      : `aspect-ratio: ${m.w} / ${m.h}; height: 74px; width: auto;`;
    const row = document.createElement('div');
    row.className = `drawer-item${item.justAdded ? ' is-entering' : ''}`;
    item.justAdded = false;
    row.innerHTML = `
      <div class="drawer-item-thumb" style="${thumbStyle}">
        <img src="${item.thumb}" alt="${item.title}" width="${m.w}" height="${m.h}" referrerpolicy="no-referrer" />
      </div>
      <div>
        <p class="drawer-item-title">${item.title}</p>
        <p class="drawer-item-sub">${item.type} · ${item.scale}</p>
        <p class="drawer-item-meta">${item.deliverables} · ${item.stage}</p>
        <div class="drawer-item-actions">
          <div class="drawer-mini-qty">
            <button type="button" data-d-minus="${idx}" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" data-d-plus="${idx}" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="drawer-remove" data-d-del="${idx}" aria-label="Remove ${item.title}">✕</button>
        </div>
      </div>
    `;
    drawerBodyEl.appendChild(row);
  });

  const notes = document.createElement('div');
  notes.className = 'drawer-notes-box';
  notes.innerHTML = `
    <input id="drawer-client-name" type="text" placeholder="Your name or company" />
    <input id="drawer-client-date" type="text" placeholder="Target event / installation date (optional)" />
    <textarea id="drawer-client-notes" rows="2" placeholder="Dimensions, venue or special notes"></textarea>
  `;
  drawerBodyEl.appendChild(notes);

  drawerBodyEl.querySelectorAll('[data-d-minus]').forEach((b) => {
    b.addEventListener('click', () => {
      const i = Number(b.dataset.dMinus);
      if (state.briefItems[i].qty > 1) state.briefItems[i].qty--;
      else state.briefItems.splice(i, 1);
      persistSession();
      renderDrawer();
    });
  });

  drawerBodyEl.querySelectorAll('[data-d-plus]').forEach((b) => {
    b.addEventListener('click', () => {
      const i = Number(b.dataset.dPlus);
      state.briefItems[i].qty = Math.min(9, state.briefItems[i].qty + 1);
      persistSession();
      renderDrawer();
    });
  });

  drawerBodyEl.querySelectorAll('[data-d-del]').forEach((b) => {
    b.addEventListener('click', () => {
      const i = Number(b.dataset.dDel);
      state.briefItems.splice(i, 1);
      persistSession();
      renderDrawer();
    });
  });
}

function buildDrawerBriefSummary() {
  const name = document.getElementById('drawer-client-name')?.value.trim() || 'Not specified';
  const date = document.getElementById('drawer-client-date')?.value.trim() || 'To be discussed';
  const notes = document.getElementById('drawer-client-notes')?.value.trim() || 'None';

  const refs = state.briefItems.length
    ? state.briefItems
        .map(
          (x, i) =>
            `${i + 1}. ${x.title} (×${x.qty}) — ${x.type}, ${x.scale}, ${x.deliverables} [${x.stage}]`
        )
        .join('\n')
    : 'General portfolio enquiry';

  return (
    `PORTFOLIO ENQUIRY — IJASHUL HAQUE\n\n` +
    `Name / Company: ${name}\n` +
    `Target Date: ${date}\n\n` +
    `Selected Reference Projects:\n${refs}\n\n` +
    `Notes: ${notes}\n\n` +
    `Sent for design review. This enquiry does not create a booking or an agreement.`
  );
}

/* ---------------- Lightbox ---------------- */
function openLightbox() {
  if (state.activeProjectIndex === null) return;
  const project = state.projects[state.activeProjectIndex];
  const images = project.images && project.images.length
    ? project.images
    : [{ src: getCoverSrc(project), alt: project.title, label: project.status }];

  state.lightboxOpen = true;
  state.lightboxZoomed = false;
  updateLightboxImage(images);
  lightboxEl.classList.add('is-open');
}

function updateLightboxImage(images) {
  const item = images[state.activeImageIndex] || images[0];
  lbImgEl.src = item.src;
  lbImgEl.alt = item.alt || item.label || '';
  lbImgEl.style.transform = state.lightboxZoomed ? 'scale(1.6)' : 'scale(1)';
  lbCounterEl.textContent = `${state.activeImageIndex + 1} / ${images.length}`;
  lbCaptionEl.textContent = item.label || '';
}

function stepLightbox(delta) {
  if (state.activeProjectIndex === null) return;
  const project = state.projects[state.activeProjectIndex];
  const images = project.images && project.images.length ? project.images : [];
  if (!images.length) return;
  const next = (state.activeImageIndex + delta + images.length) % images.length;
  state.activeImageIndex = next;
  state.lightboxZoomed = false;
  updateLightboxImage(images);

  // Sync project page behind lightbox
  const item = images[next];
  const m = getMediaSize(project, item);
  pageArtFrameEl.style.aspectRatio = `${m.w} / ${m.h}`;
  if (!isSmall()) {
    pageArtFrameEl.style.width =
      m.ar >= 1.1
        ? 'min(100%, calc(480 * var(--w)))'
        : m.ar >= 0.85
          ? 'min(100%, calc(410 * var(--w)))'
          : 'min(100%, calc(340 * var(--w)))';
  }
  pageMainImgEl.src = item.src;
  pageMainImgEl.alt = item.alt || item.label || project.title;
  pageCaptionEl.textContent = item.label || '';
  pageCounterEl.textContent = `${next + 1} / ${images.length}`;
  pageThumbsEl.querySelectorAll('.page-thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('is-active', i === next);
  });
}

function closeLightbox() {
  state.lightboxOpen = false;
  state.lightboxZoomed = false;
  lightboxEl.classList.remove('is-open');
}

/* ---------------- Search Modal ---------------- */
function openSearch() {
  state.searchOpen = true;
  searchModalEl.classList.add('is-open');
  searchInputEl.value = '';
  state.searchCursor = 0;
  renderSearchResults('');
  setTimeout(() => searchInputEl.focus(), 20);
}

function closeSearch() {
  state.searchOpen = false;
  searchModalEl.classList.remove('is-open');
}

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  const matches = [];
  state.projects.forEach((p, idx) => {
    const hay = `${p.title} ${p.subtitle} ${p.category} ${p.status} ${p.description}`.toLowerCase();
    if (!q || hay.includes(q)) matches.push({ p, idx });
  });

  searchResultsEl.innerHTML = '';
  if (!matches.length) {
    searchResultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink-60);font-family:var(--font-mono);font-size:12px;">No matching projects found.</div>';
    return;
  }

  matches.slice(0, 14).forEach(({ p, idx }, rowIdx) => {
    const m = getMediaSize(p);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `search-row${rowIdx === state.searchCursor ? ' is-focused' : ''}`;
    row.innerHTML = `
      <div class="search-row-thumb">
        <img src="${getCoverSrc(p)}" alt="" width="${m.w}" height="${m.h}" style="aspect-ratio: ${m.w} / ${m.h}" loading="lazy" referrerpolicy="no-referrer" />
      </div>
      <div class="search-row-text">
        <div class="search-row-title">${p.title}</div>
        <div class="search-row-meta">${p.category} · ${p.status} · ${(p.images || []).length} visuals</div>
      </div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-60);">OPEN →</span>
    `;
    row.addEventListener('click', () => {
      closeSearch();
      openProject(idx, null);
    });
    searchResultsEl.appendChild(row);
  });
}

/* ---------------- Guided Brief Form (in Info Page) ---------------- */
function setupBriefFormAndInterview() {
  const form = document.getElementById('info-brief-form');
  const status = document.getElementById('info-brief-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const action = e.submitter?.value || 'whatsapp';
      const msg =
        `PROJECT ENQUIRY — IJASHUL HAQUE\n\n` +
        `Name / Company: ${data.name || 'Not provided'}\n` +
        `Project Type: ${data.type || 'Not specified'}\n` +
        `Dimensions: ${data.size || 'Not decided'}\n` +
        `Target Date: ${data.date || 'Not fixed'}\n\n` +
        `Description:\n${data.description || ''}\n\n` +
        `Submitted for design review. This enquiry does not create a booking or an agreement.`;

      if (action === 'download') {
        const blob = new Blob([msg], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ijashul-haque-project-brief.txt';
        a.click();
        URL.revokeObjectURL(url);
        status.textContent = 'Brief downloaded as ijashul-haque-project-brief.txt.';
      } else {
        const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        status.textContent = 'WhatsApp draft prepared in a new tab.';
      }
    });
  }

  // Guided Interview inside Info Page
  const ivBox = document.getElementById('interview-box');
  if (!ivBox) return;

  function renderInterview() {
    const qs = interviewQuestions(state.interviewAnswers.type || '');
    if (state.interviewStep >= qs.length) {
      const txt = briefText(state.interviewAnswers);
      ivBox.innerHTML = `
        <p class="info-kicker">GUIDED BRIEF READY</p>
        <pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:11.5px;background:var(--wall);padding:14px;border:1px solid var(--ink-15);max-height:240px;overflow:auto;">${txt.replace(/</g, '&lt;')}</pre>
        <div class="brief-actions">
          <button type="button" class="btn-outline" id="iv-restart">Start over</button>
          <a class="btn-ink" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener noreferrer">Send on WhatsApp ↗</a>
        </div>
      `;
      document.getElementById('iv-restart').addEventListener('click', () => {
        state.interviewStep = 0;
        state.interviewAnswers = {};
        renderInterview();
      });
      return;
    }

    const q = qs[state.interviewStep];
    const currentVal = state.interviewAnswers[q.key] || '';
    ivBox.innerHTML = `
      <p class="info-kicker">STEP ${state.interviewStep + 1} OF ${qs.length} · ${q.label}</p>
      <p style="font-size:16px;margin:0 0 12px;">${q.prompt}</p>
      <div class="opt-chips" id="iv-choices" style="margin-bottom:12px;"></div>
      <input id="iv-input" type="text" value="${currentVal.replace(/"/g, '&quot;')}" placeholder="Type your answer..." style="width:100%;background:var(--wall);border:1px solid var(--ink-35);padding:10px 12px;font-family:var(--font-serif);font-size:14px;" />
      <div class="brief-actions">
        ${state.interviewStep > 0 ? '<button type="button" class="btn-outline" id="iv-prev">← Back</button>' : ''}
        <button type="button" class="btn-ink" id="iv-next">Next →</button>
      </div>
    `;
    const choicesEl = document.getElementById('iv-choices');
    (q.choices || []).forEach((ch) => {
      const cBtn = document.createElement('button');
      cBtn.type = 'button';
      cBtn.className = `opt-chip${currentVal === ch ? ' is-selected' : ''}`;
      cBtn.textContent = ch;
      cBtn.addEventListener('click', () => {
        state.interviewAnswers[q.key] = ch;
        state.interviewStep++;
        renderInterview();
      });
      choicesEl.appendChild(cBtn);
    });
    const input = document.getElementById('iv-input');
    document.getElementById('iv-next').addEventListener('click', () => {
      state.interviewAnswers[q.key] = input.value.trim() || 'To be discussed';
      state.interviewStep++;
      renderInterview();
    });
    const prevBtn = document.getElementById('iv-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        state.interviewStep = Math.max(0, state.interviewStep - 1);
        renderInterview();
      });
    }
  }
  renderInterview();
}

/* ---------------- Event Binding ---------------- */
function bindEvents() {
  // Resize
  window.addEventListener('resize', () => {
    if (!webglReady) return;
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.fov = w >= h ? 56 : 70;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    needsRender = true;
    startLoop();
  });

  // Wheel walking
  galleryEl.addEventListener(
    'wheel',
    (e) => {
      if (state.activeView !== 'gallery' || state.searchOpen) return;
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 33;
      if (glide.focusedFrame) {
        stepBackToWalk(camState.th - dy * 0.0016 + getD());
        return;
      }
      camState.targetTh -= dy * 0.0016;
      needsRender = true;
      startLoop();
    },
    { passive: false }
  );

  // Pointer drag & raycast click
  galleryEl.addEventListener('pointerdown', (e) => {
    if (state.activeView !== 'gallery') return;
    pointerState.down = true;
    pointerState.dragging = false;
    pointerState.startX = e.clientX;
    pointerState.startY = e.clientY;
    pointerState.startTh = camState.targetTh;
    pointerState.lastX = e.clientX;
    pointerState.lastY = e.clientY;
    galleryEl.setPointerCapture?.(e.pointerId);
  });

  galleryEl.addEventListener('pointermove', (e) => {
    if (state.activeView !== 'gallery' || !webglReady) return;

    if (pointerState.down) {
      const dx = e.clientX - pointerState.startX;
      const dy = e.clientY - pointerState.startY;
      if (!pointerState.dragging && Math.hypot(dx, dy) > 6) {
        pointerState.dragging = true;
        galleryEl.classList.add('is-dragging');
        if (glide.focusedFrame) {
          stepBackToWalk();
          pointerState.startTh = camState.targetTh;
        }
      }
      if (pointerState.dragging) {
        const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        const sens = isSmall() ? 0.0042 : 0.0022;
        camState.targetTh = pointerState.startTh + dominant * sens;
        needsRender = true;
        startLoop();
      }
      return;
    }

    // Hover raycast
    _mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    _raycaster.setFromCamera(_mouse, camera);
    const hits = _raycaster.intersectObjects(
      frames.map((f) => f.hitMesh),
      false
    );
    const hitFrame = hits.length ? hits[0].object.userData.frameEntry : null;
    pointerState.hoveredFrame = hitFrame;
    galleryEl.classList.toggle('is-hovering', Boolean(hitFrame));

    if (glide.focusedFrame && hitFrame === glide.focusedFrame) {
      updateOpenPillPosition(e.clientX, e.clientY);
    } else if (!isSmall()) {
      hideOpenPill();
    }
  });

  galleryEl.addEventListener('pointerup', (e) => {
    if (!pointerState.down) return;
    const wasDragging = pointerState.dragging;
    pointerState.down = false;
    pointerState.dragging = false;
    galleryEl.classList.remove('is-dragging');

    if (wasDragging || state.activeView !== 'gallery' || !webglReady) return;

    _mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    _raycaster.setFromCamera(_mouse, camera);
    const hits = _raycaster.intersectObjects(
      frames.map((f) => f.hitMesh),
      false
    );
    if (hits.length) {
      const hitFrame = hits[0].object.userData.frameEntry;
      if (glide.focusedFrame === hitFrame) {
        const rect = getProjectedFrameRect(hitFrame);
        openProject(hitFrame.projectIndex, rect);
      } else {
        focusFrame(hitFrame);
      }
    } else if (glide.focusedFrame) {
      stepBackToWalk();
    }
  });

  // Arrows
  arrowPrevBtn.addEventListener('click', () => snapWalkStep(-1));
  arrowNextBtn.addEventListener('click', () => snapWalkStep(1));

  // Toggle Gallery / List
  toggleGalleryBtn.addEventListener('click', () => openGalleryView(true));
  toggleListBtn.addEventListener('click', () => openListView());
  document.getElementById('enter-archive-link').addEventListener('click', (e) => {
    e.preventDefault();
    openListView('ALL');
  });
  document.getElementById('fallback-archive-btn').addEventListener('click', () => openListView('ALL'));

  // Nav Logo & Links
  document.getElementById('nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    openGalleryView(true);
  });
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const t = link.dataset.nav;
      if (t === 'gallery') openGalleryView(true);
      else if (t === 'list') openListView();
      else if (t === 'info') openInfoView();
      else if (t === 'enquire') openDrawer();
    });
  });

  // Category Pill Menu
  catPillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    catMenuEl.classList.toggle('is-open');
  });
  document.addEventListener('click', () => catMenuEl.classList.remove('is-open'));

  // Nav Icons
  document.getElementById('nav-about-icon').addEventListener('click', openInfoView);
  document.getElementById('nav-saved-icon').addEventListener('click', () => openListView('SAVED'));
  document.getElementById('nav-brief-icon').addEventListener('click', openDrawer);
  document.getElementById('nav-search-btn').addEventListener('click', openSearch);

  // Project Page Controls
  document.getElementById('page-back-gallery').addEventListener('click', () => openGalleryView(true));
  document.getElementById('page-back-list').addEventListener('click', () => openListView());
  document.getElementById('page-fullscreen-btn').addEventListener('click', openLightbox);
  pageArtFrameEl.addEventListener('click', openLightbox);
  pageSaveBtn.addEventListener('click', () => {
    if (state.activeProjectIndex === null) return;
    const p = state.projects[state.activeProjectIndex];
    if (state.savedIds.has(p.id)) state.savedIds.delete(p.id);
    else state.savedIds.add(p.id);
    persistSession();
    updateSaveButton();
  });

  // Option Chips
  document.querySelectorAll('[data-opt-group]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.optGroup;
      const val = chip.dataset.optVal;
      state.selectedOptions[group] = val;
      document.querySelectorAll(`[data-opt-group="${group}"]`).forEach((c) => {
        c.classList.toggle('is-selected', c === chip);
      });
      const valLabel = document.getElementById(`opt-val-${group}`);
      if (valLabel) valLabel.textContent = val;
    });
  });

  // Stepper & Add to Brief
  document.getElementById('qty-minus').addEventListener('click', () => {
    state.selectedQty = Math.max(1, state.selectedQty - 1);
    pageQtyEl.textContent = String(state.selectedQty);
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    state.selectedQty = Math.min(9, state.selectedQty + 1);
    pageQtyEl.textContent = String(state.selectedQty);
  });
  document.getElementById('add-to-brief-btn').addEventListener('click', addCurrentProjectToBrief);

  // Accordions
  document.querySelectorAll('.acc-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item');
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // List View Filters
  document.querySelectorAll('[data-list-cat]').forEach((b) => {
    b.addEventListener('click', () => {
      state.listCategory = b.dataset.listCat;
      renderListGrid();
    });
  });
  document.querySelectorAll('[data-list-stage]').forEach((b) => {
    b.addEventListener('click', () => {
      state.listStage = b.dataset.listStage;
      renderListGrid();
    });
  });

  // Drawer Controls
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  drawerBackdropEl.addEventListener('click', closeDrawer);
  document.getElementById('drawer-whatsapp-btn').addEventListener('click', () => {
    const txt = buildDrawerBriefSummary();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('drawer-download-btn').addEventListener('click', () => {
    const txt = buildDrawerBriefSummary();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ijashul-haque-enquiry-brief.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Lightbox Controls
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lb-next').addEventListener('click', () => stepLightbox(1));
  document.getElementById('lb-zoom').addEventListener('click', () => {
    state.lightboxZoomed = !state.lightboxZoomed;
    lbImgEl.style.transform = state.lightboxZoomed ? 'scale(1.6)' : 'scale(1)';
  });
  lbImgEl.addEventListener('dblclick', () => {
    state.lightboxZoomed = !state.lightboxZoomed;
    lbImgEl.style.transform = state.lightboxZoomed ? 'scale(1.6)' : 'scale(1)';
  });

  // Search Modal
  document.getElementById('search-close').addEventListener('click', closeSearch);
  searchModalEl.addEventListener('click', (e) => {
    if (e.target === searchModalEl) closeSearch();
  });
  searchInputEl.addEventListener('input', (e) => {
    state.searchCursor = 0;
    renderSearchResults(e.target.value);
  });

  // Global Keyboard
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (state.searchOpen) closeSearch();
      else openSearch();
      return;
    }

    if (e.key === 'Escape') {
      if (state.lightboxOpen) { closeLightbox(); return; }
      if (state.searchOpen) { closeSearch(); return; }
      if (drawerEl.classList.contains('is-open')) { closeDrawer(); return; }
      if (state.activeView !== 'gallery') { openGalleryView(true); return; }
      if (glide.focusedFrame) { stepBackToWalk(); return; }
      return;
    }

    if (state.lightboxOpen) {
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      return;
    }

    if (state.activeView === 'gallery' && !state.searchOpen && !drawerEl.classList.contains('is-open')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        snapWalkStep(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        snapWalkStep(-1);
      }
    }
  });
}

/* ---------------- Bootstrap ---------------- */
async function init() {
  try {
    const [projRes, filmsRes] = await Promise.all([
      fetch('projects.json'),
      fetch('films.json').catch(() => null)
    ]);
    state.projects = await projRes.json();
    if (filmsRes && filmsRes.ok) {
      const fData = await filmsRes.json();
      state.films = (fData.projects && fData.projects[0] && fData.projects[0].videos) || [];
    }
  } catch (err) {
    console.error('Failed to load portfolio data:', err);
    showFallback();
    return;
  }

  // Populate Category Dropdown
  const cats = getCategoryList(state.projects);
  catMenuEl.innerHTML = '';
  cats.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `nav-cat-option${c === 'ALL' ? ' is-selected' : ''}`;
    btn.dataset.cat = c;
    const count = c === 'ALL'
      ? state.projects.length
      : state.projects.filter((p) => p.category === c).length;
    btn.innerHTML = `<span>${c}</span><span>${count}</span>`;
    btn.addEventListener('click', () => {
      catMenuEl.classList.remove('is-open');
      applyGalleryCategory(c);
    });
    catMenuEl.appendChild(btn);
  });

  // Update contact links
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Ijashul Haque, I have a portfolio enquiry.')}`;
  const infoWa = document.getElementById('info-wa-link');
  if (infoWa) infoWa.href = waHref;
  const infoTel = document.getElementById('info-tel-link');
  if (infoTel) infoTel.href = `tel:${PHONE_NUMBER.replace(/\s+/g, '')}`;

  updateBriefBadge();
  updateNavActive();
  setupBriefFormAndInterview();
  bindEvents();
  initThree();
}

init();
