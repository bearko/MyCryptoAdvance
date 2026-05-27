/* ============================================================
   constants.js — all game data, assets, dialogue, stage config
   MCH asset names sourced from bearko/mycryptoheroes
   ============================================================ */

const ASSET_BASE = 'https://raw.githubusercontent.com/bearko/mycryptoheroes/main';
const AUDIO_BASE = ASSET_BASE + '/Audio';

export const ASSETS = {
  hero:       id => `${ASSET_BASE}/Image/Heroes/${id}.png`,
  enemy:      id => `${ASSET_BASE}/Image/Enemies/${id}.png`,
  background: id => `${ASSET_BASE}/Image/Backgrounds/${id}.png`,
  extension:  id => `${ASSET_BASE}/Image/Extensions/${id}.png`,
  bgm:      name => `${AUDIO_BASE}/BGM/${name}`,
  se:       name => `${AUDIO_BASE}/SE/${name}`,
};

export const HEROES = {
  player: {
    id: 'player', name: '？？？', imageId: 12001,
    baseStats: { maxHp: 120, hp: 120, phy: 35, int: 20, agi: 30 },
    growthRate: { maxHp: 18, phy: 5, int: 3, agi: 4 },
    skills: [
      { id: 'slash', name: '斬撃', type: 'phy', power: 1.0, target: 'single', desc: '剣で斬りつける', cooldownMax: 0 },
      { id: 'heavy', name: '強撃', type: 'phy', power: 1.6, target: 'single', desc: '渾身の一撃', cooldownMax: 2 },
    ],
  },
  mitsunari: {
    id: 'mitsunari', name: '石田三成', imageId: 2012,
    baseStats: { maxHp: 200, hp: 200, phy: 55, int: 80, agi: 40 },
    growthRate: { maxHp: 24, phy: 6, int: 10, agi: 4 },
    skills: [
      { id: 'saihai', name: '采配', type: 'phy', power: 1.2, target: 'single', desc: '大一大万大吉の采配', cooldownMax: 0 },
      { id: 'gino_issen', name: '義の一閃', type: 'int', power: 1.8, target: 'single', desc: '正義を貫く一撃', cooldownMax: 3 },
      { id: 'inspire', name: '鼓舞', type: 'heal', power: 0.3, target: 'all_ally', desc: '味方全員のHPを回復', cooldownMax: 4 },
    ],
  },
  kaihime: {
    id: 'kaihime', name: '甲斐姫', imageId: 1002,
    baseStats: { maxHp: 140, hp: 140, phy: 55, int: 30, agi: 70 },
    growthRate: { maxHp: 16, phy: 7, int: 3, agi: 8 },
    skills: [
      { id: 'namikiri', name: '波切', type: 'phy', power: 1.1, target: 'single', desc: '素早い連撃', cooldownMax: 0 },
      { id: 'hayate', name: '疾風斬り', type: 'phy', power: 1.4, target: 'single', desc: '風の如き一太刀', cooldownMax: 2 },
      { id: 'war_cry', name: '鬨の声', type: 'buff_phy', power: 1.3, target: 'all_ally', desc: '味方の攻撃力UP', cooldownMax: 5 },
    ],
  },
  ranmaru: {
    id: 'ranmaru', name: '森蘭丸', imageId: 2009,
    baseStats: { maxHp: 150, hp: 150, phy: 50, int: 65, agi: 65 },
    growthRate: { maxHp: 16, phy: 6, int: 8, agi: 7 },
    skills: [
      { id: 'loyalty', name: '忠義の刃', type: 'phy', power: 1.1, target: 'single', desc: '忠義を込めた一撃', cooldownMax: 0 },
      { id: 'katon', name: '火遁', type: 'int', power: 1.3, target: 'all_enemy', desc: '炎で敵全体を焼く', cooldownMax: 3 },
      { id: 'heal_touch', name: '手当', type: 'heal', power: 0.25, target: 'single_ally', desc: '味方一人のHPを回復', cooldownMax: 2 },
    ],
  },
};

