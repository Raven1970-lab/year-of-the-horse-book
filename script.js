// 2026 New Year Book — optimized 2026-11-08
// Scan slider: poster on the left of the scan line; on the right a live ASCII
// layer (the poster + a galloping ASCII horse) with an FUI / HUD overlay.

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const RAMP = '@%#*+=-:. ';      // dark -> light
const HORSE_RAMP = '@#%&$8B';    // dense glyphs for the horse body
const ASCII_VARIANTS = 4;
const ASCII_FRAME_MS = 140;
const CELL_W = 5, CELL_H = 8;
const MONO = '"SF Mono", "Menlo", "Courier New", monospace';
const RED = '#e0261b';
const INK = '#111';

const pad = (n, l = 4) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
const hex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(4, '0');

// cover medallion ticks
(function buildTicks() {
  const g = document.getElementById('ticks');
  if (!g) return;
  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 106 : 110, r2 = 118;
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', 260 + Math.cos(a) * r1);
    l.setAttribute('y1', 336 + Math.sin(a) * r1);
    l.setAttribute('x2', 260 + Math.cos(a) * r2);
    l.setAttribute('y2', 336 + Math.sin(a) * r2);
    g.appendChild(l);
  }
})();

// ---------- galloping horse (procedural silhouette, 200 x 130 local units) ----------
const Horse = {
  // per leg: hip/shoulder anchor, phase offset, front?
  legs: [
    { x: 62, y: 66, off: 0.00, front: false },
    { x: 72, y: 68, off: 0.10, front: false },
    { x: 132, y: 66, off: 0.48, front: true },
    { x: 140, y: 64, off: 0.58, front: true },
  ],
  draw(c, p) {
    const TAU = Math.PI * 2;
    const bob = Math.sin(p * TAU * 2) * 3;
    const pitch = Math.sin(p * TAU) * 0.05;
    c.save();
    c.translate(100, 65 + bob);
    c.rotate(pitch);
    c.translate(-100, -65);
    c.fillStyle = '#000';
    c.strokeStyle = '#000';
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // legs (behind body first)
    this.legs.forEach((L, i) => {
      const ph = (p + L.off) * TAU;
      const swing = Math.sin(ph);
      const upper = (L.front ? 0.15 : -0.05) + swing * (L.front ? 0.75 : 0.65);
      const lift = Math.max(0, Math.cos(ph));
      const knee = L.front ? -lift * 1.3 : lift * 1.1;
      const lower = upper + knee;
      const kx = L.x + Math.sin(upper) * 30, ky = L.y + Math.cos(upper) * 30;
      const fx = kx + Math.sin(lower) * 32, fy = ky + Math.cos(lower) * 32;
      c.globalAlpha = i % 2 ? 1 : 0.75;
      c.lineWidth = 11; c.beginPath(); c.moveTo(L.x, L.y - 6); c.lineTo(kx, ky); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      c.lineWidth = 8; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 3, fy + 2); c.stroke();
    });
    c.globalAlpha = 1;

    // body
    c.beginPath(); c.ellipse(100, 58, 52, 21, -0.06, 0, TAU); c.fill();
    // neck
    const nk = Math.sin(p * TAU + 1) * 3;
    c.beginPath();
    c.moveTo(128, 42); c.quadraticCurveTo(150, 30, 160 + nk, 8);
    c.lineTo(176 + nk, 14); c.quadraticCurveTo(162, 44, 150, 64); c.closePath(); c.fill();
    // head
    c.save(); c.translate(174 + nk, 20); c.rotate(0.7);
    c.beginPath(); c.ellipse(0, 6, 8, 18, 0, 0, TAU); c.fill(); c.restore();
    c.beginPath(); c.moveTo(164 + nk, 6); c.lineTo(168 + nk, -6); c.lineTo(172 + nk, 7); c.fill();
    // mane
    c.lineWidth = 3;
    for (let m = 0; m < 6; m++) {
      const mx = 140 + m * 4 + nk * 0.5, my = 36 - m * 5;
      c.beginPath(); c.moveTo(mx, my); c.lineTo(mx - 12 - Math.sin(p * TAU * 2 + m) * 4, my - 2); c.stroke();
    }
    // tail
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(50, 48);
    c.bezierCurveTo(30, 40 + Math.sin(p * TAU) * 8, 20, 55, 6, 48 + Math.sin(p * TAU + 1.5) * 12);
    c.stroke();
    c.restore();
  },
};

