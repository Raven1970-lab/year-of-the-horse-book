// 2026 New Year Book — optimized 2026-11-08
// Scan slider: poster on the left of the scan line; on the right a live ASCII
// layer (the poster + a galloping ASCII horse) with an FUI / HUD overlay.

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const GLYPHS = "`^\",:;Il!i~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao";
const CELL_W = 5, CELL_H = 8;
const MONO = '"SF Mono", "Menlo", "Courier New", monospace';
const RED = '#e0261b';
const INK = '#111';
const MARGIN = 30; // must match .page-frame padding

const pad = (n, l = 4) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
const hex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(4, '0');

// ---------- cover: generated halftone ----------
// Everything on the cover is drawn by code: a dot grid whose sizes come from
// drifting metaballs (the oozing black blobs) and from a mask of 馬, so the
// character itself is made of dots. Type is set on a different grid from the
// posters inside.
const Cover = {
  canvas: document.getElementById('cover-canvas'),
  balls: [],
  mask: null,
  last: 0,
  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    let seed = 20260101;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2;
      this.balls.push({
        x: 260 + Math.cos(a) * (215 + rnd() * 90), y: 363 + Math.sin(a) * (300 + rnd() * 90),
        r: 18 + rnd() * 28, vx: (rnd() - 0.5) * 0.25, vy: (rnd() - 0.5) * 0.25, ph: rnd() * 6.28,
      });
    }
    const ready = document.fonts && document.fonts.load ? document.fonts.load('900 300px "Noto Serif SC"', '馬') : Promise.resolve();
    ready.catch(() => {}).then(() => { this.resize(); });
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = this.canvas.offsetWidth || r.width, h = this.canvas.offsetHeight || r.height;
    if (!w) return;
    this.canvas.width = Math.round(w * DPR);
    this.canvas.height = Math.round(h * DPR);
    // Fixed 520 x 727 design, scaled uniformly and centred, so the layout
    // never changes with the window; extra space is just more dot field.
    const kc = Math.min(w / 520, h / 727);
    this.k = kc * DPR;
    this.ox = (w / kc - 520) / 2;
    this.oy = (h / kc - 727) / 2;
    this.pitch = 9;
    this.cols = Math.ceil(520 / this.pitch) + 1;
    this.rows = Math.ceil(727 / this.pitch) + 1;
    // glyph mask sampled on the dot grid
    const m = document.createElement('canvas');
    m.width = this.cols; m.height = this.rows;
    const mc = m.getContext('2d');
    mc.scale(1 / this.pitch, 1 / this.pitch);
    mc.fillStyle = '#000';
    mc.textAlign = 'center';
    mc.textBaseline = 'middle';
    mc.font = '900 360px "Noto Serif SC", "Songti SC", serif';
    mc.fillText('馬', 266, 335);
    const d = mc.getImageData(0, 0, this.cols, this.rows).data;
    this.mask = new Float32Array(this.cols * this.rows);
    for (let i = 0; i < this.mask.length; i++) this.mask[i] = d[i * 4 + 3] / 255;
    this.draw(performance.now(), true);
  },
  draw(t, force) {
    if (!this.mask || (!force && t - this.last < 50)) return; // ~20 fps is plenty
    this.last = t;
    const c = this.ctx, k = this.k, P = this.pitch;
    const ox = this.ox, oy = this.oy;
    c.setTransform(k, 0, 0, k, ox * k, oy * k);
    c.fillStyle = '#f3f1ea';
    c.fillRect(-ox - 1, -oy - 1, 522 + ox * 2, 729 + oy * 2);

    this.balls.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.x < -40 || b.x > 560) b.vx *= -1;
      if (b.y < -40 || b.y > 767) b.vy *= -1;
    });
    const tt = t / 1000;
    const BAND0 = 556, BAND1 = 588;
    const j0 = Math.floor(-oy / P) - 1, j1 = Math.ceil((727 + oy) / P) + 1;
    const i0 = Math.floor(-ox / P) - 1, i1 = Math.ceil((520 + ox) / P) + 1;
    for (let j = j0; j <= j1; j++) {
      const y = j * P;
      if (y > BAND0 - P / 2 && y < BAND1 + P / 2) continue;
      for (let i = i0; i <= i1; i++) {
        const x = i * P;
        let F = 0;
        for (const b of this.balls) {
          const rr = b.r * (1 + 0.18 * Math.sin(tt * 0.9 + b.ph));
          const dx = x - b.x, dy = y - b.y;
          F += (rr * rr) / (dx * dx + dy * dy + 1);
        }
        const g = (i >= 0 && j >= 0 && i < this.cols && j < this.rows) ? this.mask[j * this.cols + i] : 0;
        let r;
        if (g > 0.05) {
          r = P * 0.5 * (0.35 + 0.62 * g);
        } else {
          // keep a clear field around 馬; blobs creep in from the edges only
          const dc = Math.hypot((x - 266) / 1.0, (y - 335) / 1.25);
          const edge = Math.min(1, Math.max(0, (dc - 170) / 70));
          const blob = Math.min(1, Math.max(0, (F - 0.7) * 1.5)) * edge;
          r = blob > 0 ? P * 0.62 * blob : 0.7; // blobs swell and merge; elsewhere a fine dot grid
        }
        if (r < 0.4) continue;
        c.fillStyle = '#0a0a0a';
        c.beginPath();
        c.arc(x, y, r, 0, 6.2832);
        c.fill();
      }
    }

    // green band with a slowly running line of type
    c.fillStyle = '#14e01b';
    c.fillRect(-ox - 1, BAND0, 522 + ox * 2, BAND1 - BAND0);
    c.save();
    c.beginPath(); c.rect(-ox - 1, BAND0, 522 + ox * 2, BAND1 - BAND0); c.clip();
    c.fillStyle = '#0a0a0a';
    c.font = '800 13px "Helvetica Neue", Arial, sans-serif';
    c.textBaseline = 'middle';
    const line = 'ENTER THE YEAR OF THE HORSE  ●  THE HORSE MOVES FIRST  ●  NEW YEAR BEGINS  ●  RESTART  ●  ';
    const lw = c.measureText(line).width;
    const off = -((t * 0.02) % lw);
    for (let x = off - ox - lw; x < 520 + ox; x += lw) c.fillText(line, x, (BAND0 + BAND1) / 2 + 1);
    c.restore();

    // type: red with a yellow edge, horizontal, set on its own grid
    c.lineJoin = 'round';
    const stamp = (txt, x, y, font, align, sw) => {
      c.font = font; c.textAlign = align; c.textBaseline = 'alphabetic';
      c.strokeStyle = '#ffe500'; c.lineWidth = sw; c.strokeText(txt, x, y);
      c.fillStyle = '#ff1e14'; c.fillText(txt, x, y);
    };
    stamp('元 旦 快 樂', 260, 92, '900 58px "Noto Serif SC", "Songti SC", serif', 'center', 6);
    const label = (txt, x, y, font, align) => {
      const fs = parseFloat(font.split(' ')[1]);
      c.font = font; c.textAlign = align; c.textBaseline = 'alphabetic';
      const w = c.measureText(txt).width, x0 = align === 'right' ? x - w : x;
      c.fillStyle = '#f3f1ea'; c.fillRect(x0 - fs * 0.3, y - fs * 1.0, w + fs * 0.6, fs * 1.3);
      c.fillStyle = '#0a0a0a'; c.fillText(txt, x, y);
    };
    label('FORM 01/01', 30, 128, '700 13px "Helvetica Neue", Arial, sans-serif', 'left');
    label('YEAR OF THE HORSE', 490, 128, '700 13px "Helvetica Neue", Arial, sans-serif', 'right');
    stamp('2026', 490, 676, '900 64px "Helvetica Neue", "Arial Black", Arial, sans-serif', 'right', 5);
    label('丙午', 30, 640, '900 24px "Noto Serif SC", "Songti SC", serif', 'left');
    label('一馬當先 · 萬象更新', 30, 664, '700 12px "Noto Serif SC", "Songti SC", serif', 'left');
  },
};

