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

  // 敵将（侵略者）
  attila:     { id: 'attila', name: 'アッティラ', imageId: 3047, faction: FACTION.INVADER,
    baseStats: { maxHp: 1800, phy: 65, int: 40, agi: 50, atkSpeed: 1.5, atkRange: 80 },
    atkType: 'melee', atkPattern: 'wave', growthRate: { maxHp: 50, phy: 8, int: 4, agi: 4 } },

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
    bgm: 'pve.mp3',
    fieldSize: 3000,
    // プレイヤーは戦場の南端中央でスタート
    playerStart: { x: 1500, y: 2700 },
    // 敵将アッティラの位置（北端の本陣）
    boss: { heroKey: 'attila', x: 1500, y: 300 },
    // フィールド上に既に戦っているヒーロー達
    fieldHeroes: [
      { heroKey: 'mitsunari', x: 1500, y: 2000, encounterRange: 130 },
      { heroKey: 'kaihime',   x:  700, y: 1600, encounterRange: 130 },
      { heroKey: 'ranmaru',   x: 2300, y: 1600, encounterRange: 130 },
      { heroKey: 'yukimura',  x: 1500, y: 1100, encounterRange: 130 },
    ],
    // 各拠点周辺に常時湧く敵の設定（ヒーローと交戦中）
    heroBattleEnemies: ['creeper_s', 'creeper_t', 'elk_s', 'heart_s', 'melissa_s'],
    // プレイヤー周辺に湧く敵（ランダムスポーン）
    ambientSpawn: {
      enemies: ['creeper_s', 'creeper_t', 'elk_s', 'heart_s', 'melissa_s', 'creeper_g', 'bandit_s'],
      interval: 0.15,
      maxAround: 80,
    },
    // 敵将本陣の精鋭エネミー
    bossGuards: ['bandit_t', 'creeper_v', 'melissa_g', 'elk_g', 'bagel_s'],
    bossGuardInterval: 0.2,
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
    { speaker: '', text: 'え・・・落ちてる！？' },
    { speaker: '', text: 'うわーーーー！！' },
  ],
  scene_alone: [
    { speaker: '', text: '痛っ・・・　ここは・・・戦場？' },
    { speaker: '', text: '（足元にカタナが落ちている）' },
    { speaker: '', text: 'ノービスカタナを手に入れた！' },
  ],
  encounter_mitsunari: [
    { speaker: '？？？', text: '——援軍はまだか・・・！' },
    { speaker: '？？？', text: 'そこの者、何者だ！？', portrait: 'mitsunari' },
    { speaker: '', text: '（古い武家の言葉・・・\nなのに、自然と理解できる）' },
    { speaker: '？？？', text: '・・・？　お主、我の言葉がわかるのか？', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '我は石田三成。\nこの混乱の中で意思を通わせる者がいるとは・・・！', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'ここはクリプトワールド——\n現実とは異なる、歪んだもう一つの世界。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '北の本陣に「アッティラ」と名乗る侵略者がいる。\n奴を討たねば、この戦は終わらぬ。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'だが一人では届かぬ。\nまずは他の戦士たちを集めるのだ。共に行こう！', portrait: 'mitsunari' },
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
    { speaker: '真田幸村', text: 'お主のような者が現れるとは・・・運命か。\n敵将アッティラまで、共に駆けようぞ！', portrait: 'yukimura' },
    { speaker: '', text: '真田幸村が仲間になった！' },
  ],
  attila_approach: [
    { speaker: '石田三成', text: 'あれが・・・敵将アッティラ。\n奴を討てば、この戦は終わる。', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: 'みんなで力を合わせれば、必ず勝てる！', portrait: 'kaihime' },
    { speaker: '', text: '（バラバラだった英雄たちが、\nあなたを中心に一つになった——）' },
  ],
  battle_victory: [
    { speaker: '', text: '・・・敵将アッティラ、討ち取った！' },
    { speaker: '石田三成', text: 'やったぞ・・・！\nお主のおかげだ。', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: 'みんなの言葉が通じあう・・・\nこんな戦い方ができるなんて思いもしなかった！', portrait: 'kaihime' },
    { speaker: '真田幸村', text: 'お主こそ、この世界に必要な存在だ。', portrait: 'yukimura' },
    { speaker: '', text: '（クリプトワールドの戦いは、まだ始まったばかり——）' },
  ],
};

export const SWARM_ENEMY_IDS = [101, 102, 103, 104, 105, 106, 111, 112, 113, 114, 115, 116];