export const ENEMIES = {
  creeper_s:        { name: 'クリーパー ショート',               imageId: 101, hp: 40,  phy: 12, int: 8,  agi: 10 },
  creeper_t:        { name: 'クリーパー トール',                 imageId: 102, hp: 55,  phy: 16, int: 10, agi: 12 },
  creeper_g:        { name: 'クリーパー グランデ',               imageId: 103, hp: 65,  phy: 18, int: 12, agi: 14 },
  creeper_v:        { name: 'クリーパー ヴェンティ',             imageId: 104, hp: 80,  phy: 22, int: 14, agi: 16 },
  creeper_f:        { name: 'クリーパー フラペチーノ',           imageId: 106, hp: 160, phy: 42, int: 30, agi: 28 },
  elk_s:            { name: 'エルククローナ ショート',           imageId: 111, hp: 35,  phy: 18, int: 8,  agi: 10 },
  elk_t:            { name: 'エルククローナ トール',             imageId: 112, hp: 50,  phy: 22, int: 10, agi: 12 },
  elk_g:            { name: 'エルククローナ グランデ',           imageId: 113, hp: 60,  phy: 26, int: 12, agi: 14 },
  elk_v:            { name: 'エルククローナ ヴェンティ',         imageId: 114, hp: 75,  phy: 30, int: 14, agi: 16 },
  elk_f:            { name: 'エルククローナ フラペチーノ',       imageId: 116, hp: 150, phy: 50, int: 28, agi: 26 },
  heart_s:          { name: 'ハートブリード ショート',           imageId: 121, hp: 38,  phy: 10, int: 18, agi: 12 },
  heart_t:          { name: 'ハートブリード トール',             imageId: 122, hp: 52,  phy: 14, int: 24, agi: 14 },
  heart_g:          { name: 'ハートブリード グランデ',           imageId: 123, hp: 62,  phy: 16, int: 28, agi: 16 },
  melissa_s:        { name: 'メリッサ ショート',                 imageId: 131, hp: 45,  phy: 14, int: 16, agi: 12 },
  melissa_t:        { name: 'メリッサ トール',                   imageId: 132, hp: 60,  phy: 18, int: 20, agi: 14 },
  melissa_g:        { name: 'メリッサ グランデ',                 imageId: 133, hp: 72,  phy: 20, int: 24, agi: 16 },
  melissa_f:        { name: 'メリッサ フラペチーノ',             imageId: 136, hp: 140, phy: 38, int: 42, agi: 28 },
  bandit_s:         { name: 'バイトバンディット ショート',       imageId: 161, hp: 65,  phy: 24, int: 8,  agi: 18 },
  bandit_t:         { name: 'バイトバンディット トール',         imageId: 162, hp: 85,  phy: 30, int: 10, agi: 20 },
  bandit_v:         { name: 'バイトバンディット ヴェンティ',     imageId: 164, hp: 100, phy: 36, int: 12, agi: 22 },
  bandit_f:         { name: 'バイトバンディット フラペチーノ',   imageId: 166, hp: 180, phy: 56, int: 18, agi: 32 },
  bagel_s:          { name: 'ベーグル ショート',                 imageId: 181, hp: 90,  phy: 14, int: 22, agi: 10 },
  bagel_t:          { name: 'ベーグル トール',                   imageId: 182, hp: 110, phy: 18, int: 28, agi: 12 },
  bagel_v:          { name: 'ベーグル ヴェンティ',               imageId: 184, hp: 130, phy: 22, int: 34, agi: 14 },
};

export const EXTENSIONS = {
  novice_blade:  { id: 1001, name: 'ノービスブレード', stat: 'phy', value: 8,  desc: '初心者向けの剣' },
  novice_katana: { id: 1006, name: 'ノービスカタナ',   stat: 'phy', value: 10, desc: '基本的な刀' },
  novice_shield: { id: 1010, name: 'ノービスシールド', stat: 'maxHp', value: 30, desc: '初心者向けの盾' },
  yumi:          { id: 1013, name: 'ユミ',             stat: 'agi', value: 12, desc: '和弓' },
  cross_spear:   { id: 1014, name: 'クロススピア',     stat: 'phy', value: 12, desc: '十字槍' },
  halberd:       { id: 1015, name: 'ハルバード',       stat: 'phy', value: 15, desc: '薙刀' },
  kabuto:        { id: 1018, name: 'カブト',           stat: 'maxHp', value: 40, desc: '兜' },
  tiger:         { id: 1021, name: 'タイガー',         stat: 'phy', value: 14, desc: '虎の爪飾り' },
  dragon:        { id: 1022, name: 'ドラゴン',         stat: 'int', value: 14, desc: '龍の護符' },
  sensu:         { id: 1032, name: 'センス',           stat: 'int', value: 10, desc: '扇子' },
  boots:         { id: 1031, name: 'ブーツ',           stat: 'agi', value: 10, desc: '素早さの靴' },
  rapier:        { id: 1028, name: 'レイピア',         stat: 'agi', value: 12, desc: '細剣' },
};

export const ITEMS = {
  potion:     { id: 'potion',     name: '回復薬',     type: 'heal',     value: 60,  desc: 'HPを60回復' },
  hi_potion:  { id: 'hi_potion',  name: '高級回復薬', type: 'heal',     value: 150, desc: 'HPを150回復' },
  ether:      { id: 'ether',      name: 'エーテル',   type: 'cd_reset', value: 1,   desc: 'スキルCTを全てリセット' },
};

export const SWARM_ENEMY_IDS = [101, 102, 103, 104, 105, 106, 111, 112, 113, 114, 115, 116];

