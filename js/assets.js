/* ============================================================
   assets.js — 画像 / JSON のロード
   ============================================================ */

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像を読み込めません: ${src}`));
    img.src = src;
  });
}

export async function loadJSON(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`JSONを読み込めません: ${src} (${res.status})`);
  return res.json();
}

/** 進捗つきで複数ファイルをロードする */
export class Loader {
  constructor(onProgress) {
    this.onProgress = onProgress || (() => {});
    this.done = 0;
    this.total = 0;
  }

  _tick() {
    this.done++;
    this.onProgress(this.done / Math.max(this.total, 1));
  }

  async all(tasks) {
    this.total += tasks.length;
    return Promise.all(tasks.map(p => p.then(v => { this._tick(); return v; })));
  }
}
