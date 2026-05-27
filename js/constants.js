/* ============================================================
   constants.js — asset URLs, game data, configuration
   ============================================================ */

const ASSET_BASE = 'https://raw.githubusercontent.com/bearko/mycryptoheroes/main';

export const ASSETS = {
  hero: (id) => `${ASSET_BASE}/Image/Heroes/${id}.png`,
  enemy: (id) => `${ASSET_BASE}/Image/Enemies/${id}.png`,
  background: (id) => `${ASSET_BASE}/Image/Backgrounds/${id}.png`,
};

export const PLAYER = {
  id: 'player',
  name: '？？？',
  imageId: 12001,
  maxHp: 120,
  hp: 120,
  phy: 35,
  int: 20,
  agi: 30,
  skills: [
    { name: '斬撃', type: 'attack', power: 1.0, desc: '剣で斬りつける' },
    { name: '強撃', type: 'attack', power: 1.5, cost: 1, desc: '渾身の一撃', cooldown: 0 },
  ],
};

export const MITSUNARI = {
  id: 'mitsunari',
  name: '石田三成',
  imageId: 2012,
  maxHp: 246,
  hp: 246,
  phy: 79,
  int: 116,
  agi: 63,
  skills: [
    { name: '采配', type: 'attack', power: 1.2, desc: '大一大万大吉の采配' },
    { name: '義の一閃', type: 'attack', power: 1.8, cost: 1, desc: '正義を貫く一撃', cooldown: 0 },
  ],
};

export const ENEMIES_DATA = [
  { id: 'enemy1', name: 'クリーパー', imageId: 101, maxHp: 45, hp: 45, phy: 12, int: 8, agi: 10 },
  { id: 'enemy2', name: 'ゴブリン',   imageId: 102, maxHp: 55, hp: 55, phy: 15, int: 6, agi: 14 },
  { id: 'enemy3', name: 'スライム',   imageId: 103, maxHp: 35, hp: 35, phy: 10, int: 10, agi: 8 },
  { id: 'enemy4', name: 'バット',     imageId: 104, maxHp: 30, hp: 30, phy: 8, int: 12, agi: 18 },
  { id: 'enemy5', name: 'ゴースト',   imageId: 105, maxHp: 50, hp: 50, phy: 14, int: 16, agi: 12 },
];

export const SWARM_ENEMIES = [101, 102, 103, 104, 105, 106, 111, 112, 113, 114, 115, 116];

export const SCENE1_DIALOGUE = [
  { speaker: '', text: '・・・' },
  { speaker: '', text: 'なんだ　ここ？' },
  { speaker: '', text: 'え　落ちてる？　空！？' },
  { speaker: '', text: 'うわーーーー！！' },
];

export const SCENE2_DIALOGUE = [
  { speaker: '', text: '・・・・・・' },
  { speaker: '', text: '痛っ・・・' },
  { speaker: '', text: 'ここは・・・草原？\nさっきまで空にいたはずじゃ・・・' },
  { speaker: '', text: '！？' },
  { speaker: '', text: '何だこいつら・・・！？\n周りにいっぱいいる・・・！' },
  { speaker: '', text: 'こっち来てる！\nまずい・・・！' },
];

export const SCENE3_DIALOGUE = [
  { speaker: '？？？', text: '待たれよ！' },
  { speaker: '石田三成', text: 'そこの者！　無事か！？' },
  { speaker: '石田三成', text: 'ここは関ヶ原の戦場だ。\nうろたえている場合ではない！' },
  { speaker: '石田三成', text: '見たところ・・・戦えるようだな。\n共に戦おう！' },
];

export const VICTORY_DIALOGUE = [
  { speaker: '石田三成', text: 'やったか・・・。\nなかなかやるではないか。' },
  { speaker: '石田三成', text: 'お主、名は何と申す？\n見慣れぬ身なりだが・・・' },
  { speaker: '', text: '（石田三成・・・？\n関ヶ原・・・ここは一体・・・）' },
  { speaker: '石田三成', text: 'まあよい。\nまずはこの戦を生き延びるのが先だ。' },
  { speaker: '石田三成', text: '我と共に来い。\nお主の力、借りるぞ。' },
  { speaker: '', text: 'こうして、時を超えた冒険が始まった——' },
];
