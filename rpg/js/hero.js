/* ============================================================
   hero.js — mycryptoheroes の HeroAnimations を読み込む
   assets/hero_animations.json（マニフェスト）に従って
   モーション×方向のクリップ表を組み立てる。
   左向き3方向（nw / w / sw）は右向きの左右反転で表示する。
   ============================================================ */

import { Clip } from './anim.js';
import { loadImage, loadJSON } from './assets.js';

export const DIRECTIONS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];

/** 移動ベクトルから8方向キーを求める */
export function vectorToDirection(dx, dy, fallback = 's') {
  if (dx === 0 && dy === 0) return fallback;
  // atan2(y, x) を 45度ごとに丸める。s(下) = +y から時計回り。
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  //  0:e  1:se  2:s  3:sw  4:w(±)  -1:ne  -2:n  -3:nw
  const table = { 0: 'e', 1: 'se', 2: 's', 3: 'sw', 4: 'w', '-4': 'w', '-1': 'ne', '-2': 'n', '-3': 'nw' };
  return table[String(oct)] || fallback;
}

export const DIRECTION_VECTORS = {
  s: [0, 1], se: [0.7071, 0.7071], e: [1, 0], ne: [0.7071, -0.7071],
  n: [0, -1], nw: [-0.7071, -0.7071], w: [-1, 0], sw: [-0.7071, 0.7071],
};

export class HeroAnimations {
  constructor(heroData, clips) {
    this.id = heroData.hero_id;
    this.name = heroData.hero_name;
    this.canvasWidth = heroData.canvas_width;
    this.canvasHeight = heroData.canvas_height;
    this.clips = clips; // { motion: { dir: { clip, flip } } }
  }

  has(motion) { return !!this.clips[motion]; }

  /** @returns {{clip: Clip, flip: boolean}} */
  get(motion, direction) {
    const byDir = this.clips[motion] || this.clips.idle;
    return byDir[direction] || byDir.s || Object.values(byDir)[0];
  }
}

/**
 * @param {string} baseUrl マニフェスト内の image_file_path の基準（末尾スラッシュ付き）
 * @param {number} heroId
 */
export async function loadHeroAnimations(manifestUrl, baseUrl, heroId) {
  const manifest = await loadJSON(manifestUrl);
  const hero = manifest.heroes.find(h => h.hero_id === heroId) || manifest.heroes[0];
  if (!hero) throw new Error('ヒーローのアニメーションが見つかりません');

  // シートは1ヒーローあたり21枚。同じパスは1回だけ読む。
  const cache = new Map();
  const imageOf = path => {
    if (!cache.has(path)) cache.set(path, loadImage(baseUrl + path));
    return cache.get(path);
  };

  const clips = {};
  for (const motion of hero.motions) {
    const byDir = {};
    for (const c of motion.clips) {
      const sheet = c.sprite_sheet;
      const img = await imageOf(sheet.image_file_path);
      byDir[c.direction] = {
        clip: new Clip(img, {
          frameWidth: c.frame_width,
          frameHeight: c.frame_height,
          columns: sheet.columns,
          frameCount: c.frame_count,
          durations: c.durations_ms,
          loop: motion.key !== 'attack',
        }),
        flip: false,
      };
    }
    // 左向きは右向きの反転で補う
    for (const m of motion.mirrored_directions || []) {
      const src = byDir[m.mirror_of];
      if (src) byDir[m.direction] = { clip: src.clip, flip: true };
    }
    clips[motion.key] = byDir;
  }

  return new HeroAnimations(hero, clips);
}
