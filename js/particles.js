/* ============================================================
   particles.js — 足元の砂ぼこり / コインの粒 / 浮き文字
   ============================================================ */

import { drawText, textWidth } from './pixelfont.js';

export class Particles {
  constructor() {
    this.items = [];
    this.texts = [];
  }

  spawnDust(x, y) {
    this.items.push({
      x: x + (Math.random() * 4 - 2), y: y - 1,
      vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4,
      life: 320, max: 320, color: '#e6e2cf', size: 1,
    });
  }

  /** 宝箱を開けたときの金貨 */
  spawnBurst(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const sp = 18 + Math.random() * 26;
      this.items.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 26,
        life: 620, max: 620,
        color: i % 3 === 0 ? '#fff6d0' : '#ffd24a', size: i % 4 === 0 ? 2 : 1,
        gravity: 90,
      });
    }
  }

  spawnText(x, y, text, color = '#ffe36a') {
    this.texts.push({ x, y, text, color, life: 900, max: 900 });
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    for (const p of this.items) {
      p.life -= dtMs;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 40) * dt;
    }
    this.items = this.items.filter(p => p.life > 0);

    for (const t of this.texts) {
      t.life -= dtMs;
      t.y -= dt * 16;
    }
    this.texts = this.texts.filter(t => t.life > 0);
  }

  draw(ctx, cam) {
    for (const p of this.items) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      const a = Math.min(1, t.life / 300);
      ctx.globalAlpha = a;
      drawText(ctx, t.text, Math.round(t.x - cam.x - textWidth(t.text) / 2), Math.round(t.y - cam.y), t.color);
    }
    ctx.globalAlpha = 1;
  }
}