class Page {
  constructor(id, side) {
    this.side = side;
    this.container = document.getElementById(id);
    this.img = this.container.querySelector('.img-top');
    this.canvas = this.container.querySelector('.ui-canvas');
    this.frameEl = this.container.parentElement;
    this.mcanvas = this.frameEl.querySelector('.margin-canvas');
    this.mctx = this.mcanvas.getContext('2d');
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
    this.fw = this.frameEl.offsetWidth; this.fh = this.frameEl.offsetHeight;
    this.mcanvas.width = Math.round(this.fw * DPR); this.mcanvas.height = Math.round(this.fh * DPR);
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
    this.drawMargin(showUI, t, clipX);

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

  // Decoration lives on the blank page margin around the poster, never on it.
  drawMargin(active, t, clipX) {
    const c = this.mctx, W = this.fw, H = this.fh;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.mcanvas.width, this.mcanvas.height);
    if (!active || !W) return;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const M = MARGIN, ink = 'rgba(17,17,17,0.78)';
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1;
    c.font = `600 8px ${MONO}`; c.textBaseline = 'middle';
    const outer = this.side === 'left' ? 'left' : 'right';
    // corner ticks just outside the poster
    const L = 9, g = 5;
    [[M - g, M - g, -1, -1], [W - M + g, M - g, 1, -1], [M - g, H - M + g, -1, 1], [W - M + g, H - M + g, 1, 1]].forEach(([x, y, sx, sy]) => {
      c.beginPath(); c.moveTo(x, y - L * sy); c.lineTo(x, y); c.lineTo(x - L * sx, y); c.stroke();
    });
    const blink = Math.floor(t / 400) % 2 === 0;
    c.textAlign = 'left';
    c.fillText('FORM-01/01 · CH.' + (this.side === 'right' ? '02' : '01'), M, M / 2);
    c.textAlign = 'right';
    c.fillText('REC', W - M, M / 2);
    if (blink) { c.fillStyle = RED; c.beginPath(); c.arc(W - M - 22, M / 2, 2.5, 0, 7); c.fill(); c.fillStyle = ink; }
    c.textAlign = 'left';
    c.fillText(`FR ${pad(t / 16.67, 6)}`, M, H - M / 2);
    c.textAlign = 'right';
    c.fillText(`SCAN ${(100 - (clipX / this.w) * 100).toFixed(1).padStart(5, '0')}%`, W - M, H - M / 2);
    // outer margin: ruler + scrolling hex
    const ox = outer === 'left' ? M / 2 : W - M / 2;
    for (let y = M; y <= H - M; y += 10) {
      const big = (y - M) % 50 === 0;
      const len = big ? 6 : 3;
      const x0 = outer === 'left' ? M - g : W - M + g;
      c.beginPath(); c.moveTo(x0, y + 0.5); c.lineTo(x0 + (outer === 'left' ? -len : len), y + 0.5); c.stroke();
    }
    c.save();
    c.translate(ox, H / 2);
    c.rotate(outer === 'left' ? -Math.PI / 2 : Math.PI / 2);
    c.textAlign = 'center';
    const off = Math.floor(t / 160);
    let line = '';
    for (let i = 0; i < 12; i++) line += this.hexCol[(i + off) % this.hexCol.length] + ' ';
    c.globalAlpha = 0.55;
    c.fillText(line.trim(), 0, outer === 'left' ? -4 : -4);
    c.restore();
  }

  drawHud(ctx, x, y, clipX, t, box) {
    const W = this.w, H = this.h;
    const blink = Math.floor(t / 400) % 2 === 0;
    ctx.save();
    ctx.font = `600 9px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.lineWidth = 1;

    ctx.strokeStyle = INK; ctx.fillStyle = INK;

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
    const m2 = MARGIN * 2;
    let h = vh * 0.78, w = ((h - m2) * aspect + m2) * 2;
    if (w > vw * 0.92) { w = vw * 0.92; h = (w / 2 - m2) / aspect + m2; }
    this.wrapper.style.width = `${w}px`;
    this.wrapper.style.height = `${h}px`;
    this.layout = { cx: vw / 2, cy: vh / 2, w, h };
    this.pages.forEach(p => p.resize());
    Cover.resize && Cover.ctx && Cover.resize();
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

    if (!this.isOpen) Cover.draw(t);
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

Cover.init();
App.init();
