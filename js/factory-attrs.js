/* ============================================================
   factory-attrs.js — 士農工商属性計算 (mycryptofactory参考)
   ============================================================ */

import { HEROES } from './constants.js';

// MCH原データから士農工商スコアを計算
// 士=PHY×1.0, 農=HP×0.3, 商=INT×0.7, 工=AGI×0.7
export function calcAttrs(heroKey) {
  const def = HEROES[heroKey];
  if (!def || !def.mchStats) return { shi: 0, nou: 0, sho: 0, kou: 0, primary: 'shi' };
  const m = def.mchStats;
  const shi = Math.round(m.phy * 1.0);
  const nou = Math.round(m.hp * 0.3);
  const sho = Math.round(m.int * 0.7);
  const kou = Math.round(m.agi * 0.7);
  // 主属性
  const scores = { shi, nou, sho, kou };
  const primary = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { shi, nou, sho, kou, primary };
}

export const ATTR_LABEL = {
  shi: { name: '士', desc: '兵士強化', color: '#ff6644', icon: '⚔', resource: 'soldiers' },
  nou: { name: '農', desc: '農業（食材）', color: '#5ecf8a', icon: '🌾', resource: 'food' },
  sho: { name: '商', desc: '商い（金）', color: '#ffd700', icon: '💰', resource: 'gold' },
  kou: { name: '工', desc: '探索（素材）', color: '#56ccf2', icon: '⚒', resource: 'materials' },
};

// 配属生産: 主属性なら ×1.5 ボーナス、それ以外でもスコア分は貢献
export function calcProduction(heroKey, taskAttr) {
  const a = calcAttrs(heroKey);
  const score = a[taskAttr] || 0;
  const bonus = a.primary === taskAttr ? 1.5 : 1.0;
  return Math.floor(score * bonus * 0.18); // 0.18でターン辺りの生産量を調整
}
