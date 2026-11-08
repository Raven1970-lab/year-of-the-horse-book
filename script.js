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
    this.boxes = [null];
    this.hexCol = Array.from({ length: 40 }, () => hex(Math.random() * 65535));
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
    this.boxes = [];
    for (let f = 0; f < meta.frames; f++) {
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
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
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
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
      this.boxes.push(x1 < 0 ? null : { x: x0 * CELL_W, y: y0 * CELL_H, w: (x1 - x0 + 1) * CELL_W, h: (y1 - y0 + 1) * CELL_H });
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
      if (glitch > 0.15) {
        const n = 2 + Math.floor(glitch * 6);
        for (let i = 0; i < n; i++) {
          const sy = Math.random() * H, sh = 3 + Math.random() * 16;
          const dx = (Math.random() - 0.5) * 40 * glitch;
          const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
          ctx.drawImage(this.img, 0, sy / H * ih, iw, sh / H * ih, dx, sy, W, sh);
          ctx.fillStyle = i % 2 ? 'rgba(224,38,27,0.25)' : 'rgba(0,200,255,0.18)';
          ctx.fillRect(dx, sy, W, sh);
        }
      }
      ctx.restore();
    }

    if (!showUI) return;
    this.drawHud(ctx, x, y, clipX, t, this.boxes[Math.floor(t / window.HORSE_SHEET.ms) % this.boxes.length]);
  }

  drawHud(ctx, x, y, clipX, t, box) {
    const W = this.w, H = this.h;
    const blink = Math.floor(t / 400) % 2 === 0;
    ctx.save();
    ctx.font = `600 9px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.lineWidth = 1;

    // page frame brackets + labels
    ctx.strokeStyle = INK; ctx.fillStyle = INK;
    const m = 8, L = 14;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([bx, by, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(bx, by + L * sy); ctx.lineTo(bx, by); ctx.lineTo(bx + L * sx, by); ctx.stroke();
    });
    if (clipX < W) {
      const rx = Math.max(clipX + 6, W - 120);
      ctx.fillText(`REC`, W - 40, 14);
      if (blink) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(W - 46, 18, 3, 0, 7); ctx.fill(); ctx.fillStyle = INK; }
      ctx.fillText(`FR ${pad(t / 16.67, 6)}`, rx, H - 22);
      // scrolling hex column
      const off = Math.floor(t / 120);
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 22; i++) {
        const v = this.hexCol[(i + off) % this.hexCol.length];
        if (W - 34 > clipX) ctx.fillText(v, W - 34, 36 + i * 11);
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillText('FORM-01/01 · CH.' + (this.side === 'right' ? '02' : '01'), 14, 14);

    // ruler on the scan line
    if (x >= 0 && x <= W) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      for (let yy = 0; yy < H; yy += 10) {
        const big = yy % 50 === 0;
        ctx.beginPath(); ctx.moveTo(x + 0.5, yy); ctx.lineTo(x + (big ? 8 : 4), yy); ctx.stroke();
        if (yy % 100 === 0 && yy) ctx.fillText(pad(yy, 3), x + 10, yy - 4);
      }
    }

    // target box on the ASCII horse
    if (box && box.x + box.w > clipX) {
      const bx = Math.max(box.x, clipX) - 6, by = box.y - 6, bw = box.x + box.w - Math.max(box.x, clipX) + 12, bh = box.h + 12;
      ctx.strokeStyle = RED; ctx.fillStyle = RED;
      const c = 10;
      [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([px, py, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(px, py + c * sy); ctx.lineTo(px, py); ctx.lineTo(px + c * sx, py); ctx.stroke();
      });
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
      ctx.setLineDash([]);
      const vel = 58 + Math.sin(t / 300) * 6;
      const lx = Math.min(bx, W - 120), ly = Math.max(by - 34, 4);
      ctx.fillRect(lx, ly, 112, 13);
      ctx.fillStyle = '#fff';
      ctx.fillText('TARGET 馬 / HORSE-01', lx + 4, ly + 2);
      ctx.fillStyle = RED;
      ctx.fillText(`VEL ${vel.toFixed(1)} KM/H  CONF 0.9${Math.floor(t / 200) % 10}`, lx, ly + 16);
    }

    this.drawReticle(ctx, x, y, clipX, t);
    ctx.restore();
  }

  // scan reticle: ring + rotating ticks + crosshair gaps + direction chevrons + readout
  drawReticle(ctx, x, y, clipX, t) {
    const W = this.w, H = this.h;
    if (x < -40 || x > W + 40) return;
    const R = 22, rot = t / 1400;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = INK; ctx.fillStyle = INK;

    // solid disc keeps the original black-dot language, but thinner + precise
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17,17,17,0.9)'; ctx.fill();

    // rotating tick ring
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) {
      const a = rot + (i / 36) * Math.PI * 2;
      const r1 = R + 4, r2 = R + (i % 9 === 0 ? 11 : 7);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    }
    // outer arcs (counter-rotating, broken)
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a0 = -rot * 1.6 + i * Math.PI / 2;
      ctx.beginPath(); ctx.arc(0, 0, R + 16, a0, a0 + Math.PI / 4); ctx.stroke();
    }

    // crosshair with centre gap (white on the disc)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -R + 4); ctx.lineTo(0, -5); ctx.moveTo(0, 5); ctx.lineTo(0, R - 4);
    ctx.stroke();
    // chevrons pointing left / right (drag direction)
    ctx.lineWidth = 2; ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.lineTo(-12, 0); ctx.lineTo(-6, 6);
    ctx.moveTo(6, -6); ctx.lineTo(12, 0); ctx.lineTo(6, 6);
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.fillRect(-1.5, -1.5, 3, 3);

    // readout box
    const pct = (clipX / W) * 100;
    const tx = x > W - 130 ? -R - 128 : R + 18, ty = -R - 14;
    ctx.fillStyle = INK;
    ctx.fillRect(tx, ty, 108, 13);
    ctx.fillStyle = '#fff';
    ctx.font = `600 9px ${MONO}`;
    ctx.fillText(`SCAN ${pct.toFixed(1).padStart(5, '0')}%`, tx + 4, ty + 2);
    ctx.fillStyle = INK;
    ctx.fillText(`X ${pad(x)}  Y ${pad(y)}`, tx, ty + 16);
    ctx.fillText(`ASCII ▸ ${this.cols}×${this.rows}`, tx, ty + 27);
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
