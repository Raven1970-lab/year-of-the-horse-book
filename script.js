// 2026 New Year Book — optimized 2026-11-08
// Scan slider: poster on the left of the cursor, a live ASCII render of the
// same poster on the right (replaces the missing original g.gif / 2.gif).

const CIRCLE_RADIUS = 58.75 / 2;
const TRI_BASE = 40.5;
const TRI_H = (TRI_BASE / 2) / Math.tan(Math.PI / 3);
const TRI_GAP = 3.75;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const RAMP = '@%#*+=-:. '; // dark -> light
const ASCII_VARIANTS = 4;
const ASCII_FRAME_MS = 140;

// tick marks on the cover medallion
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

class Page {
  constructor(id, dataUrl) {
    this.container = document.getElementById(id);
    this.img = this.container.querySelector('.img-top');
    this.canvas = this.container.querySelector('.ui-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.frames = [];
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
    this.buildAscii();
  }

  buildAscii() {
    if (!this.source.naturalWidth || !this.w) return;
    const cw = 5, ch = 8;
    const cols = Math.ceil(this.w / cw), rows = Math.ceil(this.h / ch);
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
      c.font = `bold ${ch + 1}px "Courier New", monospace`;
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
          c.fillStyle = `rgb(${r * 0.75 | 0},${g * 0.75 | 0},${b * 0.75 | 0})`;
          c.fillText(chr, x * cw + rowShift, y * ch);
        }
      }
      this.frames.push(f);
    }
  }

  isHover(gx, gy) {
    const r = this.container.getBoundingClientRect();
    return gx >= r.left && gx <= r.right && gy >= r.top && gy <= r.bottom;
  }

  draw(gx, gy, showUI, t) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.ready || !this.w) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    let x = this.w, y = this.h / 2;
    if (showUI) {
      const r = this.container.getBoundingClientRect();
      if (r.width > 0) {
        x = Math.round((gx - r.left) * (this.w / r.width));
        y = (gy - r.top) * (this.h / r.height);
      }
    }
    const clipX = Math.max(0, Math.min(x, this.w));

    // ASCII layer + moving scan band
    if (clipX < this.w && this.frames.length) {
      const f = this.frames[Math.floor(t / ASCII_FRAME_MS) % this.frames.length];
      ctx.drawImage(f, 0, 0, this.w, this.h);
      const by = (t * 0.12) % (this.h + 80) - 40;
      const grad = ctx.createLinearGradient(0, by - 40, 0, by + 40);
      grad.addColorStop(0, 'rgba(244,240,230,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(244,240,230,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(clipX, by - 40, this.w - clipX, 80);
    }

    // poster layer
    if (clipX > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipX, this.h);
      ctx.clip();
      ctx.drawImage(this.img, 0, 0, this.w, this.h);
      ctx.restore();
    }

    if (!showUI || x < -CIRCLE_RADIUS || x > this.w + CIRCLE_RADIUS) return;

    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, this.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - TRI_GAP, y - TRI_BASE / 2);
    ctx.lineTo(x - TRI_GAP, y + TRI_BASE / 2);
    ctx.lineTo(x - TRI_GAP - TRI_H, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + TRI_GAP, y - TRI_BASE / 2);
    ctx.lineTo(x + TRI_GAP, y + TRI_BASE / 2);
    ctx.lineTo(x + TRI_GAP + TRI_H, y);
    ctx.closePath();
    ctx.fill();
  }
}

const App = {
  book: document.getElementById('book'),
  wrapper: document.getElementById('book-wrapper'),
  sheen: document.querySelector('.cover-sheen'),
  isOpen: false,
  uiReady: false,
  touchOpen: false,
  mouseX: -1000, mouseY: -1000,
  tiltX: 0, tiltY: 0,
  layout: { cx: 0, cy: 0, w: 0, h: 0 },
  aspect: 0,
  pages: [],
  resizeTimer: null,

  init() {
    this.pages = [
      new Page('page-left', window.POSTER_DATA.left),
      new Page('page-right', window.POSTER_DATA.right),
    ];
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.updateBookSize(), 120);
    });
    window.addEventListener('pointermove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    window.addEventListener('pointerdown', (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      if (e.pointerType !== 'mouse') this.touchOpen = this.hitTest(e.clientX, e.clientY) ? true : false;
    });
    this.pages.forEach(p => { if (p.img.complete) this.updateBookSize(); else p.img.onload = () => this.updateBookSize(); });
    this.updateBookSize();
    requestAnimationFrame((t) => this.loop(t));
  },

  updateBookSize() {
    const img = this.pages[0] && this.pages[0].img;
    if (!img || !img.naturalWidth) return;
    // page aspect includes the 18px frame; close enough to the poster ratio
    this.aspect = img.naturalWidth / img.naturalHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let h = vh * 0.76, w = h * this.aspect * 2;
    if (w > vw * 0.9) { w = vw * 0.9; h = w / (this.aspect * 2); }
    this.wrapper.style.width = `${w}px`;
    this.wrapper.style.height = `${h}px`;
    this.layout = { cx: vw / 2, cy: vh / 2, w, h };
    this.pages.forEach(p => p.resize());
  },

  hitTest(mx, my) {
    const { cx, cy, w, h } = this.layout;
    const buffer = 40;
    const half = this.isOpen ? w / 2 : w / 4; // closed book is centred and half as wide
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

    const want = this.touchOpen || this.hitTest(this.mouseX, this.mouseY);
    if (want !== this.isOpen) {
      this.isOpen = want;
      this.book.classList.toggle('open', want);
      this.uiReady = false;
      clearTimeout(this.uiTimer);
      if (want) this.uiTimer = setTimeout(() => { this.uiReady = true; }, 700);
    }

    let overMedia = false;
    this.pages.forEach(p => {
      const show = this.isOpen && this.uiReady;
      p.draw(this.mouseX, this.mouseY, show, t);
      if (show && p.isHover(this.mouseX, this.mouseY)) overMedia = true;
    });
    document.body.style.cursor = overMedia ? 'none' : 'default';
    requestAnimationFrame((tt) => this.loop(tt));
  },
};

App.init();