export const STAGE_NODES = [
  {
    id: 'landing', name: '落下地点', type: 'story', x: 50, y: 88,
    desc: '不思議な空間から落下した場所',
    icon: '🌀',
  },
  {
    id: 'first_clash', name: '初戦', type: 'battle', x: 50, y: 76,
    desc: '周囲の魔物との最初の戦い',
    icon: '⚔',
    enemies: ['creeper_s', 'creeper_s', 'creeper_t'],
    xpReward: 30, reward: { type: 'extension', key: 'novice_blade' },
  },
  {
    id: 'camp', name: '西軍の陣', type: 'camp', x: 50, y: 64,
    desc: '石田三成率いる西軍の陣地',
    icon: '🏕',
    recruit: 'kaihime',
  },
  {
    id: 'forest1', name: '森の小道', type: 'battle', x: 35, y: 52,
    desc: '関ヶ原へ続く森の道',
    icon: '⚔',
    enemies: ['elk_s', 'elk_t', 'elk_s', 'melissa_s'],
    xpReward: 40, reward: { type: 'extension', key: 'novice_katana' },
  },
  {
    id: 'shrine', name: '古祠', type: 'treasure', x: 68, y: 52,
    desc: '道沿いにある古い祠',
    icon: '⛩',
    reward: { type: 'extension', key: 'kabuto' },
    itemReward: { key: 'hi_potion', qty: 2 },
  },
  {
    id: 'forest2', name: '森の奥', type: 'battle', x: 50, y: 40,
    desc: '東軍の偵察兵が潜む深い森',
    icon: '⚔',
    enemies: ['heart_s', 'heart_t', 'melissa_t', 'elk_g'],
    xpReward: 55, reward: { type: 'item', key: 'potion', qty: 3 },
  },
  {
    id: 'riverside', name: '川辺', type: 'battle', x: 50, y: 28,
    desc: '関ヶ原手前の川',
    icon: '⚔',
    recruit: 'ranmaru',
    enemies: ['bandit_s', 'bandit_t', 'melissa_g'],
    xpReward: 65, reward: { type: 'extension', key: 'cross_spear' },
  },
  {
    id: 'enemy_line', name: '敵陣前', type: 'battle', x: 50, y: 16,
    desc: '東軍の前線が見える',
    icon: '⚔',
    enemies: ['bandit_v', 'bandit_t', 'elk_v', 'bagel_t'],
    xpReward: 80, reward: { type: 'extension', key: 'halberd' },
    itemReward: { key: 'ether', qty: 1 },
  },
  {
    id: 'sekigahara', name: '関ヶ原', type: 'boss', x: 50, y: 4,
    desc: '天下分け目の決戦場',
    icon: '👑',
    waves: [
      ['elk_f', 'creeper_v', 'creeper_v'],
      ['bandit_f', 'bagel_v', 'melissa_f'],
    ],
    xpReward: 150, reward: { type: 'extension', key: 'tiger' },
  },
];

