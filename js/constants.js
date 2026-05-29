/* ============================================================
   constants.js — world data, factions, heroes, enemies, stages
   ============================================================ */

const ASSET_BASE = 'https://raw.githubusercontent.com/bearko/mycryptoheroes/main';

export const ASSETS = {
  hero:       id => `${ASSET_BASE}/Image/Heroes/${id}.png`,
  enemy:      id => `${ASSET_BASE}/Image/Enemies/${id}.png`,
  background: id => `${ASSET_BASE}/Image/Backgrounds/${id}.png`,
  extension:  id => `${ASSET_BASE}/Image/Extensions/${id}.png`,
  bgm:      name => `${ASSET_BASE}/Audio/BGM/${name}`,
};

export const FACTION = { HERO: 'hero', NEUTRAL: 'neutral', INVADER: 'invader', CITIZEN: 'citizen' };

// MyCryptoSurvivor準拠の基本定数
export const MCS = {
  PLAYER_RADIUS: 14,
  HERO_HP_BASE: 80,
  HERO_HP_PER_STAT: 0.20,
  HERO_SPEED_BASE: 140,
  HERO_SPEED_PER_AGI: 0.6,
  ENEMY_HP_INITIAL: 30,
  ENEMY_DMG: 10,
  ENEMY_RADIUS: 12,
  ENEMY_SPEED_PX_S: 80,
  CONTACT_COOLDOWN_MS: 500,
  XP_TO_NEXT_INITIAL: 4,
  XP_TO_NEXT_GROWTH: 1.3,
  EXT_MAX_LEVEL: 5,
  PROJECTILE_LIFE_MS: 1500,
  PROJECTILE_RADIUS: 5,
  WEAPON_SIZE_GROWTH_PER_LEVEL: 0.25,
  MAX_ENEMIES: 350,
  JOYSTICK_RADIUS: 56,
  JOYSTICK_DEADZONE: 8,
};

export const TACTIC = {
  AGGRESSIVE: { id: 'aggressive', name: 'ガンガンいこうぜ', desc: '攻撃重視', aggroRange: 1.5, healThreshold: 0.15, followDist: 120 },
  BALANCED:   { id: 'balanced',   name: 'バランスよく',     desc: '攻守バランス', aggroRange: 1.0, healThreshold: 0.35, followDist: 80 },
  DEFENSIVE:  { id: 'defensive',  name: 'いのちをだいじに', desc: '防御・回復重視', aggroRange: 0.6, healThreshold: 0.55, followDist: 50 },
};

