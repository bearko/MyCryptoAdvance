/* ============================================================
   game.js — メインループ / カメラ / 宝箱とのやり取り
   ============================================================ */

import { loadImage } from './assets.js';
import { loadHeroAnimations } from './hero.js';
import { Input } from './input.js';
import { WorldMap } from './worldmap.js';
import { TILE } from './tiles.js';
import { Player } from './player.js';
import { Chest, buildChestClips } from './chest.js';
import { Particles } from './particles.js';
import { drawText, textWidth } from './pixelfont.js';

const HERO_ID = 10001;
const CHEST_COUNT = 8;
const REACH = 24;          // 宝箱を調べられる距離(px)
const MIN_SCALE = 2;
const MAX_SCALE = 6;

export class Game {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('#field');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.cam = { x: 0, y: 0, width: 320, height: 200 };
    this.particles = new Particles();
    this.chests = [];
    this.coins = 0;
    this.time = 0;
    this.scale = 3;
    this.promptEl = root.querySelector('#prompt');
    this.coinEl = root.querySelector('#coinValue');
    this.chestEl = root.querySelector('#chestValue');
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

    this.input = new Input(this.root, {
      stick: this.root.querySelector('#stick'),
      knob: this.root.querySelector('#stickKnob'),
      buttons: [...this.root.querySelectorAll('.pad-btn')],
    });

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
      const reward = 60 + Math.floor(rng() * 5) * 40 + (i === 0 ? 0 : 0);
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

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor(Math.min(vw / 260, vh / 200)) || MIN_SCALE));
    const w = Math.ceil(vw / scale);
    const h = Math.ceil(vh / scale);
    this.scale = scale;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * scale}px`;
    this.canvas.style.height = `${h * scale}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.cam.width = w;
    this.cam.height = h;
    this._updateCamera();
  }

  _updateCamera() {
    const { pixelWidth, pixelHeight } = this.map;
    const w = this.cam.width;
    const h = this.cam.height;
    let x = this.player.x - w / 2;
    let y = this.player.y - h / 2 - 8;
    this.cam.x = Math.round(pixelWidth <= w ? (pixelWidth - w) / 2 : Math.max(0, Math.min(pixelWidth - w, x)));
    this.cam.y = Math.round(pixelHeight <= h ? (pixelHeight - h) / 2 : Math.max(0, Math.min(pixelHeight - h, y)));
  }

  /** 宝箱に体がめり込まないようにする（Player から呼ばれる） */
  blockedByEntity(x, y, halfW, h) {
    return this.chests.some(c => c.blocks(x, y, halfW, h));
  }

  start() {
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(50, now - last);
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