class Page {
  constructor(id, dataUrl, horseDelay) {
    this.container = document.getElementById(id);
    this.img = this.container.querySelector('.img-top');
    this.canvas = this.container.querySelector('.ui-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.frames = [];
    this.horseDelay = horseDelay;
    this.sil = document.createElement('canvas');
    this.silCtx = this.sil.getContext('2d', { willReadFrequently: true });
    this.hexCol = Array.from({ length: 40 }, () => hex(Math.random() * 65535));
    this.source = new Image();
    this.source.onload = () => { this.buildAscii(); App.updateBookSize(); };
    this.source.src = dataUrl; // data URL: pixel reads work even from file://
  }

  get ready() { return this.img.naturalWidth > 0; }

  resize() {
    this.w = this.container.offsetWidth;
    this.h = this.container.offsetHeight;
    this.canvas.width = Math.round(this.w * DPR);
    this.canvas.height = Math.round(this.h * DPR);
    this.cols = Math.ceil(this.w / CELL_W);
    this.rows = Math.ceil(this.h / CELL_H);
    this.sil.width = this.cols; this.sil.height = this.rows;
    this.buildAscii();
  }

  buildAscii() {
    if (!this.source.naturalWidth || !this.w) return;
    const { cols, rows } = this;
    const s = document.createElement('canvas');
    s.width = cols; s.height = rows;
    const sctx = s.getContext('2d');
    sctx.drawImage(this.source, 0, 0, cols, rows);
    const px = sctx.getImageData(0, 0, cols, rows).data;
    this.frames = [];
    for (let v = 0; v < ASCII_VARIANTS; v++) {
      const f = document.createElement('canvas');
      f.width = this.canvas.width; f.height = this.canvas.height;
      const c = f.getContext('2d');
      c.scale(DPR, DPR);
      c.fillStyle = '#f4f0e6';
      c.fillRect(0, 0, this.w, this.h);
      c.font = `bold ${CELL_H + 1}px ${MONO}`;
      c.textBaseline = 'top';
      for (let y = 0; y < rows; y++) {
        const rowShift = Math.random() < 0.04 ? (Math.random() * 6 - 3) : 0;
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          let k = Math.round(lum * (RAMP.length - 1));
          if (Math.random() < 0.07) k = Math.max(0, Math.min(RAMP.length - 1, k + (Math.random() < 0.5 ? -1 : 1)));
          const chr = RAMP[k];
          if (chr === ' ') continue;
          // poster ASCII is pushed back (lighter) so the horse reads on top
          c.fillStyle = `rgba(${r * 0.6 | 0},${g * 0.6 | 0},${b * 0.6 | 0},0.45)`;
          c.fillText(chr, x * CELL_W + rowShift, y * CELL_H);
        }
      }
      this.frames.push(f);
    }
  }

  // horse position on this page (local px) at time t
  horseState(t) {
    const period = 4200;
    const u = ((t + this.horseDelay) % period) / period;
    const size = this.w * 0.95;               // horse box width
    const hx = -size + u * (this.w + size * 1.4);
    const hy = this.h * 0.52 - size * 0.33;
    const gallop = (t / 520) % 1;             // stride cycle
    return { hx, hy, size, gallop, u };
  }