// MCH原データのhp/phy/int/agiを保持。バトル時はMCS式で導出
//   maxHp = HERO_HP_BASE + mchStats.hp × HERO_HP_PER_STAT
//   speed = HERO_SPEED_BASE + mchStats.agi × HERO_SPEED_PER_AGI
export const HEROES = {
  player:     { id: 'player', name: '？？？', imageId: 12001, faction: FACTION.HERO,
    mchStats: { hp: 100, phy: 40, int: 20, agi: 80 },
    atkSpeed: 2.0, atkRange: 55, atkType: 'none', atkPattern: 'none',
    startingExtension: 'novice_katana' },

  mitsunari:  { id: 'mitsunari', name: '石田三成', imageId: 2012, faction: FACTION.HERO,
    mchStats: { hp: 246, phy: 79, int: 116, agi: 63 },
    atkSpeed: 1.2, atkRange: 70, atkType: 'magic', atkPattern: 'bolt',
    startingExtension: 'sensu' },

  kaihime:    { id: 'kaihime', name: '甲斐姫', imageId: 1002, faction: FACTION.HERO,
    mchStats: { hp: 162, phy: 79, int: 45, agi: 118 },
    atkSpeed: 2.8, atkRange: 45, atkType: 'melee', atkPattern: 'rapid',
    startingExtension: 'rapier' },

  ranmaru:    { id: 'ranmaru', name: '森蘭丸', imageId: 2009, faction: FACTION.HERO,
    mchStats: { hp: 168, phy: 79, int: 98, agi: 107 },
    atkSpeed: 1.5, atkRange: 90, atkType: 'ranged', atkPattern: 'arrow',
    startingExtension: 'yumi' },

  yukimura:   { id: 'yukimura', name: '真田幸村', imageId: 3025, faction: FACTION.HERO,
    mchStats: { hp: 220, phy: 130, int: 60, agi: 110 },
    atkSpeed: 2.2, atkRange: 50, atkType: 'melee', atkPattern: 'spear',
    startingExtension: 'cross_spear' },

  nightingale:{ id: 'nightingale', name: 'ナイチンゲール', imageId: 4002, faction: FACTION.HERO,
    mchStats: { hp: 180, phy: 30, int: 150, agi: 80 },
    atkSpeed: 0.6, atkRange: 120, atkType: 'heal', atkPattern: 'aura' },

  nobunaga:   { id: 'nobunaga', name: '織田信長', imageId: 5001, faction: FACTION.HERO,
    mchStats: { hp: 280, phy: 140, int: 100, agi: 100 },
    atkSpeed: 1.0, atkRange: 60, atkType: 'melee', atkPattern: 'wave' },

  sun_tzu:    { id: 'sun_tzu', name: '孫子', imageId: 2011, faction: FACTION.HERO,
    mchStats: { hp: 200, phy: 50, int: 160, agi: 90 },
    atkSpeed: 0.7, atkRange: 140, atkType: 'magic', atkPattern: 'field' },

  // 侵略者（ワールド1ボス）大幅強化
  attila:     { id: 'attila', name: 'アッティラ', imageId: 3047, faction: FACTION.INVADER,
    mchStats: { hp: 1500, phy: 350, int: 150, agi: 90 },
    atkSpeed: 1.8, atkRange: 95, atkType: 'melee', atkPattern: 'wave' },

  // 市民
  etheremon:  { id: 'etheremon', name: 'ETHEREMON-RED', imageId: 3001, faction: FACTION.CITIZEN,
    mchStats: { hp: 150, phy: 50, int: 80, agi: 90 },
    atkSpeed: 1.0, atkRange: 70, atkType: 'ranged', atkPattern: 'orb' },

  douran:     { id: 'douran', name: 'DOURAN', imageId: 3054, faction: FACTION.CITIZEN,
    mchStats: { hp: 200, phy: 100, int: 60, agi: 70 },
    atkSpeed: 0.9, atkRange: 50, atkType: 'melee', atkPattern: 'slash' },
};

// 拠点間移動の所要日数。隣接領地の距離に応じて算出
export function getTravelDays(fromId, toId, worldMap) {
  if (!worldMap) return 5;
  const a = worldMap.territories.find(t => t.id === fromId);
  const b = worldMap.territories.find(t => t.id === toId);
  if (!a || !b) return 5;
  const dx = a.x - b.x, dy = a.y - b.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  // 領地マップ全体は100ユニットなので、対角線で約140
  // 1領地隣接=20-30→ 3-5日。遠距離=70+→ 10日くらい
  const days = Math.max(2, Math.min(10, Math.round(norm / 7)));
  return days;
}

// 領地難易度→基礎ステータス倍率（フェーズ倍率に乗算）
export const DIFFICULTY_MUL = {
  1: 0.85, // 中山道, 木曽 等の入門
  2: 1.0,  // 美濃, 信濃
  3: 1.2,  // 尾張, 近江
  4: 1.5,
  5: 1.8,  // アッティラ城
};

// MCS式エクステンション。武器として機能。
export const EXTENSIONS = {
  novice_blade:  { id: 1001, name: 'ノービスブレード', archetype: 'melee',  baseDmg: 14, baseCd: 700,  range: 80,  phyBonus: 8 },
  novice_katana: { id: 1006, name: 'ノービスカタナ',   archetype: 'melee',  baseDmg: 16, baseCd: 650,  range: 85,  phyBonus: 10 },
  rapier:        { id: 1028, name: 'レイピア',         archetype: 'melee',  baseDmg: 12, baseCd: 450,  range: 75,  phyBonus: 6, agiBonus: 12 },
  yumi:          { id: 1013, name: 'ユミ',             archetype: 'ranged', baseDmg: 18, baseCd: 900,  range: 320, phyBonus: 8, agiBonus: 4 },
  cross_spear:   { id: 1014, name: 'クロススピア',     archetype: 'melee',  baseDmg: 22, baseCd: 750,  range: 100, phyBonus: 14 },
  sensu:         { id: 1032, name: 'センス',           archetype: 'magic',  baseDmg: 24, baseCd: 1100, range: 90,  intBonus: 14 },
  kabuto:        { id: 1018, name: 'カブト',           archetype: 'armor',  baseDmg: 0,  baseCd: 0,    range: 0,   hpBonus: 30 },
  boots:         { id: 1031, name: 'ブーツ',           archetype: 'armor',  baseDmg: 0,  baseCd: 0,    range: 0,   agiBonus: 15 },
};

