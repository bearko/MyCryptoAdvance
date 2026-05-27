/* ============================================================
   engine.js — real-time game loop, camera, rendering, combat
   Vampire Survivors-style action engine
   ============================================================ */

import { ASSETS, ENEMY_TYPES, STAGE_WAVES, TACTIC, LEVELUP_CHOICES, HEROES } from './constants.js';
import { audio } from './audio.js';

const PI2 = Math.PI * 2;
const PICKUP_MAGNET_DIST = 60;
const PICKUP_MAGNET_SPEED = 300;

export class GameEngine {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.running = false;
    this.paused = false;
    this.lastTime = 0;

    this.player = null;
    this.allies = [];
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.sprites = {};

    this.cam = { x: 0, y: 0 };
    this.fieldSize = 2000;
    this.stageTime = 0;
    this.stageDuration = 300;
    this.waveIndex = 0;
    this.waves = [];
    this.spawnTimer = 0;
    this.spawnQueue = [];

    this.xp = 0;
    this.level = 1;
    this.xpTable = [];
    this.kills = 0;
    this.totalEnemies = 0;
    this.spawnedCount = 0;
    this.tactic = TACTIC.BALANCED;
    this.allyPhyBuff = 1.0;
    this.pickupRangeBonus = 0;

    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.hitStop = 0;
    this.screenShake = 0;
    this.screenShakeX = 0;
    this.screenShakeY = 0;

