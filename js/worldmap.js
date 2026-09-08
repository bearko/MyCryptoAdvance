/* ============================================================
   worldmap.js — フィールドの生成・当たり判定・描画
   seed 固定のバリューノイズで、湖 / 森 / 街道のある草原を作る。
   ============================================================ */

import { TILE, T, SOLID, buildTileset, mulberry32, makeCanvas } from './tiles.js';

export const MAP_W = 64;
export const MAP_H = 48;
const BORDER = 2;
const FOAM = '#a8d8f0';

function valueNoise(seed) {
  const rng = mulberry32(seed);
  const size = 64;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const at = (x, y) => grid[(y & (size - 1)) * size + (x & (size - 1))];
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
}

export class WorldMap {
  constructor(seed = 20260908) {
    this.seed = seed;
    this.width = MAP_W;
    this.height = MAP_H;
    this.pixelWidth = MAP_W * TILE;
    this.pixelHeight = MAP_H * TILE;
    this.tiles = new Uint8Array(MAP_W * MAP_H);
    this.variant = new Uint8Array(MAP_W * MAP_H);
    this.tileset = buildTileset(seed);
    this._generate();
    this._bakeGround();
    this._collectObjects();
  }

  index(tx, ty) { return ty * MAP_W + tx; }
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.CLIFF;
    return this.tiles[this.index(tx, ty)];
  }
  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    this.tiles[this.index(tx, ty)] = v;
  }
  isSolidTile(tx, ty) { return SOLID.has(this.get(tx, ty)); }

  /** ワールド座標(px)が壁かどうか */
  isSolidAt(x, y) {
    return this.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  _generate() {
    const land = valueNoise(this.seed);
    const forest = valueNoise(this.seed + 7777);
    const rng = mulberry32(this.seed + 31);

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = this.index(tx, ty);
        this.variant[i] = (rng() * 4) | 0;
        let t = T.GRASS;

        // 湖（マップ右下寄り）
        const lake = land(tx * 0.11 + 3.4, ty * 0.11 + 1.7);
        const cx = MAP_W * 0.68, cy = MAP_H * 0.66;
        const d = Math.hypot((tx - cx) / 13, (ty - cy) / 8);
        if (d + (lake - 0.5) * 0.9 < 1) t = T.WATER;

        // 森
        if (t === T.GRASS) {
          const f = forest(tx * 0.13 + 9.1, ty * 0.13 + 4.2);
          if (f > 0.63) t = T.TREE;
          else if (f > 0.58 && rng() < 0.35) t = T.BUSH;
        }

        // 草の表情
        if (t === T.GRASS) {
          const r = rng();
          if (r < 0.05) t = T.GRASS_FLOWER;
          else if (r < 0.10) t = T.TALL_GRASS;
          else if (r < 0.115) t = T.ROCK;
        }

        this.tiles[i] = t;
      }
    }

    // 外周は森と崖で閉じる
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (tx < BORDER || ty < BORDER || tx >= MAP_W - BORDER || ty >= MAP_H - BORDER) {
          // 上端と最下段は木の幹だけが見えてしまうので崖にする
          const stump = ty < BORDER || ty === MAP_H - 1;
          this.set(tx, ty, stump ? T.CLIFF : T.TREE);
        }
      }
    }

    this._carveRoads(rng);
    this._sandShore();
  }

  /** 街道（横断＋縦の分岐）を通す。プレイヤーの初期位置もここ */
  _carveRoads(rng) {
    const roadY = Math.floor(MAP_H * 0.34);
    for (let tx = BORDER; tx < MAP_W - BORDER; tx++) {
      const y = Math.round(roadY + Math.sin(tx * 0.16) * 3 + Math.sin(tx * 0.05) * 2);
      for (let dy = -1; dy <= 1; dy++) this._carve(tx, y + dy);
    }
    const roadX = Math.floor(MAP_W * 0.28);
    for (let ty = BORDER; ty < MAP_H - BORDER; ty++) {
      const x = Math.round(roadX + Math.sin(ty * 0.18) * 2);
      for (let dx = -1; dx <= 1; dx++) this._carve(x + dx, ty);
    }
    // 広場
    const px0 = roadX, py0 = Math.round(roadY + Math.sin(roadX * 0.16) * 3);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (Math.hypot(dx / 4, dy / 3) <= 1) this._carve(px0 + dx, py0 + dy);
      }
    }
    this.spawn = { x: (px0 + 0.5) * TILE, y: (py0 + 1) * TILE };
  }

  _carve(tx, ty) {
    if (tx < BORDER || ty < BORDER || tx >= MAP_W - BORDER || ty >= MAP_H - BORDER) return;
    if (this.get(tx, ty) === T.WATER) return;   // 湖は埋めない
    this.set(tx, ty, T.PATH);
  }

  /** 水際に砂を敷く */
  _sandShore() {
    const add = [];
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        if (this.get(tx, ty) === T.WATER) continue;
        if (this.get(tx, ty) === T.CLIFF) continue;
        const near =
          this.get(tx + 1, ty) === T.WATER || this.get(tx - 1, ty) === T.WATER ||
          this.get(tx, ty + 1) === T.WATER || this.get(tx, ty - 1) === T.WATER;
        if (near) add.push([tx, ty]);
      }
    }
    for (const [tx, ty] of add) this.set(tx, ty, T.SAND);
  }

  /** 地面を1枚の画像に焼く（毎フレームのタイル描画をなくす） */
  _bakeGround() {
    const { canvas, ctx } = makeCanvas(this.pixelWidth, this.pixelHeight);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = this.index(tx, ty);
        const t = this.tiles[i];
        if (t === T.WATER) continue;            // 水はアニメするので毎フレーム描く
        const set = this.tileset.ground[t] || this.tileset.ground[T.GRASS];
        const img = set[this.variant[i] % set.length];
        ctx.drawImage(img, tx * TILE, ty * TILE);
      }
    }
    this._ditherEdges(ctx);
    this.groundCanvas = canvas;
  }

  /** 道・砂と草の境目を1〜2pxのディザで崩す（タイルの直線を目立たせない） */
  _ditherEdges(ctx) {
    const GRASSY = new Set([T.GRASS, T.GRASS_FLOWER, T.TALL_GRASS, T.TREE, T.ROCK, T.BUSH]);
    const rng = mulberry32(this.seed + 909);
    const grassSet = this.tileset.ground[T.GRASS];
    for (let ty = 1; ty < MAP_H - 1; ty++) {
      for (let tx = 1; tx < MAP_W - 1; tx++) {
        const t = this.get(tx, ty);
        if (t !== T.PATH && t !== T.SAND) continue;
        const src = grassSet[(tx * 7 + ty * 13) % grassSet.length];
        const edges = [
          [0, -1, 0, 0, TILE, 1], [0, 1, 0, TILE - 1, TILE, 1],
          [-1, 0, 0, 0, 1, TILE], [1, 0, TILE - 1, 0, 1, TILE],
        ];
        for (const [dx, dy, ox, oy, w, h] of edges) {
          if (!GRASSY.has(this.get(tx + dx, ty + dy))) continue;
          for (let i = 0; i < (w === 1 ? h : w); i++) {
            if (rng() < 0.45) continue;
            const sx = w === 1 ? ox : i;
            const sy = w === 1 ? i : oy;
            ctx.drawImage(src, sx, sy, 1, 1, tx * TILE + sx, ty * TILE + sy, 1, 1);
          }
        }
      }
    }
  }

  /** 木・岩・茂みを y ソート用のリストにする */
  _collectObjects() {
    this.objects = [];
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = this.get(tx, ty);
        const i = this.index(tx, ty);
        let img = null;
        if (t === T.TREE) img = this.tileset.objects.tree[this.variant[i] % 2];
        else if (t === T.ROCK) img = this.tileset.objects.rock[0];
        else if (t === T.BUSH) img = this.tileset.objects.bush[0];
        if (!img) continue;
        // タイルより広い絵（木）はタイル中央に揃える
        const x = tx * TILE - (img.width - TILE) / 2;
        const y = (ty + 1) * TILE - img.height;
        this.objects.push({ x, y, sortY: (ty + 1) * TILE - 2, img });
      }
    }
    this.objects.sort((a, b) => a.sortY - b.sortY);
  }

  /** 歩ける場所か（オブジェクト設置用） */
  isWalkableTile(tx, ty) {
    return !SOLID.has(this.get(tx, ty));
  }

  drawGround(ctx, cam) {
    ctx.drawImage(
      this.groundCanvas,
      cam.x, cam.y, cam.width, cam.height,
      0, 0, cam.width, cam.height,
    );
  }

  /** 見えている範囲の水だけアニメーションさせる */
  drawWater(ctx, cam, timeMs) {
    const frames = this.tileset.water;
    const step = Math.max(0, Math.floor(timeMs / 260));
    const f = frames[step % frames.length];
    const x0 = Math.max(0, Math.floor(cam.x / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE));
    const x1 = Math.min(MAP_W - 1, Math.ceil((cam.x + cam.width) / TILE));
    const y1 = Math.min(MAP_H - 1, Math.ceil((cam.y + cam.height) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.get(tx, ty) !== T.WATER) continue;
        const dx = tx * TILE - cam.x;
        const dy = ty * TILE - cam.y;
        ctx.drawImage(f, dx, dy);
        this._drawFoam(ctx, tx, ty, dx, dy, step);
      }
    }
  }

  /** 岸に当たる辺へ白波を描く */
  _drawFoam(ctx, tx, ty, dx, dy, step) {
    ctx.fillStyle = FOAM;
    const edges = [
      [0, -1, 0, 0, 1, 0], [0, 1, 0, TILE - 1, 1, 0],
      [-1, 0, 0, 0, 0, 1], [1, 0, TILE - 1, 0, 0, 1],
    ];
    for (const [nx, ny, ox, oy, sx, sy] of edges) {
      if (this.get(tx + nx, ty + ny) === T.WATER) continue;
      for (let i = 0; i < TILE; i++) {
        if ((i + step + tx + ty) % 5 < 2) continue;
        ctx.fillRect(dx + ox + sx * i, dy + oy + sy * i, 1, 1);
      }
    }
  }

  /** カメラに映っているオブジェクトだけ返す */
  visibleObjects(cam) {
    const out = [];
    for (const o of this.objects) {
      if (o.x + o.img.width < cam.x || o.x > cam.x + cam.width) continue;
      if (o.y + o.img.height < cam.y || o.y > cam.y + cam.height) continue;
      out.push(o);
    }
    return out;
  }
}
