/* ============================================================
   tiles.js — フィールドのドット絵タイル / オブジェクトを生成する
   外部素材を使わず、16x16 のピクセルをコードで打っている。
   （ヒーローと宝箱だけが画像アセット）
   ============================================================ */

export const TILE = 16;

// タイル種別
export const T = {
  GRASS: 0,
  GRASS_FLOWER: 1,
  TALL_GRASS: 2,
  PATH: 3,
  SAND: 4,
  WATER: 5,
  TREE: 6,
  ROCK: 7,
  CLIFF: 8,
  BUSH: 9,
};

/** 通れないタイル */
export const SOLID = new Set([T.WATER, T.TREE, T.ROCK, T.CLIFF]);
/** 背の高いオブジェクト（キャラの後ろに回り込めるよう y ソートで描く） */
export const TALL = new Set([T.TREE, T.ROCK, T.CLIFF, T.BUSH]);

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

/** 決まった見た目になるように乱数は seed 固定 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const P = {
  grass: ['#4b9247', '#54a04f', '#41853f', '#5cab55'],
  grassDark: '#377338',
  grassLight: '#74bd66',
  flower: ['#f2e06a', '#ef8383', '#eef2f6', '#c88ce0'],
  flowerDark: '#b8863c',
  path: ['#c2a276', '#b8976a', '#cdb083'],
  pathDark: '#9c7d55',
  sand: ['#e3cf9c', '#d8c28c', '#eeddb0'],
  water: ['#2f6ea6', '#356fb0', '#295f93'],
  waterLight: '#5aa3d8',
  waterFoam: '#a8d8f0',
  trunk: '#6b4526',
  trunkDark: '#4e3018',
  leaf: '#2e7a3e',
  leafLight: '#48a856',
  leafDark: '#1d5730',
  outline: '#16301c',
  outlineWarm: '#2b2318',
  rock: '#8d919b',
  rockDark: '#666a74',
  rockLight: '#b3b8c2',
  cliff: '#8a7358',
  cliffDark: '#63523d',
  cliffLight: '#a89075',
  shadow: 'rgba(0,0,0,0.22)',
};

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ---------------- 地面タイル ----------------

function paintGrass(ctx, rng, { flowers = 0, tall = false } = {}) {
  px(ctx, 0, 0, P.grass[0], TILE, TILE);
  for (let i = 0; i < 20; i++) {
    const x = (rng() * TILE) | 0;
    const y = (rng() * TILE) | 0;
    px(ctx, x, y, P.grass[1 + ((rng() * 3) | 0)]);
  }
  // 草の葉（2px の縦線）
  for (let i = 0; i < 5; i++) {
    const x = (rng() * TILE) | 0;
    const y = 1 + ((rng() * (TILE - 3)) | 0);
    px(ctx, x, y, P.grassDark, 1, 2);
    px(ctx, x, y - 1, P.grassLight);
  }
  if (tall) {
    for (let i = 0; i < 4; i++) {
      const x = 1 + ((rng() * (TILE - 2)) | 0);
      const y = 4 + ((rng() * 9) | 0);
      px(ctx, x, y, P.grassDark, 1, 4);
      px(ctx, x, y - 1, P.grassLight, 1, 2);
      px(ctx, x + 1, y + 1, P.grassDark, 1, 2);
    }
  }
  // 小さな花（2x2の花びら＋茎）
  for (let i = 0; i < flowers; i++) {
    const x = 2 + ((rng() * (TILE - 5)) | 0);
    const y = 2 + ((rng() * (TILE - 5)) | 0);
    const c = P.flower[(rng() * P.flower.length) | 0];
    px(ctx, x, y, c, 2, 2);
    px(ctx, x + 1, y + 1, P.flowerDark);
    px(ctx, x, y + 2, P.grassDark);
  }
}

function paintPath(ctx, rng) {
  px(ctx, 0, 0, P.path[0], TILE, TILE);
  for (let i = 0; i < 60; i++) {
    px(ctx, (rng() * TILE) | 0, (rng() * TILE) | 0, P.path[1 + ((rng() * 2) | 0)]);
  }
  for (let i = 0; i < 5; i++) {
    const x = (rng() * (TILE - 2)) | 0;
    const y = (rng() * (TILE - 1)) | 0;
    px(ctx, x, y, P.pathDark, 2, 1);
  }
}

function paintSand(ctx, rng) {
  px(ctx, 0, 0, P.sand[0], TILE, TILE);
  for (let i = 0; i < 50; i++) {
    px(ctx, (rng() * TILE) | 0, (rng() * TILE) | 0, P.sand[1 + ((rng() * 2) | 0)]);
  }
}

function paintWater(ctx, rng, phase) {
  px(ctx, 0, 0, P.water[0], TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if ((x + y * 2 + phase * 3) % 7 === 0) px(ctx, x, y, P.water[1]);
      else if ((x * 2 - y + phase * 2) % 11 === 0) px(ctx, x, y, P.water[2]);
    }
  }
  // さざなみ
  for (let i = 0; i < 3; i++) {
    const y = ((i * 5 + phase * 2) % TILE) | 0;
    const x = ((rng() * TILE) | 0);
    px(ctx, x, y, P.waterLight, 3, 1);
    px(ctx, (x + 6) % TILE, (y + 3) % TILE, P.waterLight, 2, 1);
  }
}

function paintCliff(ctx, rng) {
  px(ctx, 0, 0, P.cliff, TILE, TILE);
  for (let i = 0; i < 40; i++) {
    px(ctx, (rng() * TILE) | 0, (rng() * TILE) | 0, rng() < 0.5 ? P.cliffDark : P.cliffLight);
  }
  px(ctx, 0, 0, P.cliffLight, TILE, 2);
  px(ctx, 0, TILE - 2, P.cliffDark, TILE, 2);
}

// ---------------- 立体オブジェクト ----------------

/** シルエットの外側に1pxの縁取りを足す（草地の上でも形が読めるように） */
function addOutline(ctx, w, h, color) {
  const src = ctx.getImageData(0, 0, w, h).data;
  const alpha = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(x, y) > 0) continue;
      if (alpha(x - 1, y) > 200 || alpha(x + 1, y) > 200 ||
          alpha(x, y - 1) > 200 || alpha(x, y + 1) > 200) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