  drawHorseAscii(ctx, t, clipX) {
    const { cols, rows } = this;
    const hs = this.horseState(t);
    const sc = this.silCtx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, cols, rows);
    const k = hs.size / 200 / CELL_W;
    sc.setTransform(k, 0, 0, k * (CELL_W / CELL_H), hs.hx / CELL_W, hs.hy / CELL_H);
    Horse.draw(sc, hs.gallop);
    const data = sc.getImageData(0, 0, cols, rows).data;
    ctx.font = `bold ${CELL_H + 1}px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    const startCol = Math.max(0, Math.floor(clipX / CELL_W));
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    const tick = Math.floor(t / 90);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const a = data[(y * cols + x) * 4 + 3];
        if (a < 40) continue;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < startCol) continue;
        const chr = a > 200 ? HORSE_RAMP[(x * 7 + y * 13 + tick) % HORSE_RAMP.length] : (a > 120 ? '*' : '+');
        ctx.fillText(chr, x * CELL_W, y * CELL_H);
      }
    }
    if (maxX < 0) return null;
    return { x: minX * CELL_W, y: minY * CELL_H, w: (maxX - minX + 1) * CELL_W, h: (maxY - minY + 1) * CELL_H };
  }

  isHover(gx, gy) {
    const r = this.container.getBoundingClientRect();
    return gx >= r.left && gx <= r.right && gy >= r.top && gy <= r.bottom;
  }

  draw(gx, gy, showUI, t, glitch) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.ready || !this.w) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const W = this.w, H = this.h;

    let x = W, y = H / 2;
    if (showUI) {
      const r = this.container.getBoundingClientRect();
      if (r.width > 0) {
        x = Math.round((gx - r.left) * (W / r.width));
        y = (gy - r.top) * (H / r.height);
      }
    }
    const clipX = Math.max(0, Math.min(x, W));
    let box = null;

    // ---- ASCII side ----
    if (clipX < W && this.frames.length) {
      const f = this.frames[Math.floor(t / ASCII_FRAME_MS) % this.frames.length];
      ctx.drawImage(f, 0, 0, W, H);
      box = this.drawHorseAscii(ctx, t, clipX);
      // scan band
      const by = (t * 0.12) % (H + 80) - 40;
      const grad = ctx.createLinearGradient(0, by - 40, 0, by + 40);
      grad.addColorStop(0, 'rgba(244,240,230,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(244,240,230,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(clipX, by - 40, W - clipX, 80);
    }

    // ---- poster side ----
    if (clipX > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, clipX, H); ctx.clip();
      ctx.drawImage(this.img, 0, 0, W, H);
      // glitch slices when the scan line moves fast
      if (glitch > 0.35) {
        const n = 1 + Math.floor(glitch * 3);
        for (let i = 0; i < n; i++) {
          const sy = Math.random() * H, sh = 3 + Math.random() * 16;
          const dx = (Math.random() - 0.5) * 14 * glitch;
          const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
          ctx.drawImage(this.img, 0, sy / H * ih, iw, sh / H * ih, dx, sy, W, sh);
        }
      }
      ctx.restore();
    }

    if (!showUI) return;
    this.drawHud(ctx, x, y);
  }

  // Minimal overlay: one hairline scan line + the original reticle
  // (black disc, two white triangles), drawn crisply. No HUD clutter.
  drawHud(ctx, x, y) {
    const W = this.w, H = this.h;
    if (x < -40 || x > W + 40) return;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
    ctx.stroke();

    const R = 29.4, base = 40.5, gap = 3.75;
    const th = (base / 2) / Math.tan(Math.PI / 3);
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = '#fff';
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(d * gap, -base / 2);
      ctx.lineTo(d * gap, base / 2);
      ctx.lineTo(d * (gap + th), 0);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }
}

const App = {
  book: document.getElementById('book'),
  wrapper: document.getElementById('book-wrapper'),
  sheen: document.querySelector('.cover-sheen'),
  isOpen: false,
  uiReady: false,
  touchOpen: false,
  mouseX: -1000, mouseY: -1000, lastX: -1000,
  glitch: 0,
  tiltX: 0, tiltY: 0,
  layout: { cx: 0, cy: 0, w: 0, h: 0 },
  pages: [],
  resizeTimer: null,

  init() {
    this.pages = [
      new Page('page-left', window.POSTER_DATA.left, 0),
      new Page('page-right', window.POSTER_DATA.right, 2100),
    ];
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.updateBookSize(), 120);
    });
    window.addEventListener('pointermove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    window.addEventListener('pointerdown', (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      if (e.pointerType !== 'mouse') this.touchOpen = this.hitTest(e.clientX, e.clientY);
    });
    this.pages.forEach(p => { if (p.img.complete) this.updateBookSize(); else p.img.onload = () => this.updateBookSize(); });
    this.updateBookSize();
    requestAnimationFrame((t) => this.loop(t));
  },

  updateBookSize() {
    const img = this.pages[0] && this.pages[0].img;
    if (!img || !img.naturalWidth) return;
    const aspect = img.naturalWidth / img.naturalHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let h = vh * 0.76, w = h * aspect * 2;
    if (w > vw * 0.9) { w = vw * 0.9; h = w / (aspect * 2); }
    this.wrapper.style.width = `${w}px`;
    this.wrapper.style.height = `${h}px`;
    this.layout = { cx: vw / 2, cy: vh / 2, w, h };
    this.pages.forEach(p => p.resize());
  },

  hitTest(mx, my) {
    const { cx, cy, w, h } = this.layout;
    const buffer = 40;
    const half = this.isOpen ? w / 2 : w / 4;
    return mx >= cx - half - buffer && mx <= cx + half + buffer &&
           my >= cy - h / 2 - buffer && my <= cy + h / 2 + buffer;
  },

  loop(t) {
    const { cx, cy } = this.layout;
    const onScreen = this.mouseX > -999;
    const tx = onScreen && cy ? (this.mouseY - cy) / cy * 8 : 0;
    const ty = onScreen && cx ? (this.mouseX - cx) / cx * 8 : 0;
    this.tiltX += (tx - this.tiltX) * 0.08;
    this.tiltY += (ty - this.tiltY) * 0.08;
    this.wrapper.style.transform = `rotateX(${(-this.tiltX).toFixed(3)}deg) rotateY(${this.tiltY.toFixed(3)}deg)`;
    if (this.sheen) {
      this.sheen.style.setProperty('--sx', `${50 - this.tiltY * 5}%`);
      this.sheen.style.setProperty('--sy', `${35 + this.tiltX * 5}%`);
    }

    // glitch strength from horizontal pointer speed
    const speed = Math.abs(this.mouseX - this.lastX);
    this.lastX = this.mouseX;
    this.glitch = Math.max(this.glitch * 0.88, Math.min(1, speed / 60));

    const want = this.touchOpen || this.hitTest(this.mouseX, this.mouseY);
    if (want !== this.isOpen) {
      this.isOpen = want;
      this.book.classList.toggle('open', want);
      this.uiReady = false;
      clearTimeout(this.uiTimer);
      if (want) this.uiTimer = setTimeout(() => { this.uiReady = true; }, 700);
    }

    let overMedia = false;
    const show = this.isOpen && this.uiReady;
    this.pages.forEach(p => {
      p.draw(this.mouseX, this.mouseY, show, t, this.glitch);
      if (show && p.isHover(this.mouseX, this.mouseY)) overMedia = true;
    });
    document.body.style.cursor = overMedia ? 'none' : 'default';
    requestAnimationFrame((tt) => this.loop(tt));
  },
};

App.init();
