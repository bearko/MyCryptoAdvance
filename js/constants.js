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

export const TACTIC = {
  AGGRESSIVE: { id: 'aggressive', name: 'ガンガンいこうぜ', desc: '攻撃重視', aggroRange: 1.5, healThreshold: 0.15, followDist: 120 },
  BALANCED:   { id: 'balanced',   name: 'バランスよく',     desc: '攻守バランス', aggroRange: 1.0, healThreshold: 0.35, followDist: 80 },
  DEFENSIVE:  { id: 'defensive',  name: 'いのちをだいじに', desc: '防御・回復重視', aggroRange: 0.6, healThreshold: 0.55, followDist: 50 },
};

export const HEROES = {
  player:     { id: 'player', name: '？？？', imageId: 12001, faction: FACTION.HERO,
    baseStats: { maxHp: 200, phy: 32, int: 15, agi: 55, atkSpeed: 2.0, atkRange: 55 },
    atkType: 'none', atkPattern: 'none', growthRate: { maxHp: 20, phy: 4, int: 2, agi: 3 } },

  mitsunari:  { id: 'mitsunari', name: '石田三成', imageId: 2012, faction: FACTION.HERO,
    baseStats: { maxHp: 300, phy: 35, int: 55, agi: 35, atkSpeed: 1.2, atkRange: 110 },
    atkType: 'magic', atkPattern: 'bolt', growthRate: { maxHp: 25, phy: 3, int: 6, agi: 2 } },

  kaihime:    { id: 'kaihime', name: '甲斐姫', imageId: 1002, faction: FACTION.HERO,
    baseStats: { maxHp: 220, phy: 42, int: 15, agi: 65, atkSpeed: 2.8, atkRange: 45 },
    atkType: 'melee', atkPattern: 'rapid', growthRate: { maxHp: 16, phy: 5, int: 1, agi: 5 } },

  ranmaru:    { id: 'ranmaru', name: '森蘭丸', imageId: 2009, faction: FACTION.HERO,
    baseStats: { maxHp: 250, phy: 30, int: 40, agi: 50, atkSpeed: 1.5, atkRange: 90 },
    atkType: 'ranged', atkPattern: 'arrow', growthRate: { maxHp: 18, phy: 3, int: 4, agi: 4 } },

  yukimura:   { id: 'yukimura', name: '真田幸村', imageId: 3025, faction: FACTION.HERO,
    baseStats: { maxHp: 280, phy: 55, int: 20, agi: 60, atkSpeed: 2.2, atkRange: 50 },
    atkType: 'melee', atkPattern: 'spear', growthRate: { maxHp: 22, phy: 6, int: 2, agi: 4 } },

  nightingale:{ id: 'nightingale', name: 'ナイチンゲール', imageId: 4002, faction: FACTION.HERO,
    baseStats: { maxHp: 180, phy: 10, int: 60, agi: 30, atkSpeed: 0.6, atkRange: 120 },
    atkType: 'heal', atkPattern: 'aura', growthRate: { maxHp: 15, phy: 1, int: 7, agi: 2 } },

  nobunaga:   { id: 'nobunaga', name: '織田信長', imageId: 5001, faction: FACTION.HERO,
    baseStats: { maxHp: 350, phy: 55, int: 45, agi: 45, atkSpeed: 1.0, atkRange: 60 },
    atkType: 'melee', atkPattern: 'wave', growthRate: { maxHp: 28, phy: 6, int: 4, agi: 3 } },

  sun_tzu:    { id: 'sun_tzu', name: '孫子', imageId: 2011, faction: FACTION.HERO,
    baseStats: { maxHp: 260, phy: 25, int: 65, agi: 40, atkSpeed: 0.7, atkRange: 140 },
    atkType: 'magic', atkPattern: 'field', growthRate: { maxHp: 20, phy: 2, int: 7, agi: 3 } },

  // Citizens
  etheremon:  { id: 'etheremon', name: 'ETHEREMON-RED', imageId: 3001, faction: FACTION.CITIZEN,
    baseStats: { maxHp: 150, phy: 20, int: 30, agi: 40, atkSpeed: 1.0, atkRange: 70 },
    atkType: 'ranged', atkPattern: 'orb', growthRate: { maxHp: 12, phy: 2, int: 3, agi: 3 } },

  douran:     { id: 'douran', name: 'DOURAN', imageId: 3054, faction: FACTION.CITIZEN,
    baseStats: { maxHp: 200, phy: 35, int: 25, agi: 35, atkSpeed: 0.9, atkRange: 50 },
    atkType: 'melee', atkPattern: 'slash', growthRate: { maxHp: 18, phy: 4, int: 2, agi: 3 } },
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
    duration: 300,
    bgm: 'pve.mp3',
    fieldSize: 2000,
    laneWidth: 280,
    totalEnemies: 950,
    waves: [
      // 序盤: 正面からザコの壁。道が狭いので密集してくる
      { time: 0,   enemies: ['creeper_s'], count: 30, interval: 0.12, spawnDir: [-Math.PI/2, 0.3] },
      { time: 5,   enemies: ['creeper_s', 'creeper_s'], count: 35, interval: 0.10, spawnDir: [-Math.PI/2, 0.3] },
      { time: 12,  enemies: ['creeper_s', 'creeper_t'], count: 40, interval: 0.08, spawnDir: [-Math.PI/2, 0.4] },
      { time: 22,  enemies: ['elk_s', 'creeper_s', 'creeper_s'], count: 45, interval: 0.07, spawnDir: [-Math.PI/2, 0.4] },
      { time: 34,  enemies: ['creeper_t', 'elk_s', 'heart_s'], count: 50, interval: 0.06, spawnDir: [-Math.PI/2, 0.5] },
      { time: 50,  enemies: ['melissa_s', 'creeper_t', 'elk_s', 'creeper_s'], count: 55, interval: 0.06, spawnDir: [-Math.PI/2, 0.6] },
      { time: 65,  event: 'rescue', heroKey: 'kaihime' },
      { time: 68,  enemies: ['creeper_g', 'elk_t', 'melissa_s', 'heart_s'], count: 60, interval: 0.06, spawnDir: [-Math.PI/2, 0.7] },
      { time: 88,  enemies: ['heart_t', 'melissa_t', 'elk_g', 'creeper_t'], count: 60, interval: 0.05, spawnDir: [-Math.PI/2, 0.8] },
      { time: 108, enemies: ['melissa_t', 'elk_t', 'bandit_s', 'heart_t'], count: 65, interval: 0.05, spawnDir: [-Math.PI/2, 1.0] },
      { time: 125, event: 'rescue', heroKey: 'ranmaru' },
      { time: 128, enemies: ['creeper_v', 'bandit_s', 'melissa_g', 'elk_g'], count: 65, interval: 0.05, spawnDir: [-Math.PI/2, 1.2] },
      { time: 150, enemies: ['bandit_t', 'elk_g', 'heart_g', 'melissa_g', 'bagel_s'], count: 70, interval: 0.05 },
      { time: 175, enemies: ['bandit_t', 'creeper_v', 'melissa_g', 'elk_g'], count: 70, interval: 0.04 },
      { time: 195, event: 'rescue', heroKey: 'yukimura' },
      { time: 198, enemies: ['creeper_f', 'melissa_f', 'bandit_t', 'elk_g'], count: 60, interval: 0.06 },
      { time: 225, enemies: ['elk_f', 'bandit_f', 'melissa_f', 'bagel_v', 'creeper_v'], count: 50, interval: 0.08 },
      { time: 260, event: 'boss', bossType: 'bandit_f', bossScale: 2.5, bossHpMul: 8, bossDmgMul: 2 },
    ],
    xpTable: [0, 30, 80, 150, 250, 400, 600, 850, 1200, 1600, 2100, 2700, 3500],
  },
};

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
    { speaker: '', text: '・・・' },
    { speaker: '', text: 'なんだ　ここ？' },
    { speaker: '', text: 'え　落ちてる？　空！？' },
    { speaker: '', text: 'うわーーーー！！' },
  ],
  scene2_awaken: [
    { speaker: '', text: '・・・・・・' },
    { speaker: '', text: '痛っ・・・ここは・・・' },
    { speaker: '', text: '草原？　いや・・・戦場？\n何が起きてるんだ・・・' },
  ],
  scene2_enemies: [
    { speaker: '', text: '！？' },
    { speaker: '', text: '何だあれは・・・！\nこっちに向かってくる！' },
  ],
  scene3_mitsunari: [
    { speaker: '？？？', text: '危ない！　伏せろ！' },
    { speaker: '石田三成', text: '・・・間に合ったか。\n無事のようだな。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'ここはクリプトワールド——\n現実とは異なる、もう一つの世界だ。', portrait: 'mitsunari' },
    { speaker: '', text: 'クリプトワールド・・・？' },
    { speaker: '石田三成', text: 'あの化物どもは「侵略者」の先兵。\nこの世界を喰らい尽くそうとしている。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'お主にも戦う力があるはずだ。\n我と共に戦ってくれ！', portrait: 'mitsunari' },
  ],
  get_katana: [
    { speaker: '石田三成', text: 'これを使え。', portrait: 'mitsunari' },
    { speaker: '', text: 'ノービスカタナを手に入れた！' },
    { speaker: '石田三成', text: '来るぞ！　構えろ！', portrait: 'mitsunari' },
  ],
  rescue_kaihime: [
    { speaker: '甲斐姫', text: '助けてくれてありがとう！\n私も戦わせて！', portrait: 'kaihime' },
  ],
  rescue_ranmaru: [
    { speaker: '森蘭丸', text: '感謝する！\n拙者の弓が役に立つはずだ。', portrait: 'ranmaru' },
  ],
  rescue_yukimura: [
    { speaker: '真田幸村', text: '日本一の兵、真田幸村！\nここからが本番だ！', portrait: 'yukimura' },
  ],
  battle_victory: [
    { speaker: '石田三成', text: '・・・やったぞ！', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'お主は強い。この世界に来た意味があるのだろう。', portrait: 'mitsunari' },
    { speaker: '', text: '（クリプトワールド・・・\nこの不思議な世界で、冒険は始まったばかりだ——）' },
  ],
};

export const SWARM_ENEMY_IDS = [101, 102, 103, 104, 105, 106, 111, 112, 113, 114, 115, 116];