/** 足元の影を「下に」敷く（縁取りの後に呼ぶ） */
function addShadow(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = P.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function disc(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** 葉のかたまりに明暗の粒を散らす */
function speckleLeaves(ctx, w, h, rng, count) {
  const src = ctx.getImageData(0, 0, w, h).data;
  for (let i = 0; i < count; i++) {
    const x = (rng() * w) | 0;
    const y = (rng() * h) | 0;
    const o = (y * w + x) * 4;
    if (src[o + 3] < 200) continue;
    if (!(src[o + 1] > src[o] + 10 && src[o + 1] > 70)) continue;   // 緑だけ
    px(ctx, x, y, rng() < 0.45 ? P.leafDark : P.leafLight);
  }
}

export const TREE_W = 24;
export const TREE_H = 32;

function paintBroadleaf(ctx, rng) {
  const cx = TREE_W / 2;
  const baseY = TREE_H - 2;
  // 幹
  px(ctx, cx - 2, baseY - 11, P.trunk, 4, 11);
  px(ctx, cx - 2, baseY - 11, P.trunkDark, 1, 11);
  px(ctx, cx + 1, baseY - 11, P.trunkDark, 1, 11);
  px(ctx, cx - 3, baseY - 1, P.trunkDark, 6, 1);
  // 葉
  for (const [bx, by, r] of [[cx, 12, 8], [cx - 6, 16, 5.5], [cx + 6, 16, 5.5], [cx, 17, 7]]) {
    disc(ctx, bx, by, r, P.leaf);
  }
  speckleLeaves(ctx, TREE_W, TREE_H, rng, 130);
  // 光の当たる側
  disc(ctx, cx - 3, 10, 3, P.leafLight);
  px(ctx, cx - 4, 5, P.leafLight, 5, 1);
  addOutline(ctx, TREE_W, TREE_H, P.outline);
  addShadow(ctx, cx, baseY, 7, 2.5);
}

function paintPine(ctx, rng) {
  const cx = TREE_W / 2;
  const baseY = TREE_H - 2;
  px(ctx, cx - 2, baseY - 7, P.trunk, 4, 7);
  px(ctx, cx - 2, baseY - 7, P.trunkDark, 1, 7);
  // 三角を3段
  const layers = [[4, 6], [11, 9], [17, 11]];
  for (const [top, half] of layers) {
    for (let i = 0; i < 8; i++) {
      const w = Math.round((half * 2 * (i + 1)) / 8);
      px(ctx, cx - Math.floor(w / 2), top + i, P.leaf, w, 1);
    }
  }
  speckleLeaves(ctx, TREE_W, TREE_H, rng, 110);
  px(ctx, cx - 1, 5, P.leafLight, 2, 2);
  addOutline(ctx, TREE_W, TREE_H, P.outline);
  addShadow(ctx, cx, baseY, 6, 2.5);
}

function paintRock(ctx, rng) {
  for (const [x, y, w, h] of [[4, 6, 8, 7], [3, 8, 10, 5], [5, 5, 6, 2]]) {
    px(ctx, x, y, P.rock, w, h);
  }
  px(ctx, 5, 5, P.rockLight, 4, 1);
  px(ctx, 4, 6, P.rockLight, 2, 1);
  px(ctx, 3, 11, P.rockDark, 10, 2);
  for (let i = 0; i < 10; i++) {
    px(ctx, 4 + ((rng() * 8) | 0), 6 + ((rng() * 6) | 0), rng() < 0.5 ? P.rockDark : P.rockLight);
  }
  addOutline(ctx, TILE, TILE, P.outlineWarm);
  addShadow(ctx, 8, 14, 6, 2.2);
}

function paintBush(ctx, rng) {
  for (const [bx, by, r] of [[8, 9, 5], [4, 11, 3.5], [12, 11, 3.5]]) disc(ctx, bx, by, r, P.leaf);
  speckleLeaves(ctx, TILE, TILE, rng, 40);
  disc(ctx, 6, 8, 2, P.leafLight);
  addOutline(ctx, TILE, TILE, P.outline);
  addShadow(ctx, 8, 14, 5, 2);
}

// ---------------- 生成 ----------------

export function buildTileset(seed = 20260908) {
  const rng = mulberry32(seed);
  const make = (w, h, paint) => {
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    return canvas;
  };

  const ground = {};
  ground[T.GRASS] = [0, 1, 2, 3].map(() => make(TILE, TILE, ctx => paintGrass(ctx, rng)));
  ground[T.GRASS_FLOWER] = [0, 1].map(() => make(TILE, TILE, ctx => paintGrass(ctx, rng, { flowers: 2 })));
  ground[T.TALL_GRASS] = [0, 1].map(() => make(TILE, TILE, ctx => paintGrass(ctx, rng, { tall: true })));
  ground[T.PATH] = [0, 1, 2].map(() => make(TILE, TILE, ctx => paintPath(ctx, rng)));
  ground[T.SAND] = [0, 1, 2].map(() => make(TILE, TILE, ctx => paintSand(ctx, rng)));
  ground[T.CLIFF] = [0, 1].map(() => make(TILE, TILE, ctx => paintCliff(ctx, rng)));
  // 木や岩の足元にも草を敷く
  ground[T.TREE] = ground[T.GRASS];
  ground[T.ROCK] = ground[T.GRASS];
  ground[T.BUSH] = ground[T.GRASS];

  const water = [0, 1, 2, 3].map(i => make(TILE, TILE, ctx => paintWater(ctx, mulberry32(seed + i * 97), i)));

  const objects = {
    tree: [
      make(TREE_W, TREE_H, ctx => paintBroadleaf(ctx, rng)),
      make(TREE_W, TREE_H, ctx => paintPine(ctx, rng)),
    ],
    rock: [make(TILE, TILE, ctx => paintRock(ctx, rng))],
    bush: [make(TILE, TILE, ctx => paintBush(ctx, rng))],
  };

  return { ground, water, objects };
}
