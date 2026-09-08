/* ============================================================
   chest.js — 宝箱（開閉モーション付き）
   スプライトは assets/objects/chest.png（32x32 x 8コマ）。
   rpg/tools/build_chest_sprite.py で生成している。
   ============================================================ */

import { Animator, Clip } from './anim.js';

export const CHEST_FRAME = 32;
const FOOT_OFFSET = 30;    // コマ内で箱の底がある位置
const BOX_HALF_W = 11;
const BOX_H = 9;

export function buildChestClips(image) {
  const base = { image, frameWidth: CHEST_FRAME, frameHeight: CHEST_FRAME, columns: 8 };
  return {
    closed: new Clip(image, { ...base, frames: [0], durations: [500], loop: true }),
    opening: new Clip(image, {
      ...base,
      frames: [1, 2, 3, 4, 5],
      durations: [80, 80, 90, 90, 120],
      loop: false,
    }),
    open: new Clip(image, { ...base, frames: [6, 7], durations: [420, 420], loop: true }),
  };
}

export class Chest {
  /** x, y は箱の底の中心（ワールド座標 px） */
  constructor(clips, x, y, reward = 100) {
    this.clips = clips;
    this.x = x;
    this.y = y;
    this.reward = reward;
    this.state = 'closed';
    this.animator = new Animator();
    this.animator.play(clips.closed, { restart: true });
  }

  get sortY() { return this.y; }
  get opened() { return this.state !== 'closed'; }

  /** 足元の当たり判定（宝箱は押し通れない） */
  blocks(x, y, halfW, h) {
    return (
      x + halfW > this.x - BOX_HALF_W &&
      x - halfW < this.x + BOX_HALF_W &&
      y > this.y - BOX_H - h &&
      y - h < this.y
    );
  }

  distanceTo(px, py) {
    return Math.hypot(px - this.x, py - (this.y - 6));
  }

  open() {
    if (this.state !== 'closed') return false;
    this.state = 'opening';
    this.animator.play(this.clips.opening, { restart: true });
    return true;
  }

  update(dtMs) {
    this.animator.update(dtMs);
    if (this.state === 'opening' && this.animator.finished) {
      this.state = 'open';
      this.animator.play(this.clips.open, { restart: true });
    }
  }

  draw(ctx, cam) {
    const x = this.x - CHEST_FRAME / 2 - cam.x;
    const y = this.y - FOOT_OFFSET - cam.y;
    this.animator.draw(ctx, x, y);
  }
}
