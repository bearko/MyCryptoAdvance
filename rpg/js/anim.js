/* ============================================================
   anim.js — スプライトシートのコマ送り再生
   コマごとの表示時間 (durations_ms) をそのまま使う。
   等速再生だと攻撃のタメと振りが崩れるため。
   ============================================================ */

export class Clip {
  /**
   * @param {HTMLImageElement|HTMLCanvasElement} image 横1列（複数行も可）のスプライトシート
   * @param {object} opt frameWidth, frameHeight, columns, frameCount, durations(ms), loop, frames(コマ番号の並び)
   */
  constructor(image, opt) {
    this.image = image;
    this.frameWidth = opt.frameWidth;
    this.frameHeight = opt.frameHeight;
    this.columns = opt.columns || Math.max(1, Math.floor(image.width / opt.frameWidth));
    this.frames = opt.frames || Array.from({ length: opt.frameCount }, (_, i) => i);
    this.durations = opt.durations || this.frames.map(() => 100);
    this.loop = opt.loop !== false;
    this.total = this.durations.reduce((a, b) => a + b, 0);
  }

  get length() { return this.frames.length; }

  /** n 番目のコマの切り出し位置 */
  sourceRect(n) {
    const idx = this.frames[n];
    return {
      sx: (idx % this.columns) * this.frameWidth,
      sy: Math.floor(idx / this.columns) * this.frameHeight,
      sw: this.frameWidth,
      sh: this.frameHeight,
    };
  }
}

export class Animator {
  constructor() {
    this.clip = null;
    this.index = 0;
    this.elapsed = 0;
    this.finished = false;
    this.speed = 1;
  }

  /** 同じクリップなら再生位置を保つ（歩行中の向き変更で足が止まらないように） */
  play(clip, { restart = false, keepPhase = true } = {}) {
    if (this.clip === clip && !restart) return;
    const phase = keepPhase && this.clip ? this.index / Math.max(this.clip.length, 1) : 0;
    this.clip = clip;
    this.index = restart ? 0 : Math.min(clip.length - 1, Math.floor(phase * clip.length));
    this.elapsed = 0;
    this.finished = false;
  }

  update(dtMs) {
    if (!this.clip) return;
    let left = dtMs * this.speed;
    let guard = 64;
    while (left > 0 && !this.finished && guard-- > 0) {
      const dur = this.clip.durations[this.index] || 100;
      const rest = dur - this.elapsed;
      if (left < rest) { this.elapsed += left; break; }
      left -= rest;
      this.elapsed = 0;
      if (this.index + 1 >= this.clip.length) {
        if (this.clip.loop) this.index = 0;
        else { this.index = this.clip.length - 1; this.finished = true; }
      } else {
        this.index++;
      }
    }
  }

  /** (x, y) は描画先の左上。flip=true で左右反転 */
  draw(ctx, x, y, flip = false) {
    if (!this.clip) return;
    const { sx, sy, sw, sh } = this.clip.sourceRect(this.index);
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x) + sw, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(this.clip.image, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.restore();
    } else {
      ctx.drawImage(this.clip.image, sx, sy, sw, sh, Math.round(x), Math.round(y), sw, sh);
    }
  }
}