export const ENEMY_TYPES = {
  // ザコ: 1発で沈む。無双感の源
  creeper_s:    { name: 'クリーパー ショート',          imageId: 101, hp: 8,   phy: 3,  speed: 45,  xp: 2,  radius: 10 },
  creeper_t:    { name: 'クリーパー トール',            imageId: 102, hp: 14,  phy: 4,  speed: 42,  xp: 3,  radius: 11 },
  // 中堅: 2-3発
  creeper_g:    { name: 'クリーパー グランデ',          imageId: 103, hp: 30,  phy: 7,  speed: 36,  xp: 6,  radius: 14 },
  creeper_v:    { name: 'クリーパー ヴェンティ',        imageId: 104, hp: 50,  phy: 10, speed: 32,  xp: 10, radius: 16 },
  // エリート: 5発以上
  creeper_f:    { name: 'クリーパー フラペチーノ',      imageId: 106, hp: 120, phy: 20, speed: 28,  xp: 35, radius: 20 },
  elk_s:        { name: 'エルククローナ ショート',      imageId: 111, hp: 10,  phy: 5,  speed: 55,  xp: 2,  radius: 10 },
  elk_t:        { name: 'エルククローナ トール',        imageId: 112, hp: 18,  phy: 8,  speed: 50,  xp: 4,  radius: 12 },
  elk_g:        { name: 'エルククローナ グランデ',      imageId: 113, hp: 35,  phy: 12, speed: 44,  xp: 8,  radius: 14 },
  elk_f:        { name: 'エルククローナ フラペチーノ',  imageId: 116, hp: 140, phy: 25, speed: 38,  xp: 40, radius: 20 },
  heart_s:      { name: 'ハートブリード ショート',      imageId: 121, hp: 9,   phy: 4,  speed: 40,  xp: 2,  radius: 10 },
  heart_t:      { name: 'ハートブリード トール',        imageId: 122, hp: 16,  phy: 6,  speed: 36,  xp: 4,  radius: 12 },
  heart_g:      { name: 'ハートブリード グランデ',      imageId: 123, hp: 32,  phy: 10, speed: 32,  xp: 7,  radius: 14 },
  melissa_s:    { name: 'メリッサ ショート',            imageId: 131, hp: 10,  phy: 4,  speed: 48,  xp: 2,  radius: 10 },
  melissa_t:    { name: 'メリッサ トール',              imageId: 132, hp: 20,  phy: 7,  speed: 44,  xp: 5,  radius: 12 },
  melissa_g:    { name: 'メリッサ グランデ',            imageId: 133, hp: 38,  phy: 11, speed: 38,  xp: 8,  radius: 14 },
  melissa_f:    { name: 'メリッサ フラペチーノ',        imageId: 136, hp: 130, phy: 22, speed: 34,  xp: 38, radius: 20 },
  bandit_s:     { name: 'バイトバンディット ショート',  imageId: 161, hp: 15,  phy: 7,  speed: 60,  xp: 4,  radius: 11 },
  bandit_t:     { name: 'バイトバンディット トール',    imageId: 162, hp: 28,  phy: 12, speed: 52,  xp: 7,  radius: 13 },
  bandit_f:     { name: 'バイトバンディット フラペチーノ', imageId: 166, hp: 160, phy: 30, speed: 42, xp: 50, radius: 22 },
  bagel_s:      { name: 'ベーグル ショート',            imageId: 181, hp: 25,  phy: 4,  speed: 28,  xp: 4,  radius: 14 },
  bagel_v:      { name: 'ベーグル ヴェンティ',          imageId: 184, hp: 55,  phy: 9,  speed: 22,  xp: 12, radius: 18 },
};

