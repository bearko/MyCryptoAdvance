/* ============================================================
   player.js — フィールド上のヒーロー
   足元を基準座標(x, y)とし、32x32 のコマを中心下揃えで描く。
   ============================================================ */

import { Animator } from './anim.js';
import { vectorToDirection, DIRECTION_VECTORS } from './hero.js';
import { TILE } from './tiles.js';

const MIN_SPEED = 24;      // スティックを少し倒したとき(px/s)
const MAX_SPEED = 72;      // 倒し切ったとき(px/s)
const BOX_HALF_W = 5;      // 足元の当たり判定
const BOX_H = 6;

export class Player {
  constructor(animations, x, y) {
    this.anim = animations;
    this.x = x;
    this.y = y;
    this.dir = 's';
    this.state = 'idle';
    this.animator = new Animator();
    this.moving = false;
    this.stepDust = 0;
  }

  get feet() { return { x: this.x, y: this.y }; }

  /** 向いている方向の少し先（調べる判定に使う） */
  facingPoint(dist = 12) {
    const [vx, vy] = DIRECTION_VECTORS[this.dir];
    return { x: this.x + vx * dist, y: this.y + vy * dist };
  }

  attack() {
    if (this.state === 'attack' || !this.anim.has('attack')) return false;
    this.state = 'attack';
    const { clip } = this.anim.get('attack', this.dir);
    this.animator.play(clip, { restart: true });
    return true;
  }

  update(dtMs, move, world, particles) {
    const dt = dtMs / 1000;

    if (this.state === 'attack') {
      this.moving = false;
      this.animator.speed = 1;
      this.animator.update(dtMs);
      if (this.animator.finished) this.state = 'idle';
    } else {
      const mag = Math.min(1, Math.hypot(move.x, move.y));
      this.moving = mag > 0.01;
      if (this.moving) {
        const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * mag;
        const nx = move.x / mag;
        const ny = move.y / mag;
        this._moveWithCollision(nx * speed * dt, ny * speed * dt, world);
        this.dir = vectorToDirection(nx, ny, this.dir);
        this.state = 'walk';
        this.animator.speed = 0.65 + mag * 0.85;
        this._dust(dtMs, mag, world, particles);
      } else {
        this.state = 'idle';
        this.animator.speed = 1;
      }
      const { clip } = this.anim.get(this.state === 'walk' ? 'walk' : 'idle', this.dir);
      this.animator.play(clip);
      this.animator.update(dtMs);
    }
  }

  /** X と Y を別々に解決して壁ずりできるようにする */
  _moveWithCollision(dx, dy, world) {
    if (dx) {
      const nx = this.x + dx;
      if (!this._blocked(nx, this.y, world)) this.x = nx;
    }
    if (dy) {
      const ny = this.y + dy;
      if (!this._blocked(this.x, ny, world)) this.y = ny;
    }
    this.x = Math.max(TILE, Math.min(world.map.pixelWidth - TILE, this.x));
    this.y = Math.max(TILE, Math.min(world.map.pixelHeight - TILE, this.y));
  }

  _blocked(x, y, world) {
    const left = x - BOX_HALF_W;
    const right = x + BOX_HALF_W - 0.01;
    const top = y - BOX_H;
    const bottom = y - 0.01;
    for (const [cx, cy] of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
      if (world.map.isSolidAt(cx, cy)) return true;
    }
    return world.blockedByEntity(x, y, BOX_HALF_W, BOX_H);
  }

  _dust(dtMs, mag, world, particles) {
    this.stepDust -= dtMs * mag;
    if (this.stepDust > 0) return;
    this.stepDust = 220;
    particles.spawnDust(this.x, this.y);
  }

  get sortY() { return this.y; }

  draw(ctx, cam) {
    const { flip } = this.anim.get(
      this.state === 'attack' ? 'attack' : (this.state === 'walk' ? 'walk' : 'idle'),
      this.dir,
    );
    const w = this.anim.canvasWidth;
    const h = this.anim.canvasHeight;
    const x = Math.round(this.x - w / 2 - cam.x);
    const y = Math.round(this.y - h - cam.y);
    // 足元の影
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - cam.x), Math.round(this.y - cam.y) - 1, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.animator.draw(ctx, x, y, flip);
  }
}