export const NODE_CONNECTIONS = [
  ['landing', 'first_clash'],
  ['first_clash', 'camp'],
  ['camp', 'forest1'],
  ['camp', 'shrine'],
  ['forest1', 'forest2'],
  ['shrine', 'forest2'],
  ['forest2', 'riverside'],
  ['riverside', 'enemy_line'],
  ['enemy_line', 'sekigahara'],
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
    { speaker: '', text: '痛っ・・・' },
    { speaker: '', text: 'ここは・・・草原？\nさっきまで空にいたはずじゃ・・・' },
  ],
  scene2_enemies: [
    { speaker: '', text: '！？' },
    { speaker: '', text: '何だこいつら・・・！？\n周りにいっぱいいる・・・！' },
    { speaker: '', text: 'こっち来てる！　まずい・・・！' },
  ],
  scene3_mitsunari: [
    { speaker: '？？？', text: '待たれよ！' },
    { speaker: '石田三成', text: 'そこの者！　無事か！？', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'ここは関ヶ原の戦場だ。\nうろたえている場合ではない！', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '見たところ・・・戦えるようだな。\n共に戦おう！', portrait: 'mitsunari' },
  ],
  first_clash_intro: [
    { speaker: '石田三成', text: 'まずはこの目の前の敵を片付けるぞ。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '敵をタップして狙いを定めろ！\n落ち着いて戦えば問題ない。', portrait: 'mitsunari' },
  ],
  first_clash_victory: [
    { speaker: '石田三成', text: 'やるな！　なかなかの腕だ。', portrait: 'mitsunari' },
    { speaker: '', text: '（剣を拾った・・・ノービスブレード）' },
    { speaker: '石田三成', text: '陣に戻ろう。仲間に紹介したい者がいる。', portrait: 'mitsunari' },
  ],
  camp_intro: [
    { speaker: '石田三成', text: 'ここが我が軍の陣だ。\n少し休んで行くといい。', portrait: 'mitsunari' },
    { speaker: '？？？', text: '三成殿！　無事でしたか！' },
    { speaker: '石田三成', text: 'ああ。この者に助けられた。\n甲斐姫、お主も力を貸してくれ。', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: 'わかりました！\n私の剣技、お役に立てましょう！', portrait: 'kaihime' },
    { speaker: '', text: '甲斐姫が仲間になった！' },
    { speaker: '', text: '（陣地で全員のHPが回復した）' },
  ],
  forest1_intro: [
    { speaker: '石田三成', text: 'この森を抜ければ関ヶ原だ。\n敵の偵察兵に警戒しろ。', portrait: 'mitsunari' },
  ],
  shrine_intro: [
    { speaker: '甲斐姫', text: 'あの祠・・・何かありそうですね。', portrait: 'kaihime' },
    { speaker: '', text: '祠の中を調べた。' },
    { speaker: '', text: '古い兜を見つけた！（カブト）' },
    { speaker: '', text: '高級回復薬を2個手に入れた！' },
    { speaker: '石田三成', text: 'いい装備だ。これは使えそうだな。', portrait: 'mitsunari' },
  ],
  forest2_intro: [
    { speaker: '甲斐姫', text: '敵の気配が濃くなってきました・・・', portrait: 'kaihime' },
    { speaker: '石田三成', text: '東軍の偵察部隊だろう。油断するな。', portrait: 'mitsunari' },
  ],
  riverside_intro: [
    { speaker: '', text: '川辺に着いた。向こう岸に人影が見える。' },
    { speaker: '？？？', text: '待ってくれ！　敵ではない！' },
    { speaker: '森蘭丸', text: '拙者は森蘭丸。\n東軍の急襲から逃れてきた。', portrait: 'ranmaru' },
    { speaker: '森蘭丸', text: 'この先、敵の部隊がいる。\n共に戦わせてほしい！', portrait: 'ranmaru' },
    { speaker: '', text: '森蘭丸が仲間になった！' },
  ],
  riverside_victory: [
    { speaker: '森蘭丸', text: '助かった・・・感謝する。', portrait: 'ranmaru' },
    { speaker: '石田三成', text: 'あとは前線を突破するのみだ。', portrait: 'mitsunari' },
  ],
  enemy_line_intro: [
    { speaker: '石田三成', text: '見えるか。あれが東軍の前線だ。', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: '敵の数が多い・・・覚悟を決めましょう。', portrait: 'kaihime' },
    { speaker: '森蘭丸', text: '拙者に任せてください。', portrait: 'ranmaru' },
  ],
  enemy_line_victory: [
    { speaker: '石田三成', text: 'よし！　前線を突破した！', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'いよいよ関ヶ原だ。\n決戦の時が来た！', portrait: 'mitsunari' },
  ],
  sekigahara_intro: [
    { speaker: '石田三成', text: 'これが・・・天下分け目の戦い。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: '覚悟はいいか。\n我らの力、見せてやろう！', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: '参りましょう！', portrait: 'kaihime' },
    { speaker: '森蘭丸', text: '全力で戦います！', portrait: 'ranmaru' },
  ],
  sekigahara_wave2: [
    { speaker: '石田三成', text: '第二陣が来るぞ！　気を抜くな！', portrait: 'mitsunari' },
  ],
  sekigahara_victory: [
    { speaker: '', text: '・・・静寂が戦場を包んだ。' },
    { speaker: '石田三成', text: 'やったぞ・・・！　我らの勝利だ！', portrait: 'mitsunari' },
    { speaker: '甲斐姫', text: 'やりましたね！', portrait: 'kaihime' },
    { speaker: '森蘭丸', text: 'お見事です・・・！', portrait: 'ranmaru' },
    { speaker: '石田三成', text: 'お主のおかげだ。\n・・・ところで、お主は一体何者なのだ？', portrait: 'mitsunari' },
    { speaker: '', text: '（石田三成、甲斐姫、森蘭丸・・・\nここは本当に関ヶ原なのか？）' },
    { speaker: '', text: '（なぜ自分はここにいるのだろう？\nそして・・・あの空から落ちてきた記憶は・・・）' },
    { speaker: '石田三成', text: '答えは急がずともよい。\nお主は我らの仲間だ。', portrait: 'mitsunari' },
    { speaker: '石田三成', text: 'だが・・・この戦いは始まりに過ぎぬ。\nもっと大きな戦いが待っている気がする。', portrait: 'mitsunari' },
    { speaker: '', text: 'こうして、時空を超えた冒険の第一章が幕を閉じた——' },
  ],
  chapter_complete: [
    { speaker: '', text: '第一章「関ヶ原の戦い」——完' },
  ],
};
