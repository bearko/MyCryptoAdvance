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
    atkSpeed: 1.2, atkRange: 110, atkType: 'magic', atkPattern: 'bolt',
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

  // 侵略者（ワールド1ボス）
  attila:     { id: 'attila', name: 'アッティラ', imageId: 3047, faction: FACTION.INVADER,
    mchStats: { hp: 600, phy: 200, int: 100, agi: 80 },
    atkSpeed: 1.5, atkRange: 80, atkType: 'melee', atkPattern: 'wave' },

  // 市民
  etheremon:  { id: 'etheremon', name: 'ETHEREMON-RED', imageId: 3001, faction: FACTION.CITIZEN,
    mchStats: { hp: 150, phy: 50, int: 80, agi: 90 },
    atkSpeed: 1.0, atkRange: 70, atkType: 'ranged', atkPattern: 'orb' },

  douran:     { id: 'douran', name: 'DOURAN', imageId: 3054, faction: FACTION.CITIZEN,
    mchStats: { hp: 200, phy: 100, int: 60, agi: 70 },
    atkSpeed: 0.9, atkRange: 50, atkType: 'melee', atkPattern: 'slash' },
};

// MCS式エクステンション。武器として機能。
export const EXTENSIONS = {
  novice_blade:  { id: 1001, name: 'ノービスブレード', archetype: 'melee',  baseDmg: 14, baseCd: 700,  range: 80,  phyBonus: 8 },
  novice_katana: { id: 1006, name: 'ノービスカタナ',   archetype: 'melee',  baseDmg: 16, baseCd: 650,  range: 85,  phyBonus: 10 },
  rapier:        { id: 1028, name: 'レイピア',         archetype: 'melee',  baseDmg: 12, baseCd: 450,  range: 75,  phyBonus: 6, agiBonus: 12 },
  yumi:          { id: 1013, name: 'ユミ',             archetype: 'ranged', baseDmg: 18, baseCd: 900,  range: 320, phyBonus: 8, agiBonus: 4 },
  cross_spear:   { id: 1014, name: 'クロススピア',     archetype: 'melee',  baseDmg: 22, baseCd: 750,  range: 100, phyBonus: 14 },
  sensu:         { id: 1032, name: 'センス',           archetype: 'magic',  baseDmg: 24, baseCd: 1100, range: 240, intBonus: 14 },
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