export const STAGE_WAVES = {
  sekigahara_field: {
    title: '関ヶ原の戦場',
    bgm: 'pve.mp3',
    fieldSize: 3000,
    // プレイヤーは戦場の南端中央でスタート
    playerStart: { x: 1500, y: 2700 },
    // クリア条件: 北端の出口に到達
    exit: { x: 1500, y: 200, radius: 90 },
    // フィールド上に既に戦っているヒーロー達
    fieldHeroes: [
      { heroKey: 'mitsunari', x: 1500, y: 2200, encounterRange: 130 },
      { heroKey: 'kaihime',   x:  800, y: 1700, encounterRange: 130 },
      { heroKey: 'ranmaru',   x: 2200, y: 1700, encounterRange: 130 },
      { heroKey: 'yukimura',  x: 1500, y: 1100, encounterRange: 130 },
    ],
    heroBattleEnemies: ['creeper_s', 'creeper_t', 'elk_s', 'heart_s', 'melissa_s'],
    ambientSpawn: {
      enemies: ['creeper_s', 'creeper_t', 'elk_s', 'heart_s', 'melissa_s', 'creeper_g', 'bandit_s'],
      interval: 0.15,
      maxAround: 80,
    },
    // 出口関門: 強敵を密集させる
    exitGuard: {
      enemies: ['bandit_t', 'bandit_s', 'melissa_g', 'elk_g', 'heart_g', 'creeper_v', 'bagel_s', 'bagel_v'],
      eliteEnemies: ['bandit_f', 'melissa_f', 'elk_f', 'creeper_f'],
      // 出口を中心とした守備半径
      guardRadius: 450,
      // 配置上限と再湧き間隔
      maxGuards: 60,
      spawnInterval: 0.08,
      eliteCount: 3,
      eliteSpawnInterval: 1.5,
    },
  },
};

// ワールド1: 関ヶ原周辺の領地マップ
// 各領地はステージ。本拠地から経路でつながり、隣接領地のみ攻略可能
export const WORLD_MAP = {
  id: 'world1',
  name: '第一章 戦国の地',
  territories: [
    {
      id: 'home_camp', name: '西軍本陣', type: 'home', x: 50, y: 78,
      desc: '石田三成の本拠地。内政の中心。',
      icon: '🏯',
    },
    {
      id: 'nakasendo', name: '中山道', type: 'recruit', x: 28, y: 62, difficulty: 1,
      desc: '街道の宿場町。傷ついた医師が助けを求めている。',
      icon: '🛤',
      recruit: 'nightingale',
      reward: { gold: 30, food: 50 },
    },
    {
      id: 'kiso', name: '木曽の森', type: 'battle', x: 72, y: 62, difficulty: 1,
      desc: '材木が豊富な森。盗賊が拠点を構える。',
      icon: '🌲',
      reward: { materials: 80, gold: 20 },
    },
    {
      id: 'mino', name: '美濃', type: 'battle', x: 22, y: 42, difficulty: 2,
      desc: '裕福な領地。攻略すれば金が手に入る。',
      icon: '💴',
      reward: { gold: 200, food: 30 },
    },
    {
      id: 'shinano', name: '信濃', type: 'recruit', x: 50, y: 50, difficulty: 2,
      desc: '山地の領主と謀略家が潜む。',
      icon: '⛰',
      recruit: 'sun_tzu',
      reward: { gold: 80, materials: 40 },
    },
    {
      id: 'owari', name: '尾張', type: 'recruit', x: 78, y: 42, difficulty: 3,
      desc: '織田家の旧領。強力な英雄が眠っている。',
      icon: '🔥',
      recruit: 'nobunaga',
      reward: { gold: 150, materials: 60 },
    },
    {
      id: 'omi', name: '近江', type: 'battle', x: 35, y: 24, difficulty: 3,
      desc: '京への要衝。アッティラ本陣への道。',
      icon: '🏔',
      reward: { gold: 120, materials: 80, food: 40 },
    },
    {
      id: 'attila_castle', name: 'アッティラの本陣', type: 'boss', x: 50, y: 8, difficulty: 5,
      desc: '侵略者アッティラの本拠地。ワールド1の決戦。',
      icon: '👑',
      isFinalBoss: true,
    },
  ],
  // 領地接続グラフ
  connections: [
    ['home_camp', 'nakasendo'],
    ['home_camp', 'kiso'],
    ['nakasendo', 'mino'],
    ['nakasendo', 'shinano'],
    ['kiso', 'shinano'],
    ['kiso', 'owari'],
    ['mino', 'omi'],
    ['shinano', 'omi'],
    ['owari', 'omi'],
    ['omi', 'attila_castle'],
  ],
};

