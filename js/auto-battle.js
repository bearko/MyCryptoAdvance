/* ============================================================
   auto-battle.js — 自動進行戦闘
   ヒーローレベル/難易度から成功率を算出し、報酬を最低限付与
   ============================================================ */

import { partyState } from './state.js';

export function calcSuccessRate(squadIds, terrId, terrDifficulty, coalitionCount = 1) {
  // 編成全員の平均レベル × 編成人数補正
  let totalLv = 0;
  let totalHeroes = 0;
  for (const sid of squadIds) {
    const s = partyState.getSquad(sid);
    if (!s) continue;
    for (const h of s.heroes) {
      totalLv += partyState.getHeroLevel(h);
      totalHeroes++;
    }
  }
  if (totalHeroes === 0) return 0;
  const avgLv = totalLv / totalHeroes;
  // 基準: avgLv=5, difficulty=2で50%
  let base = 0.30 + (avgLv - 1) * 0.06;
  // 難易度ペナルティ
  base -= (terrDifficulty - 1) * 0.08;
  // 連合バフ
  if (coalitionCount > 1) base += 0.20;
  // 編成サイズボーナス: 3人なら+5%
  if (totalHeroes >= 5) base += 0.10;
  return Math.max(0.10, Math.min(0.95, base));
}

export function runAutoBattle(squadIds, terr, isCoalition) {
  const successRate = calcSuccessRate(squadIds, terr.id, terr.difficulty || 1, isCoalition ? 2 : 1);
  const roll = Math.random();
  const victory = roll < successRate;
  const coaMul = isCoalition ? 1.3 : 1.0;
  let totalHeroes = 0;
  for (const sid of squadIds) {
    const s = partyState.getSquad(sid);
    if (s) totalHeroes += s.heroes.length;
  }
  // 最低限の結果
  if (victory) {
    return {
      victory: true,
      kills: Math.floor((20 + totalHeroes * 5) * coaMul),
      time: 120,
      maxCombo: 5,
      bonusXp: Math.floor((40 + totalHeroes * 15) * coaMul),
      reachedPhase: 2,
      auto: true,
      successRate,
      isCoalition,
    };
  }
  return {
    victory: false,
    kills: Math.floor(10 + totalHeroes * 2),
    time: 60,
    maxCombo: 2,
    bonusXp: Math.floor(15 + totalHeroes * 5),
    reachedPhase: 1,
    auto: true,
    successRate,
    isCoalition,
  };
}
