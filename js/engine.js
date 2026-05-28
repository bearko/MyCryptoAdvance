/* ============================================================
   engine.js — real-time game loop, camera, rendering, combat
   Vampire Survivors-style action engine
   ============================================================ */

import { ASSETS, ENEMY_TYPES, STAGE_WAVES, TACTIC, LEVELUP_CHOICES, HEROES, MCS, EXTENSIONS, xpToNextLevel } from './constants.js';
import { partyState } from './state.js';
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

    this.kills = 0;
    this.totalEnemies = 0;
    this.spawnedCount = 0;
    this.tactic = TACTIC.BALANCED;
    this.allyPhyBuff = 1.0;

    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.hitStop = 0;
    this.screenShake = 0;
    this.screenShakeX = 0;
    this.screenShakeY = 0;

    this.input = { dx: 0, dy: 0 };
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

  initStage(stageKey, partyHeroes, heroDefMap) {
    const stage = STAGE_WAVES[stageKey];
    this.stage = stage;
    this.heroDefMap = heroDefMap || {};
    this.fieldSize = stage.fieldSize || 2000;
    this.laneWidth = 0;
    this.exit = stage.exit || null;
    this.stageTime = 0;
    this.ambientTimer = 0;
    this.kills = 0;
    this.totalEnemies = 0;
    this.spawnedCount = 0;
    this.allyPhyBuff = 1.0;
    this.reachedExit = false;

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.allies = [];
    this.fieldHeroes = [];
    this.pendingEncounter = null;

    const start = stage.playerStart || { x: this.fieldSize / 2, y: this.fieldSize / 2 };
    const playerDef = partyHeroes[0];
    this.player = this._createUnit(playerDef, start.x, start.y, true);
    this.player.isPlayer = true;

    // フィールド上の戦闘中ヒーローを配置
    if (stage.fieldHeroes && this.heroDefMap) {
      for (const spot of stage.fieldHeroes) {
        const def = this.heroDefMap[spot.heroKey];
        if (!def) continue;
        const unit = this._createUnit(def, spot.x, spot.y, true);
        unit.isFieldHero = true;
        unit.heroKey = spot.heroKey;
        this.fieldHeroes.push({
          heroKey: spot.heroKey,
          x: spot.x, y: spot.y,
          encounterRange: spot.encounterRange || 120,
          unit, recruited: false,
        });
      }
    }

  }

  _createUnit(def, x, y, isAlly) {
    // MCS式: 全ヒーロー共通の基礎値 + MCH原データから導出
    const mch = def.mchStats || { hp: 100, phy: 30, int: 30, agi: 50 };
    // 永続レベルボーナス: レベル1あたり+8%
    const persistentLv = partyState.getHeroLevel(def.id);
    const lvMul = 1 + (persistentLv - 1) * 0.08;
    const maxHp = Math.floor((MCS.HERO_HP_BASE + mch.hp * MCS.HERO_HP_PER_STAT) * lvMul);
    const speed = Math.floor(MCS.HERO_SPEED_BASE + mch.agi * MCS.HERO_SPEED_PER_AGI);
    return {
      id: def.id, name: def.name, imageId: def.imageId,
      x, y, radius: MCS.PLAYER_RADIUS,
      hp: maxHp, maxHp,
      phy: Math.floor(mch.phy * lvMul), int: Math.floor(mch.int * lvMul), agi: mch.agi,
      moveSpeed: speed,
      level: persistentLv,
      atkSpeed: def.atkSpeed || 1.0,
      atkRange: def.atkRange || 60,
      atkType: def.atkType, atkPattern: def.atkPattern,
      atkTimer: 0, alive: true, isAlly: true,
      facingX: 0, facingY: 1, flash: 0,
      iframes: 0,
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

    this._updateFieldSpawn(dt);
    this._updatePlayer(dt);
    this._updateAllies(dt);
    this._updateFieldHeroes(dt);
    this._checkEncounters();
    this._checkExit();
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
    if (this.reachedExit && this.onVictory) {
      this.stop();
      this.onVictory({ kills: this.kills, time: this.stageTime, maxCombo: this.maxCombo });
    }
  }

  _checkExit() {
    if (!this.exit || this.reachedExit) return;
    const dx = this.player.x - this.exit.x;
    const dy = this.player.y - this.exit.y;
    if (dx * dx + dy * dy < this.exit.radius * this.exit.radius) {
      this.reachedExit = true;
    }
  }

  _updateFieldSpawn(dt) {
    if (!this.stage) return;

    // 各フィールドヒーロー周辺に敵を湧かせる（未邂逅のヒーローのみ）
    const heroEnemies = this.stage.heroBattleEnemies;
    if (heroEnemies && heroEnemies.length) {
      for (const fh of this.fieldHeroes) {
        if (fh.recruited) continue;
        fh._spawnTimer = (fh._spawnTimer || 0) - dt;
        // ヒーロー周辺の敵数を数える
        let nearby = 0;
        for (const e of this.enemies) {
          const d2 = (e.x - fh.x) ** 2 + (e.y - fh.y) ** 2;
          if (d2 < 250 * 250) nearby++;
        }
        if (fh._spawnTimer <= 0 && nearby < 6) {
          const type = heroEnemies[Math.floor(Math.random() * heroEnemies.length)];
          this._spawnEnemyAt(type, fh.x, fh.y, 220 + Math.random() * 60);
          fh._spawnTimer = 0.8 + Math.random() * 0.6;
        }
      }
    }

    // プレイヤー周辺のランダムスポーン
    const amb = this.stage.ambientSpawn;
    if (amb) {
      this.ambientTimer -= dt;
      const nearbyToPlayer = this.enemies.filter(e =>
        (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2 < 600 * 600
      ).length;
      if (this.ambientTimer <= 0 && nearbyToPlayer < (amb.maxAround || 60)) {
        const type = amb.enemies[Math.floor(Math.random() * amb.enemies.length)];
        this._spawnEnemyAt(type, this.player.x, this.player.y, 380 + Math.random() * 120);
        this.ambientTimer = amb.interval;
      }
    }

    // 出口関門: 出口周辺に強敵を密集させる（プレイヤーがある程度近づいたら活性化）
    const eg = this.stage.exitGuard;
    if (eg && this.exit) {
      const distToExit = Math.sqrt(
        (this.player.x - this.exit.x) ** 2 + (this.player.y - this.exit.y) ** 2
      );
      // プレイヤーが出口から1200px以内に来たら関門活性化（事前にも少し配備）
      const active = distToExit < 1200;
      this._exitGuardTimer = (this._exitGuardTimer || 0) - dt;
      this._exitEliteTimer = (this._exitEliteTimer || 0) - dt;

      // 出口周辺の敵数をカウント
      let nearExit = 0;
      for (const e of this.enemies) {
        const dx = e.x - this.exit.x, dy = e.y - this.exit.y;
        if (dx * dx + dy * dy < eg.guardRadius * eg.guardRadius) nearExit++;
      }
      const targetMax = active ? eg.maxGuards : Math.floor(eg.maxGuards * 0.4);
      const interval = active ? eg.spawnInterval : eg.spawnInterval * 3;

      if (this._exitGuardTimer <= 0 && nearExit < targetMax) {
        const type = eg.enemies[Math.floor(Math.random() * eg.enemies.length)];
        // 出口の南側（プレイヤー進行方向の手前）を中心に配置
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
        const dist = eg.guardRadius * (0.3 + Math.random() * 0.7);
        const x = this.exit.x + Math.cos(angle) * dist;
        const y = this.exit.y - Math.sin(angle) * dist;
        this._spawnEnemyAt(type, x, y, 0);
        this._exitGuardTimer = interval;
      }

      // エリート: ボス級が少数常駐
      if (active && eg.eliteEnemies && this._exitEliteTimer <= 0) {
        const eliteCount = this.enemies.filter(e => {
          const dx = e.x - this.exit.x, dy = e.y - this.exit.y;
          return dx * dx + dy * dy < eg.guardRadius * eg.guardRadius
            && eg.eliteEnemies.some(ek => ENEMY_TYPES[ek] && ENEMY_TYPES[ek].imageId === e.imageId);
        }).length;
        if (eliteCount < (eg.eliteCount || 2)) {
          const type = eg.eliteEnemies[Math.floor(Math.random() * eg.eliteEnemies.length)];
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          const dist = eg.guardRadius * 0.5;
          const x = this.exit.x + Math.cos(angle) * dist;
          const y = this.exit.y - Math.sin(angle) * dist;
          this._spawnEnemyAt(type, x, y, 0);
        }
        this._exitEliteTimer = eg.eliteSpawnInterval || 1.5;
      }
    }

  }

  _spawnEnemyAt(typeKey, cx, cy, dist) {
    if (this.enemies.length >= MCS.MAX_ENEMIES) return;
    const def = ENEMY_TYPES[typeKey];
    if (!def) return;
    const angle = Math.random() * PI2;
    const x = Math.max(20, Math.min(this.fieldSize - 20, cx + Math.cos(angle) * dist));
    const y = Math.max(20, Math.min(this.fieldSize - 20, cy + Math.sin(angle) * dist));
    const e = {
      id: `e_${Date.now()}_${Math.random()}`,
      name: def.name, imageId: def.imageId,
      x, y, radius: def.radius,
      hp: def.hp, maxHp: def.hp,
      phy: def.phy, speed: def.speed,
      xpValue: def.xp, alive: true, flash: 0,
      spriteKey: `enemy_${def.imageId}`, scale: 1,
    };
    this.enemies.push(e);
    this.spawnedCount++;
    this.totalEnemies++;
  }

  _updateFieldHeroes(dt) {
    for (const fh of this.fieldHeroes) {
      if (fh.recruited) continue;
      const u = fh.unit;
      if (!u.alive) continue;
      // ヒーローは自分の拠点近くに留まる
      const dx = fh.x - u.x, dy = fh.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 30) {
        u.x += (dx / dist) * u.agi * 0.5 * dt;
        u.y += (dy / dist) * u.agi * 0.5 * dt;
      }
      // 敵に向かう
      const target = this._findNearest(u, this.enemies, u.atkRange * 2.5);
      if (target) {
        u.facingX = target.x - u.x; u.facingY = target.y - u.y;
        const m = Math.sqrt(u.facingX ** 2 + u.facingY ** 2);
        if (m > 0) { u.facingX /= m; u.facingY /= m; }
      }
      this._contactAttack(u, dt);
      u.flash = Math.max(0, u.flash - dt * 5);
    }
  }

  _checkEncounters() {
    if (this.pendingEncounter) return;
    for (const fh of this.fieldHeroes) {
      if (fh.recruited) continue;
      const dx = this.player.x - fh.x, dy = this.player.y - fh.y;
      if (dx * dx + dy * dy < fh.encounterRange ** 2) {
        this.pendingEncounter = fh;
        if (this.onEncounter) this.onEncounter(fh);
        return;
      }
    }
  }

  completeEncounter(fh) {
    fh.recruited = true;
    const def = this.heroDefMap[fh.heroKey];
    if (def) {
      // 永続パーティーに追加（初回邂逅時のみLv1で追加される）
      partyState.addHero(fh.heroKey);
      const ally = this._createUnit(def, this.player.x + (Math.random() - 0.5) * 60, this.player.y + (Math.random() - 0.5) * 60, true);
      // MCS式: 各ヒーローの初期エクステンションを装備
      if (def.startingExtension) this.equipExtension(ally, def.startingExtension);
      this.allies.push(ally);
    }
    this.pendingEncounter = null;
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
    const speed = p.moveSpeed || 180;
    // MCS方式: input は単位ベクトル (-1〜1)、正規化済み
    const ix = this.input.dx, iy = this.input.dy;
    const mag = Math.sqrt(ix * ix + iy * iy);
    if (mag > 0.01) {
      const nx = mag > 1 ? ix / mag : ix;
      const ny = mag > 1 ? iy / mag : iy;
      p.x = Math.max(p.radius, Math.min(this.fieldSize - p.radius, p.x + nx * speed * dt));
      p.y = Math.max(p.radius, Math.min(this.fieldSize - p.radius, p.y + ny * speed * dt));
      p.facingX = nx / (mag || 1); p.facingY = iy / (mag || 1);
    }
    if (p.iframes > 0) p.iframes -= dt * 1000;
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
          const speed = (a.moveSpeed || 140) * 0.9;
          a.x += (tdx / tDist) * speed * dt;
          a.y += (tdy / tDist) * speed * dt;
          a.x = Math.max(a.radius, Math.min(this.fieldSize - a.radius, a.x));
          a.y = Math.max(a.radius, Math.min(this.fieldSize - a.radius, a.y));
        }
      }

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
      const burstCount = this.particles.length < 200 ? (enemy.isBoss ? 6 : 2) : 0;
      for (let i = 0; i < burstCount; i++) {
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
    // ピックアップは現在使用していない（XPはステージ終了時にまとめて配布）
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].timer -= dt;
      if (this.particles[i].timer <= 0) this.particles.splice(i, 1);
    }
  }

  _checkCollisions() {
    // MCS式: 接触ダメージ = ENEMY_DMG（敵タイプphyで補正）+ CONTACT_COOLDOWN_MS の無敵
    const targets = [this.player, ...this.allies].filter(a => a.alive);
    for (const t of targets) {
      if (!t.iframes) t.iframes = 0;
      if (t.iframes > 0) continue;

      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d2 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
        const r = e.radius + t.radius;
        if (d2 < r * r) {
          // MCS基準 ENEMY_DMG=10、敵のphyで微増
          const dmg = Math.max(1, Math.floor(MCS.ENEMY_DMG * (0.5 + e.phy / 20)));
          t.hp -= dmg;
          t.flash = 1;
          t.iframes = MCS.CONTACT_COOLDOWN_MS;
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
    // iframes はミリ秒単位、毎フレームdt(秒)で減少させる必要があるので別途処理が必要
    // ここでは秒換算で減らす（updatePlayer内で別途）。簡易化のため _checkCollisions末尾で減らす
    for (const t of targets) {
      if (t.iframes > 0) t.iframes -= 16; // 約60fps想定
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
    this._drawExit(ctx, cam);
    this._drawPickups(ctx, cam);
    this._drawEnemies(ctx, cam);
    this._drawFieldHeroes(ctx, cam);
    this._drawProjectiles(ctx, cam);
    this._drawAllies(ctx, cam);
    this._drawPlayer(ctx, cam);
    this._drawParticles(ctx, cam);
    this._drawCombo(ctx);
    this._drawMinimap(ctx);
  }

  _drawExit(ctx, cam) {
    if (!this.exit) return;
    const sx = this.exit.x - cam.x, sy = this.exit.y - cam.y;
    if (sx < -200 || sx > this.vw + 200 || sy < -200 || sy > this.vh + 200) return;
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.15;
    ctx.save();
    // 光る出口エリア
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.exit.radius * pulse);
    grad.addColorStop(0, 'rgba(255,215,100,0.45)');
    grad.addColorStop(0.6, 'rgba(255,215,100,0.18)');
    grad.addColorStop(1, 'rgba(255,215,100,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, this.exit.radius * pulse, 0, PI2); ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(sx, sy, this.exit.radius, 0, PI2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('▲ 戦場の出口', sx, sy - this.exit.radius - 8);
    ctx.restore();
  }

  _drawFieldHeroes(ctx, cam) {
    for (const fh of this.fieldHeroes) {
      if (fh.recruited || !fh.unit.alive) continue;
      const sz = 44;
      this._drawSprite(ctx, cam, fh.unit, sz);
      this._drawHpBar(ctx, cam, fh.unit, sz);
      const sx = fh.x - cam.x, sy = fh.y - cam.y - sz / 2 - 14;
      if (sx > -100 && sx < this.vw + 100 && sy > -20 && sy < this.vh + 20) {
        ctx.save();
        ctx.fillStyle = '#56ccf2';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(`▽ ${fh.unit.name}`, sx, sy);
        ctx.restore();
      }
    }
  }

  _drawMinimap(ctx) {
    const isMobile = this.vw < 600;
    const mapSize = isMobile ? 120 : 160;
    const margin = 12;
    const mx = this.vw - mapSize - margin;
    const my = this.vh - mapSize - margin;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mx - 4, my - 4, mapSize + 8, mapSize + 8);
    ctx.fillStyle = 'rgba(20,30,15,0.8)';
    ctx.fillRect(mx, my, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(196,163,90,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx, my, mapSize, mapSize);

    const fs = this.fieldSize;
    const toMapX = wx => mx + (wx / fs) * mapSize;
    const toMapY = wy => my + (wy / fs) * mapSize;

    // ビューポート枠
    const vx1 = toMapX(this.cam.x);
    const vy1 = toMapY(this.cam.y);
    const vw1 = (this.vw / fs) * mapSize;
    const vh1 = (this.vh / fs) * mapSize;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx1, vy1, vw1, vh1);

    // 敵（小さな赤点、間引き）
    ctx.fillStyle = 'rgba(231,96,96,0.7)';
    for (let i = 0; i < this.enemies.length; i += 2) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      ctx.fillRect(toMapX(e.x) - 1, toMapY(e.y) - 1, 2, 2);
    }

    // 未邂逅ヒーロー（青）
    for (const fh of this.fieldHeroes) {
      if (fh.recruited || !fh.unit.alive) continue;
      const hx = toMapX(fh.x), hy = toMapY(fh.y);
      const pulse = 1 + Math.sin(performance.now() / 200) * 0.3;
      ctx.fillStyle = '#56ccf2';
      ctx.beginPath(); ctx.arc(hx, hy, 4 * pulse, 0, PI2); ctx.fill();
      ctx.strokeStyle = '#88ddff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, hy, 6 * pulse, 0, PI2); ctx.stroke();
    }

    // 仲間（緑）
    ctx.fillStyle = '#5ecf8a';
    for (const a of this.allies) {
      if (!a.alive) continue;
      ctx.beginPath(); ctx.arc(toMapX(a.x), toMapY(a.y), 2.5, 0, PI2); ctx.fill();
    }

    // 出口関門エリア（赤い警告円）
    if (this.exit && this.stage && this.stage.exitGuard) {
      const ex = toMapX(this.exit.x), ey = toMapY(this.exit.y);
      const gr = (this.stage.exitGuard.guardRadius / fs) * mapSize;
      ctx.save();
      ctx.fillStyle = 'rgba(255,60,60,0.18)';
      ctx.beginPath(); ctx.arc(ex, ey, gr, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(ex, ey, gr, 0, PI2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 出口（金の星）
    if (this.exit) {
      const ex = toMapX(this.exit.x), ey = toMapY(this.exit.y);
      const epulse = 1 + Math.sin(performance.now() / 200) * 0.3;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (PI2 / 5);
        const r = i % 2 === 0 ? 6 * epulse : 3 * epulse;
        const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }

    // プレイヤー（金色、点滅）
    const pulse = 1 + Math.sin(performance.now() / 180) * 0.25;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(toMapX(this.player.x), toMapY(this.player.y), 4 * pulse, 0, PI2); ctx.fill();

    // ラベル
    ctx.fillStyle = 'rgba(196,163,90,0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MAP', mx + 3, my + 11);

    ctx.restore();
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

    // フィールド境界
    ctx.strokeStyle = 'rgba(120,100,60,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-cam.x, -cam.y, this.fieldSize, this.fieldSize);
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
    const many = this.enemies.length > 100;
    for (const e of this.enemies) {
      const sz = 32 * (e.scale || 1);
      const sx = e.x - cam.x, sy = e.y - cam.y;
      if (sx < -sz || sx > this.vw + sz || sy < -sz || sy > this.vh + sz) continue;

      if (many && !e.isBoss) {
        const sprite = this.sprites[e.spriteKey];
        if (e.flash > 0) {
          ctx.save(); ctx.globalAlpha = 0.6; ctx.filter = `brightness(${1 + e.flash * 3})`;
        }
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(sprite, sx - sz / 2, sy - sz / 2, sz, sz);
        } else {
          ctx.fillStyle = '#e76060';
          ctx.fillRect(sx - sz / 3, sy - sz / 3, sz * 0.66, sz * 0.66);
        }
        if (e.flash > 0) ctx.restore();
      } else {
        this._drawSprite(ctx, cam, e, sz);
        if (e.isBoss) this._drawHpBar(ctx, cam, e, sz);
      }
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

    this.hud.hp.style.width = `${hpRatio * 100}%`;
    this.hud.hp.style.background = hpRatio > 0.3 ? 'var(--hp-bar)' : 'var(--hp-bar-low)';
    this.hud.hpText.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
    if (this.hud.level) this.hud.level.textContent = `Lv.${p.level || 1}`;
    const elapsedMin = Math.floor(this.stageTime / 60);
    const elapsedSec = Math.floor(this.stageTime % 60);
    this.hud.timer.textContent = `${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}`;
    this.hud.kills.textContent = `${this.kills} KILLS`;
    const totalSpots = (this.stage && this.stage.fieldHeroes) ? this.stage.fieldHeroes.length : 0;
    const recruited = this.fieldHeroes.filter(f => f.recruited).length;
    this.hud.remaining.textContent = `仲間 ${recruited}/${totalSpots}`;
    this.hud.allies.textContent = `×${this.allies.filter(a => a.alive).length + 1}`;
  }

  getResults() {
    return { kills: this.kills, time: this.stageTime, maxCombo: this.maxCombo };
  }

  equipWeapon(atkType, atkPattern, phyBonus = 0) {
    this.player.atkType = atkType;
    this.player.atkPattern = atkPattern;
    this.player.phy += phyBonus;
  }

  // MCS式: エクステンションを装備して武器化
  equipExtension(unit, extKey) {
    const ext = EXTENSIONS[extKey];
    if (!ext) return;
    if (ext.archetype === 'melee') {
      unit.atkType = 'melee';
      unit.atkPattern = unit.atkPattern === 'none' ? 'slash' : unit.atkPattern;
    } else if (ext.archetype === 'ranged') {
      unit.atkType = 'ranged';
      unit.atkPattern = unit.atkPattern === 'none' ? 'arrow' : unit.atkPattern;
    } else if (ext.archetype === 'magic') {
      unit.atkType = 'magic';
      unit.atkPattern = unit.atkPattern === 'none' ? 'bolt' : unit.atkPattern;
    }
    if (ext.phyBonus) unit.phy += ext.phyBonus;
    if (ext.intBonus) unit.int += ext.intBonus;
    if (ext.agiBonus) { unit.agi += ext.agiBonus; unit.moveSpeed += ext.agiBonus * MCS.HERO_SPEED_PER_AGI; }
    if (ext.hpBonus) { unit.maxHp += ext.hpBonus; unit.hp = Math.min(unit.hp + ext.hpBonus, unit.maxHp); }
    if (ext.range) unit.atkRange = Math.max(unit.atkRange, ext.range);
    unit.equippedExt = ext;
  }

  setTactic(tactic) { this.tactic = tactic; }
}