// 各領地のステージ設定（戦闘ノード用）
export const TERRITORY_STAGES = {
  nakasendo: {
    fieldSize: 2400, playerStart: { x: 1200, y: 2200 }, exit: { x: 1200, y: 200, radius: 90 },
    fieldHeroes: [], // 救出はクリア後ダイアログで実施
    heroBattleEnemies: ['creeper_s', 'creeper_t', 'elk_s'],
    ambientSpawn: { enemies: ['creeper_s', 'creeper_t', 'elk_s', 'heart_s'], interval: 0.18, maxAround: 70 },
    exitGuard: { enemies: ['creeper_t', 'elk_s', 'heart_s', 'melissa_s'], eliteEnemies: ['creeper_v'], guardRadius: 380, maxGuards: 30, spawnInterval: 0.12, eliteCount: 1, eliteSpawnInterval: 2.0 },
  },
  kiso: {
    fieldSize: 2400, playerStart: { x: 1200, y: 2200 }, exit: { x: 1200, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['bandit_s', 'creeper_t', 'elk_t'],
    ambientSpawn: { enemies: ['bandit_s', 'creeper_t', 'elk_t', 'heart_t'], interval: 0.15, maxAround: 75 },
    exitGuard: { enemies: ['bandit_s', 'elk_t', 'heart_t', 'melissa_t'], eliteEnemies: ['bandit_t'], guardRadius: 400, maxGuards: 35, spawnInterval: 0.10, eliteCount: 2, eliteSpawnInterval: 1.8 },
  },
  mino: {
    fieldSize: 2700, playerStart: { x: 1350, y: 2500 }, exit: { x: 1350, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['creeper_t', 'elk_g', 'heart_t', 'melissa_t'],
    ambientSpawn: { enemies: ['creeper_g', 'elk_t', 'melissa_t', 'bandit_s'], interval: 0.12, maxAround: 80 },
    exitGuard: { enemies: ['bandit_t', 'melissa_g', 'heart_g', 'elk_g'], eliteEnemies: ['bandit_f', 'creeper_f'], guardRadius: 420, maxGuards: 45, spawnInterval: 0.09, eliteCount: 2, eliteSpawnInterval: 1.6 },
  },
  shinano: {
    fieldSize: 2700, playerStart: { x: 1350, y: 2500 }, exit: { x: 1350, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['creeper_g', 'elk_g', 'heart_g', 'bandit_s'],
    ambientSpawn: { enemies: ['creeper_g', 'melissa_t', 'bandit_s', 'elk_g'], interval: 0.11, maxAround: 80 },
    exitGuard: { enemies: ['bandit_t', 'melissa_g', 'creeper_v', 'elk_g'], eliteEnemies: ['melissa_f', 'creeper_f'], guardRadius: 430, maxGuards: 50, spawnInterval: 0.08, eliteCount: 2, eliteSpawnInterval: 1.5 },
  },
  owari: {
    fieldSize: 3000, playerStart: { x: 1500, y: 2700 }, exit: { x: 1500, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['creeper_v', 'bandit_t', 'elk_g', 'melissa_g'],
    ambientSpawn: { enemies: ['creeper_v', 'bandit_t', 'melissa_g', 'elk_g'], interval: 0.10, maxAround: 85 },
    exitGuard: { enemies: ['bandit_t', 'melissa_g', 'creeper_v', 'elk_g', 'heart_g'], eliteEnemies: ['bandit_f', 'melissa_f', 'elk_f'], guardRadius: 460, maxGuards: 60, spawnInterval: 0.07, eliteCount: 3, eliteSpawnInterval: 1.4 },
  },
  omi: {
    fieldSize: 3000, playerStart: { x: 1500, y: 2700 }, exit: { x: 1500, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['bandit_t', 'creeper_v', 'melissa_g', 'elk_g'],
    ambientSpawn: { enemies: ['bandit_t', 'creeper_v', 'melissa_g', 'elk_g', 'bagel_v'], interval: 0.09, maxAround: 90 },
    exitGuard: { enemies: ['bandit_t', 'melissa_g', 'creeper_v', 'bagel_v', 'elk_g'], eliteEnemies: ['bandit_f', 'melissa_f', 'elk_f', 'creeper_f'], guardRadius: 480, maxGuards: 65, spawnInterval: 0.06, eliteCount: 3, eliteSpawnInterval: 1.3 },
  },
  attila_castle: {
    fieldSize: 3000, playerStart: { x: 1500, y: 2700 }, exit: { x: 1500, y: 200, radius: 90 },
    fieldHeroes: [],
    heroBattleEnemies: ['bandit_t', 'creeper_v', 'bagel_v', 'melissa_g'],
    ambientSpawn: { enemies: ['bandit_t', 'creeper_v', 'bagel_v', 'melissa_g', 'elk_g'], interval: 0.08, maxAround: 100 },
    exitGuard: { enemies: ['bandit_t', 'bagel_v', 'creeper_v', 'melissa_g', 'elk_g'], eliteEnemies: ['bandit_f', 'melissa_f', 'elk_f', 'creeper_f'], guardRadius: 500, maxGuards: 80, spawnInterval: 0.05, eliteCount: 4, eliteSpawnInterval: 1.0 },
    finalBoss: 'attila',
  },
};

// リクルートプール: ゴールドで雇える追加ヒーロー
export const RECRUIT_POOL = [
  { heroKey: 'douran',     cost: 300 },
  { heroKey: 'etheremon',  cost: 400 },
];

// ============================================================
// 時間制エスカレーション (フェーズシステム)
// ============================================================
// 15秒ごとにフェーズが進行。敵の種類/能力/XPが上昇する
export const PHASE_CONFIG = {
  durationSec: 15, // 1フェーズの秒数
  total: 5,
  phases: [
    { num: 1, name: '導入',      tiers: [1],          hpMul: 1.0, dmgMul: 1.0, xpMul: 1.0, color: '#5ecf8a' },
    { num: 2, name: '進攻',      tiers: [1, 2],       hpMul: 1.2, dmgMul: 1.15, xpMul: 1.2, color: '#ffd700' },
    { num: 3, name: '激戦',      tiers: [2, 3],       hpMul: 1.5, dmgMul: 1.35, xpMul: 1.8, color: '#ff8844' },
    { num: 4, name: '危機',      tiers: [3, 4],       hpMul: 4.0, dmgMul: 3.0,  xpMul: 3.5, color: '#ff4040' },
    { num: 5, name: '絶望',      tiers: [4, 5],       hpMul: 8.0, dmgMul: 5.0,  xpMul: 6.0, color: '#aa0000' },
  ],
};

// 各エネミーのTier分類（フェーズで解放される順）
export const ENEMY_TIERS = {
  // Tier 1: ショート系（雑魚）
  creeper_s: 1, elk_s: 1, heart_s: 1, melissa_s: 1,
  // Tier 2: トール系
  creeper_t: 2, elk_t: 2, heart_t: 2, melissa_t: 2,
  // Tier 3: グランデ系 + バンディS
  creeper_g: 3, elk_g: 3, heart_g: 3, melissa_g: 3, bandit_s: 3,
  // Tier 4: ヴェンティ / バンディT / ベーグル
  creeper_v: 4, bandit_t: 4, bagel_s: 4, bagel_v: 4,
  // Tier 5: フラペチーノ系（極悪）
  creeper_f: 5, melissa_f: 5, elk_f: 5, bandit_f: 5,
};

// 中ボス: 特定フェーズで強敵が出現
export const MID_BOSSES = [
  { phase: 3, type: 'bandit_t',  scale: 1.8, hpMul: 5,  dmgMul: 1.6, xpReward: 60 },
  { phase: 4, type: 'bagel_v',   scale: 2.0, hpMul: 6,  dmgMul: 1.8, xpReward: 100 },
  { phase: 5, type: 'bandit_f',  scale: 2.2, hpMul: 8,  dmgMul: 2.0, xpReward: 150 },
];

// 施設定義: 本拠地パッシブ強化
export const FACILITIES = {
  dojo: {
    name: '道場', icon: '⚔', desc: '兵士の自動生産+施設レベル×3/週',
    levels: [
      { cost: { gold: 200 }, name: 'Lv1 稽古場' },
      { cost: { gold: 500, materials: 30 }, name: 'Lv2 道場' },
      { cost: { gold: 1200, materials: 80 }, name: 'Lv3 武芸場' },
    ],
  },
  market: {
    name: '市場', icon: '💰', desc: '金の自動生産+施設レベル×5/週',
    levels: [
      { cost: { gold: 200 }, name: 'Lv1 露店' },
      { cost: { gold: 500, materials: 20 }, name: 'Lv2 市場' },
      { cost: { gold: 1200, materials: 60 }, name: 'Lv3 商業区' },
    ],
  },
  farm: {
    name: '農場', icon: '🌾', desc: '食料の自動生産+施設レベル×5/週',
    levels: [
      { cost: { gold: 150 }, name: 'Lv1 畑' },
      { cost: { gold: 400, materials: 20 }, name: 'Lv2 農場' },
      { cost: { gold: 1000, materials: 50 }, name: 'Lv3 大農園' },
    ],
  },
  smith: {
    name: '工房', icon: '⚒', desc: '素材の自動生産+施設レベル×3/週',
    levels: [
      { cost: { gold: 250, materials: 10 }, name: 'Lv1 鍛冶場' },
      { cost: { gold: 600, materials: 50 }, name: 'Lv2 工房' },
      { cost: { gold: 1500, materials: 120 }, name: 'Lv3 大工房' },
    ],
  },
};

// 道場特訓: 金を払ってXP付与
export const TRAINING_TIERS = [
  { cost: 50, xp: 5, name: '軽い稽古' },
  { cost: 150, xp: 18, name: '本格修行' },
  { cost: 400, xp: 60, name: '武芸特訓' },
];

// エクステンションショップ
export const SHOP_EXTENSIONS = [
  { extKey: 'novice_blade',  cost: 100 },
  { extKey: 'novice_katana', cost: 150 },
  { extKey: 'rapier',        cost: 180 },
  { extKey: 'yumi',          cost: 220 },
  { extKey: 'cross_spear',   cost: 260 },
  { extKey: 'sensu',         cost: 280 },
  { extKey: 'kabuto',        cost: 200 },
  { extKey: 'boots',         cost: 180 },
];

// MCS式: XP_TO_NEXT_INITIAL × XP_TO_NEXT_GROWTH^(level-1)
export function xpToNextLevel(level) {
  return Math.ceil(MCS.XP_TO_NEXT_INITIAL * Math.pow(MCS.XP_TO_NEXT_GROWTH, Math.max(0, level - 1)));
}

export const LEVELUP_CHOICES = [
  { id: 'atk_up',      name: '攻撃力強化',   desc: 'PHY +15%', stat: 'phy', mul: 0.15 },
  { id: 'spd_up',      name: '攻撃速度UP',   desc: '攻撃速度 +12%', stat: 'atkSpeed', mul: 0.12 },
  { id: 'hp_up',       name: 'HP強化',       desc: 'MaxHP +20%', stat: 'maxHp', mul: 0.20 },
  { id: 'range_up',    name: '射程延長',     desc: '攻撃範囲 +20%', stat: 'atkRange', mul: 0.20 },
  { id: 'move_up',     name: '移動速度UP',   desc: '移動速度 +15%', stat: 'agi', mul: 0.15 },
  { id: 'int_up',      name: '知力強化',     desc: 'INT +15%', stat: 'int', mul: 0.15 },
  { id: 'pickup_up',   name: '回収範囲UP',   desc: 'アイテム回収範囲 +30%', stat: 'pickupRange', mul: 0.30 },
  { id: 'ally_atk',    name: '味方攻撃UP',   desc: '味方の攻撃力 +10%', stat: 'allyPhyBuff', mul: 0.10 },
];

export const DIALOGUES = {
  scene1_fall: [
    { speaker: '', text: 'え・・・落ちてる！？' },
    { speaker: '', text: 'うわーーーー！！' },
  ],
  scene_alone: [
    { speaker: '', text: '痛っ・・・　ここは・・・戦場？' },
    { speaker: '', text: '（足元にカタナが落ちている）' },
    { speaker: '', text: 'ノービスカタナを手に入れた！' },
    { speaker: '', text: '（北に進んで、戦場から脱出するんだ——）' },
  ],
  encounter_mitsunari: [
    { speaker: '？？？', text: '——援軍はまだか・・・！' },
    { speaker: '？？？', text: 'そこの者、何者だ！？', portrait: 'mitsunari' },
    { speaker: '', text: '（古い武家の言葉・・・\nなのに、自然と理解できる）' },
    { speaker: '？？？', text: '・・・？　お主、我の言葉がわかるのか？', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '我は石田三成。\nこの混乱の中で意思を通わせる者がいるとは・・・！', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'ここはクリプトワールド——\n現実とは異なる、歪んだもう一つの世界。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '北に戦場を抜ける道がある。\nまずはそこから脱出するのだ。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '他にも孤立して戦っている者がいる。\n声を掛けて共に進もう！', portrait: 'mitsunari' },
    { speaker: '', text: '石田三成が仲間になった！' },
  ],
  encounter_kaihime: [
    { speaker: '？？？', text: 'まだ・・・倒れぬ・・・！' },
    { speaker: '？？？', text: 'あなた・・・誰？\n私の言葉、わかるの・・・！？', portrait: 'kaihime' },
    { speaker: '甲斐姫', text: 'よかった・・・！\n私は甲斐姫。一人で戦い続けて、限界が近かった。', portrait: 'kaihime' },
    { speaker: '甲斐姫', text: 'あなたが先頭に立ってくれるなら、\n私もまだ戦える！', portrait: 'kaihime' },
    { speaker: '', text: '甲斐姫が仲間になった！' },
  ],
  encounter_ranmaru: [
    { speaker: '？？？', text: 'ふぅ・・・矢が尽きかけている・・・' },
    { speaker: '？？？', text: 'そこの方、言葉が通じるのか・・・！？', portrait: 'ranmaru' },
    { speaker: '森蘭丸', text: '拙者は森蘭丸。\n敵に囲まれ、孤立していた。', portrait: 'ranmaru' },
    { speaker: '森蘭丸', text: '貴殿が我らをつなぐ要となるならば、\nこの弓、共に振るおう。', portrait: 'ranmaru' },
    { speaker: '', text: '森蘭丸が仲間になった！' },
  ],
  encounter_yukimura: [
    { speaker: '？？？', text: 'ハァッ・・・ハァッ・・・！\nまだ・・・倒れぬぞ・・・！' },
    { speaker: '？？？', text: 'お主・・・！　言葉が通じるか・・・！？', portrait: 'yukimura' },
    { speaker: '真田幸村', text: '日本一の兵、真田幸村！\n孤軍奮闘していたが、もはや限界よ。', portrait: 'yukimura' },
    { speaker: '真田幸村', text: 'お主のような者が現れるとは・・・運命か。\n出口まで、共に駆けようぞ！', portrait: 'yukimura' },
    { speaker: '', text: '真田幸村が仲間になった！' },
  ],
  reach_exit: [
    { speaker: '', text: '——脱出に成功した！' },
    { speaker: '石田三成', text: 'よし・・・！　ひとまず安全な場所まで戻ろう。', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: 'みんなの言葉が通じあう不思議な力・・・\nあなたがいてくれて良かった。', portrait: 'kaihime' },
    { speaker: '石田三成', text: 'だがこの戦は終わっていない。\n「アッティラ」と名乗る侵略者の本陣はまだ北にある。', portrait: 'mitsunari' },
    { speaker: '真田幸村', text: '力を蓄え、また戻ってこよう。\nお主と共にならば、必ず討てる。', portrait: 'yukimura' },
    { speaker: '', text: '（クリプトワールドの戦いは、まだ始まったばかり——）' },
  ],
};

export const SWARM_ENEMY_IDS = [101, 102, 103, 104, 105, 106, 111, 112, 113, 114, 115, 116];
