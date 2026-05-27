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
    baseStats: { maxHp: 200, phy: 28, int: 15, agi: 50, atkSpeed: 1.2, atkRange: 40 },
    atkType: 'melee', atkPattern: 'slash', growthRate: { maxHp: 20, phy: 4, int: 2, agi: 3 } },

  mitsunari:  { id: 'mitsunari', name: '石田三成', imageId: 2012, faction: FACTION.HERO,
    baseStats: { maxHp: 300, phy: 35, int: 55, agi: 35, atkSpeed: 0.8, atkRange: 100 },
    atkType: 'magic', atkPattern: 'bolt', growthRate: { maxHp: 25, phy: 3, int: 6, agi: 2 } },

  kaihime:    { id: 'kaihime', name: '甲斐姫', imageId: 1002, faction: FACTION.HERO,
    baseStats: { maxHp: 220, phy: 42, int: 15, agi: 60, atkSpeed: 1.6, atkRange: 35 },
    atkType: 'melee', atkPattern: 'rapid', growthRate: { maxHp: 16, phy: 5, int: 1, agi: 5 } },

  ranmaru:    { id: 'ranmaru', name: '森蘭丸', imageId: 2009, faction: FACTION.HERO,
    baseStats: { maxHp: 250, phy: 30, int: 40, agi: 50, atkSpeed: 1.0, atkRange: 80 },
    atkType: 'ranged', atkPattern: 'arrow', growthRate: { maxHp: 18, phy: 3, int: 4, agi: 4 } },

  yukimura:   { id: 'yukimura', name: '真田幸村', imageId: 3025, faction: FACTION.HERO,
    baseStats: { maxHp: 280, phy: 50, int: 20, agi: 55, atkSpeed: 1.4, atkRange: 40 },
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
  creeper_s:    { name: 'クリーパー ショート',          imageId: 101, hp: 15,  phy: 4,  speed: 40,  xp: 3,  radius: 12 },
  creeper_t:    { name: 'クリーパー トール',            imageId: 102, hp: 25,  phy: 6,  speed: 35,  xp: 5,  radius: 14 },
  creeper_g:    { name: 'クリーパー グランデ',          imageId: 103, hp: 40,  phy: 9,  speed: 30,  xp: 8,  radius: 16 },
  creeper_v:    { name: 'クリーパー ヴェンティ',        imageId: 104, hp: 60,  phy: 12, speed: 28,  xp: 12, radius: 18 },
  creeper_f:    { name: 'クリーパー フラペチーノ',      imageId: 106, hp: 150, phy: 25, speed: 22,  xp: 40, radius: 22 },
  elk_s:        { name: 'エルククローナ ショート',      imageId: 111, hp: 20,  phy: 7,  speed: 50,  xp: 4,  radius: 12 },
  elk_t:        { name: 'エルククローナ トール',        imageId: 112, hp: 30,  phy: 10, speed: 45,  xp: 6,  radius: 14 },
  elk_g:        { name: 'エルククローナ グランデ',      imageId: 113, hp: 50,  phy: 14, speed: 40,  xp: 10, radius: 16 },
  elk_f:        { name: 'エルククローナ フラペチーノ',  imageId: 116, hp: 180, phy: 30, speed: 35,  xp: 50, radius: 22 },
  heart_s:      { name: 'ハートブリード ショート',      imageId: 121, hp: 18,  phy: 5,  speed: 35,  xp: 4,  radius: 12 },
  heart_t:      { name: 'ハートブリード トール',        imageId: 122, hp: 28,  phy: 8,  speed: 32,  xp: 6,  radius: 14 },
  heart_g:      { name: 'ハートブリード グランデ',      imageId: 123, hp: 45,  phy: 12, speed: 28,  xp: 9,  radius: 16 },
  melissa_s:    { name: 'メリッサ ショート',            imageId: 131, hp: 22,  phy: 6,  speed: 42,  xp: 4,  radius: 12 },
  melissa_t:    { name: 'メリッサ トール',              imageId: 132, hp: 35,  phy: 9,  speed: 38,  xp: 7,  radius: 14 },
  melissa_g:    { name: 'メリッサ グランデ',            imageId: 133, hp: 55,  phy: 14, speed: 34,  xp: 11, radius: 16 },
  melissa_f:    { name: 'メリッサ フラペチーノ',        imageId: 136, hp: 160, phy: 28, speed: 30,  xp: 45, radius: 22 },
  bandit_s:     { name: 'バイトバンディット ショート',  imageId: 161, hp: 30,  phy: 10, speed: 55,  xp: 6,  radius: 14 },
  bandit_t:     { name: 'バイトバンディット トール',    imageId: 162, hp: 50,  phy: 15, speed: 48,  xp: 10, radius: 16 },
  bandit_f:     { name: 'バイトバンディット フラペチーノ', imageId: 166, hp: 200, phy: 35, speed: 38, xp: 60, radius: 24 },
  bagel_s:      { name: 'ベーグル ショート',            imageId: 181, hp: 45,  phy: 6,  speed: 25,  xp: 5,  radius: 16 },
  bagel_v:      { name: 'ベーグル ヴェンティ',          imageId: 184, hp: 80,  phy: 12, speed: 20,  xp: 15, radius: 20 },
};

export const STAGE_WAVES = {
  sekigahara_field: {
    duration: 300,
    bgm: 'pve.mp3',
    fieldSize: 2000,
    waves: [
      { time: 0,   enemies: ['creeper_s'], count: 8,  interval: 0.8 },
      { time: 15,  enemies: ['creeper_s', 'creeper_t'], count: 12, interval: 0.6 },
      { time: 35,  enemies: ['elk_s', 'creeper_t'], count: 15, interval: 0.5 },
      { time: 55,  enemies: ['heart_s', 'melissa_s', 'elk_s'], count: 18, interval: 0.45 },
      { time: 75,  event: 'rescue', heroKey: 'kaihime' },
      { time: 80,  enemies: ['creeper_g', 'elk_t', 'melissa_s'], count: 20, interval: 0.4 },
      { time: 110, enemies: ['heart_t', 'melissa_t', 'elk_g'], count: 22, interval: 0.35 },
      { time: 140, event: 'rescue', heroKey: 'ranmaru' },
      { time: 145, enemies: ['creeper_v', 'bandit_s', 'melissa_g'], count: 25, interval: 0.3 },
      { time: 180, enemies: ['bandit_t', 'elk_g', 'heart_g', 'bagel_s'], count: 28, interval: 0.28 },
      { time: 215, event: 'rescue', heroKey: 'yukimura' },
      { time: 220, enemies: ['creeper_f', 'melissa_f', 'bandit_t'], count: 20, interval: 0.3 },
      { time: 260, enemies: ['elk_f', 'bandit_f', 'melissa_f', 'bagel_v'], count: 15, interval: 0.35 },
      { time: 290, event: 'boss', bossType: 'bandit_f', bossScale: 2.5, bossHpMul: 5, bossDmgMul: 2 },
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
  battle_start: [
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
