/* ============================================================
   game.js — メインループ / カメラ / ミニマップ / 宝箱とのやり取り

   画面は3分割。上50%がゲーム画面、中20%がマップ、下30%がスティック。
   各キャンバスはペインの実寸から毎回サイズを決める。
   ============================================================ */

import { loadImage } from './assets.js';
import { loadHeroAnimations } from './hero.js';
import { Input } from './input.js';
import { WorldMap, MAP_W, MAP_H } from './worldmap.js';
import { TILE } from './tiles.js';
import { Player } from './player.js';
import { Chest, buildChestClips } from './chest.js';
import { Particles } from './particles.js';
import { drawText, textWidth } from './pixelfont.js';

const HERO_ID = 10001;
const CHEST_COUNT = 8;
const REACH = 24;          // 宝箱を調べられる距離(px)
const MIN_ZOOM = 2;
const MAX_ZOOM = 5;
const ZOOM_KEY = 'mca-rpg.zoom';

export class Game {
  constructor(root) {
    this.root = root;
    this.fieldPane = root.querySelector('#fieldPane');
    this.mapPane = root.querySelector('#mapPane');
    this.padPane = root.querySelector('#padPane');

    this.canvas = root.querySelector('#field');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.mini = root.querySelector('#minimap');
    this.miniCtx = this.mini.getContext('2d');
    this.miniCtx.imageSmoothingEnabled = false;
    this.miniScale = 2;

    this.zoomInEl = root.querySelector('#zoomIn');
    this.zoomOutEl = root.querySelector('#zoomOut');
    this.zoomLabelEl = root.querySelector('#zoomLabel');
    this.promptEl = root.querySelector('#prompt');
    this.coinEl = root.querySelector('#coinValue');
    this.chestEl = root.querySelector('#chestValue');

    this.cam = { x: 0, y: 0, width: 320, height: 200 };
    this.particles = new Particles();
    this.chests = [];
    this.coins = 0;
    this.time = 0;
    this.zoom = 0;   // 0 = 未設定（初回の resize で決める）
  }

  async load(onProgress = () => {}) {
    onProgress(0.05, 'フィールドを生成中…');
    this.map = new WorldMap();

    onProgress(0.35, 'ヒーローを読み込み中…');
    this.heroAnim = await loadHeroAnimations(
      'assets/hero_animations.json', 'assets/', HERO_ID,
    );

    onProgress(0.8, '宝箱を配置中…');
    const chestImage = await loadImage('assets/objects/chest.png');
    this.chestClips = buildChestClips(chestImage);

    this.player = new Player(this.heroAnim, this.map.spawn.x, this.map.spawn.y);
    this._placeChests();

    this.input = new Input({
      pad: this.padPane,
      stick: this.root.querySelector('#stick'),
      knob: this.root.querySelector('#stickKnob'),
      buttons: [...this.root.querySelectorAll('.pad-btn')],
    });

    this.zoomInEl.addEventListener('click', () => this.setZoom(this.zoom + 1));
    this.zoomOutEl.addEventListener('click', () => this.setZoom(this.zoom - 1));

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    this.resize();
    onProgress(1, 'かんりょう');
    return this;
  }

  /** 歩ける場所に、離して宝箱を置く */
  _placeChests() {
    const rng = mulberryFrom(this.map.seed + 4242);
    const spots = [];
    let guard = 6000;
    while (spots.length < CHEST_COUNT && guard-- > 0) {
      const tx = 3 + Math.floor(rng() * (this.map.width - 6));
      const ty = 3 + Math.floor(rng() * (this.map.height - 6));
      if (!this._isChestSpot(tx, ty)) continue;
      const x = (tx + 0.5) * TILE;
      const y = (ty + 1) * TILE;
      if (Math.hypot(x - this.map.spawn.x, y - this.map.spawn.y) < TILE * 4) continue;
      if (spots.some(s => Math.hypot(s.x - x, s.y - y) < TILE * 7)) continue;
      spots.push({ x, y });
    }
    this.chests = spots.map((s, i) => {
      const reward = 60 + Math.floor(rng() * 5) * 40;
      return new Chest(this.chestClips, s.x, s.y, reward);
    });
  }