    this.input = { dx: 0, dy: 0 };
    this.onLevelUp = null;
    this.onRescue = null;
    this.onBoss = null;
    this.onVictory = null;
    this.onDefeat = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.vw = this.canvas.width;
    this.vh = this.canvas.height;
  }

  async loadSprites(ids) {
    const promises = ids.map(([key, url]) =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => { this.sprites[key] = img; resolve(); };
        img.src = url;
      })
    );
    await Promise.all(promises);
  }

  initStage(stageKey, partyHeroes) {
    const stage = STAGE_WAVES[stageKey];
    this.fieldSize = stage.fieldSize || 2000;
    this.laneWidth = stage.laneWidth || 0;
    this.stageDuration = stage.duration;
    this.waves = stage.waves;
    this.xpTable = stage.xpTable || [];
    this.stageTime = 0;
    this.waveIndex = 0;
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.xp = 0;
    this.level = 1;
    this.kills = 0;
    this.totalEnemies = stage.totalEnemies || 0;
    this.spawnedCount = 0;
    this.allyPhyBuff = 1.0;
    this.pickupRangeBonus = 0;

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.allies = [];

    const cx = this.fieldSize / 2;
    const cy = this.fieldSize / 2;

    const playerDef = partyHeroes[0];
    this.player = this._createUnit(playerDef, cx, cy, true);
    this.player.isPlayer = true;

    for (let i = 1; i < partyHeroes.length; i++) {
      const angle = (i / (partyHeroes.length - 1)) * PI2;
      const ally = this._createUnit(partyHeroes[i], cx + Math.cos(angle) * 50, cy + Math.sin(angle) * 50, true);
      this.allies.push(ally);
    }
  }

  _createUnit(def, x, y, isAlly) {
    const s = def.baseStats;
    return {
      id: def.id, name: def.name, imageId: def.imageId,
      x, y, radius: isAlly ? 14 : 12,
      hp: s.maxHp, maxHp: s.maxHp,
      phy: s.phy, int: s.int, agi: s.agi,
      atkSpeed: s.atkSpeed, atkRange: s.atkRange,
      atkType: def.atkType, atkPattern: def.atkPattern,
      atkTimer: 0, alive: true, isAlly: true,
      facingX: 0, facingY: 1, flash: 0,
      spriteKey: isAlly ? `hero_${def.imageId}` : `enemy_${def.imageId}`,
    };
  }

  start() {
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  stop() { this.running = false; }
  pause() { this.paused = true; }
  resume() { this.paused = false; this.lastTime = performance.now(); }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.paused) {
      this._update(dt);
    }
    this._render();
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.hitStop > 0) { this.hitStop -= dt; return; }

    this.stageTime += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    if (this.screenShake > 0) {
      this.screenShake -= dt;
      this.screenShakeX = (Math.random() - 0.5) * this.screenShake * 20;
      this.screenShakeY = (Math.random() - 0.5) * this.screenShake * 20;
    } else { this.screenShakeX = 0; this.screenShakeY = 0; }

    this._processWaves(dt);
    this._updatePlayer(dt);
    this._updateAllies(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._updatePickups(dt);
    this._updateParticles(dt);
    this._checkCollisions();
    this._updateHud();

    if (this.player.hp <= 0 && this.onDefeat) {
      this.stop();
      this.onDefeat();
    }
    const remaining = this.totalEnemies - this.kills;
    if (this.totalEnemies > 0 && remaining <= 0 && this.enemies.length === 0 && this.spawnQueue.length === 0 && this.onVictory) {
      this.stop();
      this.onVictory({ kills: this.kills, level: this.level, time: this.stageTime });
    }
  }

  _processWaves(dt) {
    while (this.waveIndex < this.waves.length && this.stageTime >= this.waves[this.waveIndex].time) {
      const wave = this.waves[this.waveIndex];
      if (wave.event === 'rescue' && this.onRescue) {
        this.onRescue(wave.heroKey);
      } else if (wave.event === 'boss' && this.onBoss) {
        this.onBoss(wave);
      } else if (wave.enemies) {
        for (let i = 0; i < wave.count; i++) {
          this.spawnQueue.push({
            type: wave.enemies[i % wave.enemies.length],
            delay: i * wave.interval,
            spawnDir: wave.spawnDir || null,
          });
        }
      }
      this.waveIndex++;
    }

    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      this.spawnQueue[i].delay -= dt;
      if (this.spawnQueue[i].delay <= 0) {
        this._spawnEnemy(this.spawnQueue[i].type, { spawnDir: this.spawnQueue[i].spawnDir });
        this.spawnQueue.splice(i, 1);
      }
    }
  }

  _spawnEnemy(typeKey, options = {}) {
    const def = ENEMY_TYPES[typeKey];
    if (!def) return;
    let angle;
    if (options.spawnDir) {
      const [center, spread] = options.spawnDir;
      angle = center + (Math.random() - 0.5) * 2 * spread;
    } else {
      angle = Math.random() * PI2;
    }
    const dist = Math.max(this.vw, this.vh) * 0.6 + Math.random() * 100;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    const scale = options.scale || 1;
    const clampedX = this.laneWidth
      ? Math.max(this.fieldSize / 2 - this.laneWidth / 2, Math.min(this.fieldSize / 2 + this.laneWidth / 2, x))
      : Math.max(20, Math.min(this.fieldSize - 20, x));
    const e = {
      id: `e_${Date.now()}_${Math.random()}`,
      name: def.name, imageId: def.imageId,
      x: clampedX,
      y: Math.max(20, Math.min(this.fieldSize - 20, y)),
      radius: def.radius * scale,
      hp: def.hp * (options.hpMul || 1), maxHp: def.hp * (options.hpMul || 1),
      phy: def.phy * (options.dmgMul || 1), speed: def.speed,
      xpValue: def.xp * scale, alive: true, flash: 0,
      spriteKey: `enemy_${def.imageId}`, scale,
      isBoss: !!options.isBoss,
    };
    this.enemies.push(e);
    this.spawnedCount++;
  }

  spawnBoss(wave) {
    this._spawnEnemy(wave.bossType, {
      scale: wave.bossScale || 2, hpMul: wave.bossHpMul || 5,
      dmgMul: wave.bossDmgMul || 2, isBoss: true,
    });
  }

  addAlly(heroDef) {
    const angle = Math.random() * PI2;
    const ally = this._createUnit(heroDef, this.player.x + Math.cos(angle) * 40, this.player.y + Math.sin(angle) * 40, true);
    this.allies.push(ally);
  }

  _clampToLane(x) {
    if (!this.laneWidth) return x;
    const center = this.fieldSize / 2;
    const half = this.laneWidth / 2;
    return Math.max(center - half, Math.min(center + half, x));
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (!p.alive) return;
    const speed = p.agi * 1.8;
    const mag = Math.sqrt(this.input.dx ** 2 + this.input.dy ** 2);
    if (mag > 0.1) {
      const nx = this.input.dx / mag, ny = this.input.dy / mag;
      p.x += nx * speed * dt;
      p.y += ny * speed * dt;
      p.x = this._clampToLane(p.x);
      p.y = Math.max(p.radius, Math.min(this.fieldSize - p.radius, p.y));
      p.facingX = nx; p.facingY = ny;
    }
    this._contactAttack(p, dt);
    p.flash = Math.max(0, p.flash - dt * 5);

    this.cam.x = p.x - this.vw / 2 + this.screenShakeX;
    this.cam.y = p.y - this.vh / 2 + this.screenShakeY;
  }

  _updateAllies(dt) {
    const tactic = this.tactic;
    for (const a of this.allies) {
      if (!a.alive) continue;

      const dx = this.player.x - a.x, dy = this.player.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetX = this.player.x, targetY = this.player.y;
      let moveToTarget = dist > tactic.followDist;

      if (a.atkType !== 'heal') {
        const nearest = this._findNearest(a, this.enemies, a.atkRange * tactic.aggroRange * 2);
        if (nearest) {
          if (a.atkType === 'melee') {
            targetX = nearest.x; targetY = nearest.y;
            moveToTarget = true;
          }
          a.facingX = nearest.x - a.x; a.facingY = nearest.y - a.y;
          const fMag = Math.sqrt(a.facingX ** 2 + a.facingY ** 2);
          if (fMag > 0) { a.facingX /= fMag; a.facingY /= fMag; }
        }
      }

      if (moveToTarget) {
        const tdx = targetX - a.x, tdy = targetY - a.y;
        const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tDist > 5) {
          const speed = a.agi * 1.5;
          a.x += (tdx / tDist) * speed * dt;
          a.y += (tdy / tDist) * speed * dt;
          a.x = Math.max(a.radius, Math.min(this.fieldSize - a.radius, a.x));
          a.y = Math.max(a.radius, Math.min(this.fieldSize - a.radius, a.y));
        }
      }

      a.x = this._clampToLane(a.x);

      if (a.atkType === 'heal') {
        this._healAlly(a, dt);
      } else {
        this._contactAttack(a, dt);
      }
      a.flash = Math.max(0, a.flash - dt * 5);
    }
  }

  _contactAttack(unit, dt) {
    if (unit.atkType === 'none') return;
    unit.atkTimer += dt;
    const minInterval = 0.08;
    if (unit.atkTimer < minInterval) return;

    const contactRange = unit.atkRange + 10;
    let hasContact = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = (e.x - unit.x) ** 2 + (e.y - unit.y) ** 2;
      if (d2 < (contactRange + e.radius) ** 2) { hasContact = true; break; }
    }

    if (!hasContact) {
      if (unit.atkType === 'ranged' || unit.atkType === 'magic') {
        const interval = 1.0 / unit.atkSpeed;
        if (unit.atkTimer < interval) return;
        unit.atkTimer -= interval;
        const target = this._findNearest(unit, this.enemies, unit.atkRange * 2.5);
        if (!target) return;
        const dx = target.x - unit.x, dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const phyMul = unit.isPlayer ? 1 : this.allyPhyBuff;
        const dmg = Math.floor((unit.phy * phyMul + unit.int * 0.5) * (0.9 + Math.random() * 0.2));
        if (unit.atkPattern === 'field') {
          this._aoeAttack(unit, dmg, unit.atkRange);
        } else {
          this._shootProjectile(unit, dx / dist, dy / dist, dmg, unit.atkRange * 3, unit.atkPattern);
        }
        audio.playSe('hit');
      }
      return;
    }

    unit.atkTimer = 0;
    const phyMul = unit.isPlayer ? 1 : this.allyPhyBuff;
    const dmg = Math.floor((unit.phy * phyMul + unit.int * 0.5) * (0.9 + Math.random() * 0.2));
    const target = this._findNearest(unit, this.enemies, contactRange + 20);
    if (target) {
      unit.facingX = target.x - unit.x;
      unit.facingY = target.y - unit.y;
      const fMag = Math.sqrt(unit.facingX ** 2 + unit.facingY ** 2);
      if (fMag > 0) { unit.facingX /= fMag; unit.facingY /= fMag; }
    }
    this._meleeHit(unit, target, dmg, unit.atkRange, unit.atkPattern || 'slash');
  }

  _meleeHit(attacker, target, dmg, range, pattern) {
    const arc = pattern === 'wave' ? PI2 : pattern === 'spear' ? 1.2 : pattern === 'rapid' ? 2.0 : 2.4;
    const reach = pattern === 'wave' ? range * 1.8 : pattern === 'spear' ? range * 1.4 : range * 1.2;
    const facing = Math.atan2(attacker.facingY, attacker.facingX);
    let hitCount = 0;
    const knockStr = pattern === 'wave' ? 120 : pattern === 'spear' ? 80 : 60;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - attacker.x, dy = e.y - attacker.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > reach + e.radius) continue;

      const angle = Math.atan2(dy, dx);
      let diff = angle - facing;
      while (diff > Math.PI) diff -= PI2;
      while (diff < -Math.PI) diff += PI2;
      if (Math.abs(diff) > arc / 2 && pattern !== 'wave') continue;

      const finalDmg = pattern === 'rapid' ? Math.floor(dmg * 0.6) : dmg;
      this._damageEnemy(e, finalDmg);
      if (d > 0) {
        e.knockX = (dx / d) * knockStr;
        e.knockY = (dy / d) * knockStr;
      }
      hitCount++;
    }

    if (hitCount >= 5) {
      this.screenShake = Math.min(0.3, hitCount * 0.03);
      this.hitStop = Math.min(0.04, hitCount * 0.005);
    }

    for (let s = 0; s < (pattern === 'rapid' ? 3 : pattern === 'wave' ? 2 : 1); s++) {
      const a = facing + (s - (pattern === 'rapid' ? 1 : 0.5)) * 0.3;
      this.particles.push({
        x: attacker.x + Math.cos(a) * reach * 0.4,
        y: attacker.y + Math.sin(a) * reach * 0.4,
        type: 'slash', timer: 0.25, radius: reach * 0.9,
        angle: a, arc,
        color: pattern === 'wave' ? '#ffd700' : pattern === 'spear' ? '#ff6644' : pattern === 'rapid' ? '#88ddff' : '#ffffff',
      });
    }

    if (hitCount > 0) {
      const seType = hitCount >= 5 ? 'critical' : 'hit';
      audio.playSe(seType);
    }
  }

  _shootProjectile(attacker, nx, ny, dmg, range, pattern) {
    const speed = 250 + attacker.int * 1.5;
    const color = pattern === 'bolt' ? '#56ccf2' : pattern === 'orb' ? '#bb86fc' : '#ffd700';
    this.projectiles.push({
      x: attacker.x, y: attacker.y, vx: nx * speed, vy: ny * speed,
      dmg, radius: pattern === 'bolt' ? 6 : 4,
      lifetime: range / speed, timer: 0, color,
      pierce: pattern === 'bolt' ? 2 : 0,
      fromAlly: true,
    });
  }

  _aoeAttack(attacker, dmg, range) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.sqrt((e.x - attacker.x) ** 2 + (e.y - attacker.y) ** 2);
      if (d <= range + e.radius) this._damageEnemy(e, Math.floor(dmg * 0.7));
    }
    this.particles.push({ x: attacker.x, y: attacker.y, type: 'aoe', timer: 0.3, radius: range, color: 'rgba(86,204,242,0.3)' });
  }

  _healAlly(healer, dt) {
    healer.atkTimer += dt;
    if (healer.atkTimer < 1.0 / healer.atkSpeed) return;
    healer.atkTimer -= 1.0 / healer.atkSpeed;

    const threshold = this.tactic.healThreshold;
    const targets = [this.player, ...this.allies].filter(a => a.alive && a.hp / a.maxHp < threshold);
    if (targets.length === 0) {
      const wounded = [this.player, ...this.allies].filter(a => a.alive && a.hp < a.maxHp);
      if (wounded.length === 0) return;
      targets.push(wounded.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]);
    }
    const target = targets[0];
    const healAmt = Math.floor(healer.int * 1.2);
    target.hp = Math.min(target.maxHp, target.hp + healAmt);
    this.particles.push({ x: target.x, y: target.y - 10, type: 'heal', timer: 0.5, text: `+${healAmt}` });
    audio.playSe('heal');
  }

  _damageEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    enemy.flash = 1;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.kills++;
      this.combo++;
      this.comboTimer = 2.0;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this._dropXp(enemy.x, enemy.y, enemy.xpValue);
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: enemy.x, y: enemy.y, type: 'burst',
          timer: 0.3 + Math.random() * 0.2,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          color: enemy.isBoss ? '#ffd700' : '#ff8844',
        });
      }
    }
  }

  _dropXp(x, y, amount) {
    const count = Math.min(amount, 5);
    const perOrb = amount / count;
    for (let i = 0; i < count; i++) {
      this.pickups.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        type: 'xp', value: perOrb, radius: 4,
        vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
        timer: 0, magnetized: false,
      });
    }
  }

  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); continue; }

      if (e.knockX || e.knockY) {
        e.x += (e.knockX || 0) * dt * 3;
        e.y += (e.knockY || 0) * dt * 3;
        e.knockX *= 0.85; e.knockY *= 0.85;
        if (Math.abs(e.knockX) < 1 && Math.abs(e.knockY) < 1) { e.knockX = 0; e.knockY = 0; }
      }

      const dx = this.player.x - e.x, dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5 && !e.knockX) {
        const nx = dx / dist, ny = dy / dist;
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      }
      e.x = this._clampToLane(e.x);
      e.y = Math.max(0, Math.min(this.fieldSize, e.y));
      e.flash = Math.max(0, e.flash - dt * 8);
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.timer += dt;
      if (p.timer >= p.lifetime) { this.projectiles.splice(i, 1); continue; }

      if (p.fromAlly) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (p.radius + e.radius) ** 2) {
            this._damageEnemy(e, p.dmg);
            if (p.pierce > 0) { p.pierce--; } else { this.projectiles.splice(i, 1); break; }
          }
        }
      }
    }
  }

  _updatePickups(dt) {
    const magnetDist = PICKUP_MAGNET_DIST + this.pickupRangeBonus;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.timer += dt;
      if (pk.timer < 0.3) {
        pk.x += pk.vx * dt * (1 - pk.timer / 0.3);
        pk.y += pk.vy * dt * (1 - pk.timer / 0.3);
        continue;
      }
      const dx = this.player.x - pk.x, dy = this.player.y - pk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < magnetDist) {
        const speed = PICKUP_MAGNET_SPEED * (1 - dist / magnetDist + 0.3);
        pk.x += (dx / dist) * speed * dt;
        pk.y += (dy / dist) * speed * dt;
      }
      if (dist < this.player.radius + pk.radius + 5) {
        if (pk.type === 'xp') this._collectXp(pk.value);
        this.pickups.splice(i, 1);
        audio.playSe('select');
      }
    }
  }

  _collectXp(amount) {
    this.xp += amount;
    const needed = this.xpTable[this.level] || (this.level * 100);
    if (this.xp >= needed && this.onLevelUp) {
      this.xp -= needed;
      this.level++;
      this.pause();
      this.onLevelUp(this.level);
    }
  }

  applyLevelUp(choice) {
    const allUnits = [this.player, ...this.allies];
    if (choice.stat === 'allyPhyBuff') {
      this.allyPhyBuff += choice.mul;
    } else if (choice.stat === 'pickupRange') {
      this.pickupRangeBonus += PICKUP_MAGNET_DIST * choice.mul;
    } else {
      for (const u of allUnits) {
        if (u[choice.stat] !== undefined) {
          u[choice.stat] = Math.floor(u[choice.stat] * (1 + choice.mul));
        }
      }
      if (choice.stat === 'maxHp') {
        for (const u of allUnits) u.hp = Math.min(u.hp + 20, u.maxHp);
      }
    }
    this.resume();
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].timer -= dt;
      if (this.particles[i].timer <= 0) this.particles.splice(i, 1);
    }
  }

  _checkCollisions() {
    const targets = [this.player, ...this.allies].filter(a => a.alive);
    for (const t of targets) {
      if (!t._iframes) t._iframes = 0;
      if (t._iframes > 0) { t._iframes -= 1; continue; }

      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d2 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
        const r = e.radius + t.radius;
        if (d2 < r * r) {
          const dmg = Math.max(1, Math.floor(e.phy * 0.4));
          t.hp -= dmg;
          t.flash = 1;
          t._iframes = 20;
          const dist = Math.sqrt(d2) || 1;
          t.x += (t.x - e.x) / dist * 6;
          t.y += (t.y - e.y) / dist * 6;
          e.x -= (t.x - e.x) / dist * 2;
          e.y -= (t.y - e.y) / dist * 2;
          if (t.hp <= 0) { t.alive = false; t.hp = 0; }
          break;
        }
      }
    }
  }

  _findNearest(unit, targets, maxDist) {
    let nearest = null, minD = maxDist * maxDist;
    for (const t of targets) {
      if (!t.alive) continue;
      const d2 = (t.x - unit.x) ** 2 + (t.y - unit.y) ** 2;
      if (d2 < minD) { minD = d2; nearest = t; }
    }
    return nearest;
  }

  _render() {
    const { ctx, cam, vw, vh } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, vw, vh);

    this._drawField(ctx, cam);
    this._drawPickups(ctx, cam);
    this._drawEnemies(ctx, cam);
    this._drawProjectiles(ctx, cam);
    this._drawAllies(ctx, cam);
    this._drawPlayer(ctx, cam);
    this._drawParticles(ctx, cam);
    this._drawCombo(ctx);
  }

  _drawField(ctx, cam) {
    const tileSize = 64;
    const startX = Math.floor(cam.x / tileSize) * tileSize;
    const startY = Math.floor(cam.y / tileSize) * tileSize;

    ctx.fillStyle = '#2a4a1a';
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.strokeStyle = 'rgba(60,90,40,0.3)';
    ctx.lineWidth = 1;
    for (let x = startX; x < cam.x + this.vw + tileSize; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x - cam.x, 0); ctx.lineTo(x - cam.x, this.vh); ctx.stroke();
    }
    for (let y = startY; y < cam.y + this.vh + tileSize; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y - cam.y); ctx.lineTo(this.vw, y - cam.y); ctx.stroke();
    }

    if (this.laneWidth) {
      const center = this.fieldSize / 2;
      const half = this.laneWidth / 2;
      const leftWall = center - half - cam.x;
      const rightWall = center + half - cam.x;
      ctx.fillStyle = '#1a2a0a';
      ctx.fillRect(0, 0, Math.max(0, leftWall), this.vh);
      ctx.fillRect(rightWall, 0, this.vw - rightWall, this.vh);
      ctx.strokeStyle = 'rgba(120,100,60,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(leftWall, 0); ctx.lineTo(leftWall, this.vh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rightWall, 0); ctx.lineTo(rightWall, this.vh); ctx.stroke();
    }
  }

  _drawSprite(ctx, cam, entity, size) {
    const sx = entity.x - cam.x - size / 2;
    const sy = entity.y - cam.y - size / 2;
    if (sx < -size || sx > this.vw + size || sy < -size || sy > this.vh + size) return;

    const sprite = this.sprites[entity.spriteKey];

    if (entity.flash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 + entity.flash * 0.5;
      ctx.filter = `brightness(${1 + entity.flash * 2})`;
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, sx, sy, size, size);
    } else {
      ctx.fillStyle = entity.isAlly !== undefined ? '#c4a35a' : '#e76060';
      ctx.beginPath(); ctx.arc(entity.x - cam.x, entity.y - cam.y, size / 3, 0, PI2); ctx.fill();
    }

    if (entity.flash > 0) ctx.restore();
  }

  _drawPlayer(ctx, cam) {
    if (!this.player.alive) return;
    const sz = 48;
    this._drawSprite(ctx, cam, this.player, sz);
    this._drawHpBar(ctx, cam, this.player, sz);
  }

  _drawAllies(ctx, cam) {
    for (const a of this.allies) {
      if (!a.alive) continue;
      this._drawSprite(ctx, cam, a, 40);
      this._drawHpBar(ctx, cam, a, 40);
    }
  }

  _drawEnemies(ctx, cam) {
    for (const e of this.enemies) {
      const sz = 32 * (e.scale || 1);
      this._drawSprite(ctx, cam, e, sz);
      if (e.isBoss) this._drawHpBar(ctx, cam, e, sz);
    }
  }

  _drawHpBar(ctx, cam, entity, spriteSize) {
    const barW = spriteSize * 0.8;
    const barH = 3;
    const bx = entity.x - cam.x - barW / 2;
    const by = entity.y - cam.y - spriteSize / 2 - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    const ratio = Math.max(0, entity.hp / entity.maxHp);
    ctx.fillStyle = ratio > 0.3 ? '#44c070' : '#e05050';
    ctx.fillRect(bx, by, barW * ratio, barH);
  }

  _drawProjectiles(ctx, cam) {
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, p.radius, 0, PI2);
      ctx.fill();
    }
  }

  _drawPickups(ctx, cam) {
    for (const pk of this.pickups) {
      const sx = pk.x - cam.x, sy = pk.y - cam.y;
      if (sx < -20 || sx > this.vw + 20 || sy < -20 || sy > this.vh + 20) continue;
      ctx.fillStyle = pk.type === 'xp' ? '#bb86fc' : '#ffd700';
      ctx.beginPath(); ctx.arc(sx, sy, pk.radius, 0, PI2); ctx.fill();
      ctx.fillStyle = 'rgba(187,134,252,0.3)';
      ctx.beginPath(); ctx.arc(sx, sy, pk.radius * 1.8, 0, PI2); ctx.fill();
    }
  }

  _drawParticles(ctx, cam) {
    for (const p of this.particles) {
      const sx = p.x - cam.x, sy = p.y - cam.y;
      const maxT = p.type === 'burst' ? 0.4 : 0.5;
      const alpha = Math.max(0, Math.min(1, p.timer / maxT));

      if (p.type === 'slash') {
        const halfArc = (p.arc || 2.4) / 2;
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, p.radius, p.angle - halfArc, p.angle + halfArc);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius * 0.95, p.angle - halfArc * 0.8, p.angle + halfArc * 0.8);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'burst') {
        const bx = sx + (p.vx || 0) * (maxT - p.timer);
        const by = sy + (p.vy || 0) * (maxT - p.timer);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(bx, by, 3 * alpha, 0, PI2); ctx.fill();
        ctx.restore();
      } else if (p.type === 'aoe') {
        ctx.save();
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(sx, sy, p.radius, 0, PI2); ctx.fill();
        ctx.restore();
      } else if (p.type === 'heal') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#50d080';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, sx, sy - (1 - alpha) * 18);
        ctx.restore();
      }
    }
  }

  _drawCombo(ctx) {
    if (this.combo < 2) return;
    const size = Math.min(40, 18 + this.combo * 0.5);
    const alpha = Math.min(1, this.comboTimer);
    const scale = this.combo > this.maxCombo - 1 ? 1.15 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${size * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = this.combo >= 50 ? '#ffd700' : this.combo >= 20 ? '#ff8844' : '#ffffff';
    ctx.shadowColor = this.combo >= 50 ? 'rgba(255,215,0,0.6)' : 'rgba(255,100,50,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillText(`${this.combo} COMBO`, this.vw / 2, this.vh * 0.18);
    ctx.shadowBlur = 0;
    if (this.combo >= 100) {
      ctx.font = '700 14px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('UNSTOPPABLE!', this.vw / 2, this.vh * 0.18 + size * 0.8);
    } else if (this.combo >= 50) {
      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = '#ff8844';
      ctx.fillText('INCREDIBLE!', this.vw / 2, this.vh * 0.18 + size * 0.8);
    } else if (this.combo >= 20) {
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = '#ffaa66';
      ctx.fillText('GREAT!', this.vw / 2, this.vh * 0.18 + size * 0.8);
    }
    ctx.restore();
  }

  _updateHud() {
    if (!this.hud) return;
    const p = this.player;
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    const xpNeeded = this.xpTable[this.level] || (this.level * 100);
    const xpRatio = Math.min(1, this.xp / xpNeeded);
    const remaining = Math.max(0, this.stageDuration - this.stageTime);
    const min = Math.floor(remaining / 60);
    const sec = Math.floor(remaining % 60);

    this.hud.hp.style.width = `${hpRatio * 100}%`;
    this.hud.hp.style.background = hpRatio > 0.3 ? 'var(--hp-bar)' : 'var(--hp-bar-low)';
    this.hud.hpText.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
    this.hud.xpBar.style.width = `${xpRatio * 100}%`;
    this.hud.level.textContent = `Lv.${this.level}`;
    this.hud.timer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    this.hud.kills.textContent = `${this.kills} KILLS`;
    const remain = Math.max(0, this.totalEnemies - this.kills);
    this.hud.remaining.textContent = `残 ${remain}`;
    this.hud.allies.textContent = `×${this.allies.filter(a => a.alive).length + 1}`;
  }

  getResults() {
    return { kills: this.kills, level: this.level, time: this.stageTime, maxCombo: this.maxCombo };
  }

  equipWeapon(atkType, atkPattern, phyBonus = 0) {
    this.player.atkType = atkType;
    this.player.atkPattern = atkPattern;
    this.player.phy += phyBonus;
  }

  setTactic(tactic) { this.tactic = tactic; }
}
