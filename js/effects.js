/* ============================================================
   effects.js — visual effects, scene rendering, transitions
   ============================================================ */

export class SceneRenderer {
  constructor() {
    this.canvas = document.getElementById('sceneCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.charLayer = document.getElementById('characterLayer');
    this.effectLayer = document.getElementById('effectLayer');
    this.animFrame = null;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.charLayer.innerHTML = '';
    this.effectLayer.innerHTML = '';
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
  }

  drawSky() {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    let t = 0;
    const clouds = Array.from({ length: 14 }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.7,
      w: 60 + Math.random() * 140, h: 20 + Math.random() * 40,
      speed: 0.2 + Math.random() * 0.6, opacity: 0.12 + Math.random() * 0.2,
    }));
    const windLines = Array.from({ length: 24 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      len: 30 + Math.random() * 70, speed: 5 + Math.random() * 10,
      opacity: 0.08 + Math.random() * 0.15,
    }));
    const render = () => {
      t++;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0e2a5e'); grad.addColorStop(0.3, '#1e4a8a');
      grad.addColorStop(0.6, '#3a7abe'); grad.addColorStop(1, '#7ab0d8');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      clouds.forEach(c => {
        const cx = (c.x + t * c.speed * 0.3) % (w + c.w * 2) - c.w;
        ctx.save(); ctx.globalAlpha = c.opacity; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx - c.w * 0.3, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + c.w * 0.25, c.y + c.h * 0.08, c.w * 0.25, c.h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      windLines.forEach(l => {
        l.y = (l.y + l.speed) % (h + 50);
        ctx.save(); ctx.globalAlpha = l.opacity; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.len, l.y - l.len * 0.25); ctx.stroke();
        ctx.restore();
      });
      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  drawGrassland() {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    let t = 0;
    const render = () => {
      t++;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#4a6878'); skyGrad.addColorStop(1, '#7a9a88');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h * 0.45);

      const mtGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.45);
      mtGrad.addColorStop(0, '#3a5a4a'); mtGrad.addColorStop(1, '#4a7a4a');
      ctx.fillStyle = mtGrad;
      ctx.beginPath(); ctx.moveTo(0, h * 0.45);
      for (let x = 0; x <= w; x += 40) {
        ctx.lineTo(x, h * 0.35 + Math.sin(x * 0.008) * h * 0.05 + Math.sin(x * 0.003) * h * 0.03);
      }
      ctx.lineTo(w, h * 0.45); ctx.fill();

      const groundGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
      groundGrad.addColorStop(0, '#3a6a2a'); groundGrad.addColorStop(0.4, '#2a5a1a'); groundGrad.addColorStop(1, '#1a3a0a');
      ctx.fillStyle = groundGrad; ctx.fillRect(0, h * 0.45, w, h * 0.55);

      ctx.save(); ctx.globalAlpha = 0.12;
      for (let i = 0; i < 20; i++) {
        const gx = (i * 73 + 10) % w;
        const gy = h * 0.5 + (i * 47) % (h * 0.4);
        ctx.fillStyle = i % 3 === 0 ? '#1a2a0a' : '#2a4a1a';
        ctx.beginPath(); ctx.ellipse(gx, gy, 12 + (i % 4) * 6, 6 + (i % 3) * 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      ctx.save(); ctx.globalAlpha = 0.06;
      for (let i = 0; i < 6; i++) {
        const sx = (i * 157 + 40 + Math.sin(t * 0.02 + i) * 3) % w;
        const sy = h * 0.48 + (i * 31) % (h * 0.4);
        ctx.fillStyle = '#5a8a3a';
        ctx.fillRect(sx, sy, 2, 8 + (i % 3) * 4);
      }
      ctx.restore();

      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  addSprite(imageUrl, x, y, size, options = {}) {
    const img = document.createElement('img');
    img.className = `sprite ${options.className || ''}`;
    img.src = imageUrl; img.alt = options.alt || ''; img.draggable = false;
    img.style.width = `${size}px`; img.style.height = `${size}px`;
    img.style.left = `${x}px`; img.style.top = `${y}px`;
    if (options.id) img.id = options.id;
    this.charLayer.appendChild(img);
    return img;
  }

  addSpriteCenter(imageUrl, size, options = {}) {
    const x = (window.innerWidth - size) / 2;
    const y = (window.innerHeight - size) / 2 + (options.offsetY || 0);
    return this.addSprite(imageUrl, x, y, size, options);
  }

  addEnemySwarm(imageIds, assetFn) {
    const container = document.createElement('div');
    container.className = 'enemy-swarm';
    const positions = [
      { x: '8%', y: '20%' }, { x: '82%', y: '18%' }, { x: '5%', y: '42%' },
      { x: '88%', y: '48%' }, { x: '15%', y: '62%' }, { x: '72%', y: '58%' },
      { x: '28%', y: '32%' }, { x: '62%', y: '28%' }, { x: '42%', y: '52%' },
      { x: '52%', y: '68%' }, { x: '92%', y: '33%' }, { x: '35%', y: '18%' },
    ];
    imageIds.forEach((id, i) => {
      const pos = positions[i % positions.length];
      const img = document.createElement('img');
      img.className = 'enemy-sprite enemy-sprite--appear';
      img.src = assetFn(id); img.alt = ''; img.draggable = false;
      img.style.width = '48px'; img.style.height = '48px';
      img.style.left = pos.x; img.style.top = pos.y;
      img.style.animationDelay = `${i * 0.12}s`;
      container.appendChild(img);
    });
    this.charLayer.appendChild(container);
    return container;
  }
}

export function transition(type = 'fade', duration = 2000) {
  return new Promise(resolve => {
    const overlay = document.getElementById('transitionOverlay');
    overlay.className = 'transition-overlay'; overlay.classList.remove('hidden');
    if (type === 'fade') {
      overlay.classList.add('transition-overlay--fade');
      overlay.style.animationDuration = `${duration}ms`;
      setTimeout(() => { overlay.className = 'transition-overlay hidden'; resolve(); }, duration);
    } else if (type === 'black') {
      overlay.classList.add('transition-overlay--black');
      requestAnimationFrame(() => overlay.classList.add('active'));
      setTimeout(resolve, 800);
    } else if (type === 'unblack') {
      overlay.classList.add('transition-overlay--black', 'active');
      setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => { overlay.className = 'transition-overlay hidden'; resolve(); }, 800);
      }, 100);
    }
  });
}

export function screenShake() {
  const scene = document.getElementById('sceneLayer');
  scene.classList.add('scene-layer--shake');
  setTimeout(() => scene.classList.remove('scene-layer--shake'), 500);
}

export function flashWhite() {
  const el = document.createElement('div');
  el.className = 'flash-white flash-white--active';
  document.getElementById('effectLayer').appendChild(el);
  setTimeout(() => el.remove(), 400);
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
