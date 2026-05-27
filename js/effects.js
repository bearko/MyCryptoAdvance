/* ============================================================
   effects.js — visual effects (sky, particles, transitions)
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
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  drawSky() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    let cloudOffset = 0;
    const clouds = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      w: 60 + Math.random() * 120,
      h: 20 + Math.random() * 40,
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.15 + Math.random() * 0.25,
    }));

    const windLines = Array.from({ length: 20 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 30 + Math.random() * 60,
      speed: 4 + Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.2,
    }));

    const render = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a3a6a');
      grad.addColorStop(0.3, '#2a5a9a');
      grad.addColorStop(0.6, '#4a8ace');
      grad.addColorStop(1, '#8abae0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      cloudOffset += 0.5;
      clouds.forEach(c => {
        const cx = (c.x + cloudOffset * c.speed) % (w + c.w * 2) - c.w;
        ctx.save();
        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - c.w * 0.25, c.y + c.h * 0.15, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + c.w * 0.2, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      windLines.forEach(l => {
        l.y = (l.y + l.speed) % (h + 40);
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + l.len, l.y - l.len * 0.3);
        ctx.stroke();
        ctx.restore();
      });

      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  drawGrassland() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const render = () => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#4a6a8a');
      skyGrad.addColorStop(1, '#8aaa9a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(0, h * 0.5 - 2, w, 4);

      const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      groundGrad.addColorStop(0, '#3a6a2a');
      groundGrad.addColorStop(0.3, '#2a5a1a');
      groundGrad.addColorStop(1, '#1a3a0a');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#1a2a0a';
      for (let i = 0; i < 30; i++) {
        const bx = (i * 67 + 13) % w;
        const by = h * 0.55 + ((i * 43) % (h * 0.35));
        ctx.beginPath();
        ctx.ellipse(bx, by, 15 + (i % 3) * 8, 8 + (i % 2) * 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffa500';
      for (let i = 0; i < 8; i++) {
        const fx = (i * 137 + 50) % w;
        const fy = h * 0.75 + (i * 23) % 60;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  addSprite(imageUrl, x, y, size, options = {}) {
    const img = document.createElement('img');
    img.className = `sprite ${options.className || ''}`;
    img.src = imageUrl;
    img.alt = options.alt || '';
    img.draggable = false;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
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
      { x: '10%', y: '25%' }, { x: '80%', y: '20%' },
      { x: '5%', y: '45%' }, { x: '85%', y: '50%' },
      { x: '15%', y: '65%' }, { x: '70%', y: '60%' },
      { x: '25%', y: '35%' }, { x: '60%', y: '30%' },
      { x: '40%', y: '55%' }, { x: '50%', y: '70%' },
      { x: '90%', y: '35%' }, { x: '35%', y: '20%' },
    ];

    imageIds.forEach((id, i) => {
      const pos = positions[i % positions.length];
      const img = document.createElement('img');
      img.className = 'enemy-sprite enemy-sprite--appear';
      img.src = assetFn(id);
      img.alt = '';
      img.draggable = false;
      img.style.width = '48px';
      img.style.height = '48px';
      img.style.left = pos.x;
      img.style.top = pos.y;
      img.style.animationDelay = `${i * 0.15}s`;
      container.appendChild(img);
    });

    this.charLayer.appendChild(container);
    return container;
  }
}

export function transition(type = 'fade', duration = 2000) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('transitionOverlay');
    overlay.className = 'transition-overlay';
    overlay.classList.remove('hidden');

    if (type === 'fade') {
      overlay.classList.add('transition-overlay--fade');
      overlay.style.animationDuration = `${duration}ms`;
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.className = 'transition-overlay hidden';
        resolve();
      }, duration);
    } else if (type === 'black') {
      overlay.classList.add('transition-overlay--black');
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
      setTimeout(resolve, 800);
    } else if (type === 'unblack') {
      overlay.classList.add('transition-overlay--black', 'active');
      setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.className = 'transition-overlay hidden';
          resolve();
        }, 800);
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
