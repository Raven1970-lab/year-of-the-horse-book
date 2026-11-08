// 2026 New Year Book — optimized 2026-11-08
// Scan slider: poster on the left of the scan line; on the right a live ASCII
// layer (the poster + a galloping ASCII horse) with an FUI / HUD overlay.

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const GLYPHS = "`^\",:;Il!i~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao";
const CELL_W = 5, CELL_H = 8;
const MONO = '"SF Mono", "Menlo", "Courier New", monospace';
const RED = '#e0261b';
const INK = '#111';

const pad = (n, l = 4) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
const hex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(4, '0');

// cover halftone blobs (seeded, so the cover is the same on every load)
(function buildBlobs() {
  const g = document.getElementById('blobs');
  if (!g) return;
  let seed = 20260101;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ns = 'http://www.w3.org/2000/svg';
  const inPanel = (x, y, r) => x + r > 84 && x - r < 454 && y + r > 138 && y - r < 614;
  for (let i = 0; i < 420; i++) {
    const x = rnd() * 540 - 10, y = rnd() * 747 - 10;
    const r = 3 + Math.pow(rnd(), 2.2) * 30;
    if (inPanel(x, y, r)) continue;
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', r.toFixed(1));
    g.appendChild(c);
  }
})();

class Page {
  constructor(id, side) {
    this.side = side;
    this.container = document.getElementById(id);
    this.img = this.container.querySelector('.img-top');
    this.canvas = this.container.querySelector('.ui-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.frames = [];
  }

  get ready() { return this.img.naturalWidth > 0; }

  resize() {
    this.w = this.container.offsetWidth;
    this.h = this.container.offsetHeight;
    this.canvas.width = Math.round(this.w * DPR);
    this.canvas.height = Math.round(this.h * DPR);
    this.cols = Math.ceil(this.w / CELL_W);
    this.rows = Math.ceil(this.h / CELL_H);
    this.buildAscii();
  }

  // The ASCII layer recreates the original g.gif / 2.gif: a page of dots
  // with a horse galloping in place. The 9-frame gallop silhouette was
  // traced from Raven's screen recording of the original site (horse.js).
  buildAscii() {
    const sheet = App.horseSheet;
    if (!sheet || !sheet.img.naturalWidth || !this.w) return;
    const meta = window.HORSE_SHEET;
    const { cols, rows } = this;
    const dark = this.side === 'left';
    const hy0 = Math.floor(rows * meta.y), hRows = Math.ceil(rows * meta.h);
    const m = document.createElement('canvas');
    m.width = cols * meta.frames; m.height = hRows;
    const mc = m.getContext('2d');
    mc.imageSmoothingEnabled = true;
    mc.drawImage(sheet.img, 0, 0, m.width, m.height);
    const px = mc.getImageData(0, 0, m.width, m.height).data;

    this.frames = [];
    for (let f = 0; f < meta.frames; f++) {
      const c0 = document.createElement('canvas');
      c0.width = this.canvas.width; c0.height = this.canvas.height;
      const c = c0.getContext('2d');
      c.scale(DPR, DPR);
      c.fillStyle = dark ? '#8d8d8d' : '#fbfaf6';
      c.fillRect(0, 0, this.w, this.h);
      c.font = `${CELL_H + 1}px ${MONO}`;
      c.textBaseline = 'top';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let v = 0;
          const hy = y - hy0;
          if (hy >= 0 && hy < hRows) v = px[(hy * m.width + f * cols + x) * 4] / 255;
          if (v > 0.18) {
            if (dark) {
              c.fillStyle = '#0d0d0d';
              c.fillText('#', x * CELL_W, y * CELL_H);
            } else {
              const k = Math.min(GLYPHS.length - 1, Math.floor(v * GLYPHS.length));
              c.fillStyle = '#2b2b2b';
              c.fillText(GLYPHS[(k + ((x * 31 + y * 17) % 3)) % GLYPHS.length], x * CELL_W, y * CELL_H);
            }
          } else {
            c.fillStyle = dark ? '#5e5e5e' : '#3a3a3a';
            c.fillText('.', x * CELL_W, y * CELL_H);
          }
        }
      }
      this.frames.push(c0);
    }
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

    // ---- ASCII side ----
    if (clipX < W && this.frames.length) {
      const f = this.frames[Math.floor(t / window.HORSE_SHEET.ms) % this.frames.length];
      ctx.drawImage(f, 0, 0, W, H);
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
    this.pages = [new Page('page-left', 'left'), new Page('page-right', 'right')];
    const img = new Image();
    this.horseSheet = { img };
    img.onload = () => this.pages.forEach(p => p.buildAscii());
    img.src = window.HORSE_SHEET.src;
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