  _isChestSpot(tx, ty) {
    if (!this.map.isWalkableTile(tx, ty)) return false;
    // 手前と左右が空いていること（正面から調べられるように）
    return (
      this.map.isWalkableTile(tx, ty + 1) &&
      this.map.isWalkableTile(tx - 1, ty) &&
      this.map.isWalkableTile(tx + 1, ty)
    );
  }

  // ---------------- 表示倍率 ----------------

  _storedZoom() {
    try {
      const v = parseInt(localStorage.getItem(ZOOM_KEY), 10);
      if (v >= MIN_ZOOM && v <= MAX_ZOOM) return v;
    } catch (_) { /* 使えない環境は既定値で */ }
    return 0;
  }

  _defaultZoom(paneHeight) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(paneHeight / 220) || MIN_ZOOM));
  }

  setZoom(z) {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    if (next === this.zoom) return;
    this.zoom = next;
    try { localStorage.setItem(ZOOM_KEY, String(next)); } catch (_) { /* 保存できなくても続行 */ }
    this.resize();
  }

  _updateZoomUi() {
    this.zoomLabelEl.textContent = `×${this.zoom}`;
    this.zoomInEl.disabled = this.zoom >= MAX_ZOOM;
    this.zoomOutEl.disabled = this.zoom <= MIN_ZOOM;
  }

  // ---------------- レイアウト ----------------

  resize() {
    const w = this.fieldPane.clientWidth;
    const h = this.fieldPane.clientHeight;
    if (!this.zoom) this.zoom = this._storedZoom() || this._defaultZoom(h);

    const z = this.zoom;
    // ドットが崩れないよう、キャンバスは常に整数倍で表示する
    const lw = Math.max(48, Math.floor(w / z));
    const lh = Math.max(40, Math.floor(h / z));
    this.canvas.width = lw;
    this.canvas.height = lh;
    this.canvas.style.width = `${lw * z}px`;
    this.canvas.style.height = `${lh * z}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.cam.width = lw;
    this.cam.height = lh;

    this._resizeMinimap();
    this._updateZoomUi();
    if (this.player) this._updateCamera();
  }

  _resizeMinimap() {
    // 左右のゲージと下のラベルを避けた範囲に収める
    const availW = this.mapPane.clientWidth * 0.58;
    const availH = this.mapPane.clientHeight - 20;
    const s = Math.max(1, Math.floor(Math.min(availW / MAP_W, availH / MAP_H)));
    this.miniScale = s;
    this.mini.width = MAP_W * s;
    this.mini.height = MAP_H * s;
    this.mini.style.width = `${MAP_W * s}px`;
    this.mini.style.height = `${MAP_H * s}px`;
    this.miniCtx.imageSmoothingEnabled = false;
  }

  _updateCamera() {
    const { pixelWidth, pixelHeight } = this.map;
    const w = this.cam.width;
    const h = this.cam.height;
    const x = this.player.x - w / 2;
    const y = this.player.y - h / 2 - 8;
    this.cam.x = Math.round(pixelWidth <= w ? (pixelWidth - w) / 2 : Math.max(0, Math.min(pixelWidth - w, x)));
    this.cam.y = Math.round(pixelHeight <= h ? (pixelHeight - h) / 2 : Math.max(0, Math.min(pixelHeight - h, y)));
  }

  /** 宝箱に体がめり込まないようにする（Player から呼ばれる） */
  blockedByEntity(x, y, halfW, h) {
    return this.chests.some(c => c.blocks(x, y, halfW, h));
  }

  // ---------------- ループ ----------------

  start() {
    this.input.enabled = true;   // タイトルを抜けてから入力を受け付ける
    let last = performance.now();
    const frame = now => {
      // rAFの時刻が直前の performance.now() より前になることがあるので負を弾く
      const dt = Math.max(0, Math.min(50, now - last));
      last = now;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dtMs) {
    this.time += dtMs;
    const move = this.input.moveVector();
    this.player.update(dtMs, move, this, this.particles);

    for (const c of this.chests) c.update(dtMs);
    this.particles.update(dtMs);

    this.nearChest = this._findNearChest();
    if (this.input.consume('action') && this.nearChest) this._openChest(this.nearChest);
    if (this.input.consume('attack')) this.player.attack();

    this._updateCamera();
    this._updateHud();
  }

  _findNearChest() {
    const front = this.player.facingPoint(10);
    let best = null;
    let bestD = Infinity;
    for (const c of this.chests) {
      if (c.opened) continue;
      const d = Math.min(c.distanceTo(this.player.x, this.player.y), c.distanceTo(front.x, front.y));
      if (d < REACH && d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  _openChest(chest) {
    if (!chest.open()) return;
    this.coins += chest.reward;
    this.particles.spawnBurst(chest.x, chest.y - 12);
    this.particles.spawnText(chest.x, chest.y - 24, `+${chest.reward} G`);
    this.nearChest = null;
    playChime();
  }

  _updateHud() {
    if (this.coinEl.textContent !== String(this.coins)) {
      this.coinEl.textContent = String(this.coins);
    }
    const opened = this.chests.filter(c => c.opened).length;
    const label = `${opened}/${this.chests.length}`;
    if (this.chestEl.textContent !== label) this.chestEl.textContent = label;

    const show = !!this.nearChest;
    if (show !== this._promptShown) {
      this._promptShown = show;
      this.promptEl.classList.toggle('is-visible', show);
    }
  }

  // ---------------- 描画 ----------------

  render() {
    const ctx = this.ctx;
    const cam = this.cam;
    ctx.fillStyle = '#1d2b1c';
    ctx.fillRect(0, 0, cam.width, cam.height);

    this.map.drawGround(ctx, cam);
    this.map.drawWater(ctx, cam, this.time);

    // 立体物とキャラを足元の Y で並べ替えて描く
    const drawables = this.map.visibleObjects(cam);
    for (const c of this.chests) {
      if (c.x + 24 < cam.x || c.x - 24 > cam.x + cam.width) continue;
      if (c.y + 24 < cam.y || c.y - 40 > cam.y + cam.height) continue;
      drawables.push(c);
    }
    drawables.push(this.player);
    drawables.sort((a, b) => a.sortY - b.sortY);

    for (const d of drawables) {
      if (d.draw) d.draw(ctx, cam);
      else ctx.drawImage(d.img, Math.round(d.x - cam.x), Math.round(d.y - cam.y));
    }

    this.particles.draw(ctx, cam);
    if (this.nearChest) this._drawChestMarker(ctx, cam, this.nearChest);

    this._renderMinimap();
  }

  /** 調べられる宝箱の上に出る矢印 */
  _drawChestMarker(ctx, cam, chest) {
    const bob = Math.round(Math.sin(this.time / 160) * 1.5);
    const x = Math.round(chest.x - cam.x);
    const y = Math.round(chest.y - 36 - cam.y) + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 3, y + 1, 7, 4);
    ctx.fillStyle = '#ffe36a';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - i, y + i, i * 2 + 1, 1);
    drawText(ctx, 'A', x - Math.round(textWidth('A') / 2), y - 8, '#fff6d0');
  }

  /** 中段のミニマップ。宝箱・現在地・いま見えている範囲を重ねる */
  _renderMinimap() {
    const ctx = this.miniCtx;
    const s = this.miniScale;
    ctx.drawImage(this.map.minimapCanvas, 0, 0, MAP_W * s, MAP_H * s);

    // 宝箱（開けたものは薄く）
    for (const c of this.chests) {
      const x = Math.floor(c.x / TILE) * s;
      const y = Math.floor((c.y - 1) / TILE) * s;
      ctx.fillStyle = c.opened ? 'rgba(120, 90, 30, 0.85)' : '#ffd24a';
      ctx.fillRect(x, y, s, s);
    }

    // いま画面に映っている範囲
    const vx = (this.cam.x / TILE) * s;
    const vy = (this.cam.y / TILE) * s;
    const vw = (this.cam.width / TILE) * s;
    const vh = (this.cam.height / TILE) * s;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(vw), Math.round(vh));

    // 現在地（点滅）
    const px = Math.round((this.player.x / TILE) * s);
    const py = Math.round((this.player.y / TILE) * s);
    const size = s + 2;
    ctx.fillStyle = '#22180c';
    ctx.fillRect(px - size / 2 - 1, py - size / 2 - 1, size + 2, size + 2);
    ctx.fillStyle = (this.time % 900) < 560 ? '#ffffff' : '#ffd24a';
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }
}

// worldmap 側と同じ乱数（import 循環を避けるため小さく持つ）
function mulberryFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let audioCtx = null;
function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    [880, 1174.7, 1568].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  } catch (_) { /* 音が出せない環境では黙って無視 */ }
}
