/* ============================================================
   state.js — 永続パーティー状態とステージ報酬
   ============================================================ */

import { xpToNextLevel } from './constants.js';

// 永続パーティー: 仲間ヒーローのレベル/経験値とお金
class PartyState {
  constructor() {
    this.reset();
  }

  reset() {
    this.members = []; // [{ heroKey, level, xp }]
    this.money = 0;
  }

  addHero(heroKey) {
    if (!this.members.find(m => m.heroKey === heroKey)) {
      this.members.push({ heroKey, level: 1, xp: 0 });
    }
  }

  hasHero(heroKey) {
    return !!this.members.find(m => m.heroKey === heroKey);
  }

  getHeroLevel(heroKey) {
    const m = this.members.find(m => m.heroKey === heroKey);
    return m ? m.level : 1;
  }

  getMember(heroKey) {
    return this.members.find(m => m.heroKey === heroKey);
  }

  // ステージクリア時の報酬計算 + 配布
  // 戻り値: 各メンバーの before/after 状態（リザルト演出用）
  awardStageRewards(kills, timeSec) {
    const xpAward = Math.floor(100 + kills * 1.5);
    const moneyAward = Math.floor(50 + kills * 0.8);
    this.money += moneyAward;

    const snapshots = [];
    for (const m of this.members) {
      const before = { level: m.level, xp: m.xp, xpToNext: xpToNextLevel(m.level) };
      const events = []; // [{type: 'xp', from, to, max}, {type: 'levelup', newLevel}]

      let remaining = xpAward;
      let curLevel = m.level;
      let curXp = m.xp;
      let curMax = xpToNextLevel(curLevel);

      while (remaining > 0) {
        const space = curMax - curXp;
        if (remaining < space) {
          events.push({ type: 'xp', from: curXp, to: curXp + remaining, max: curMax, level: curLevel });
          curXp += remaining;
          remaining = 0;
        } else {
          events.push({ type: 'xp', from: curXp, to: curMax, max: curMax, level: curLevel });
          remaining -= space;
          curLevel++;
          curXp = 0;
          curMax = xpToNextLevel(curLevel);
          events.push({ type: 'levelup', newLevel: curLevel });
        }
      }

      m.level = curLevel;
      m.xp = curXp;
      snapshots.push({
        heroKey: m.heroKey,
        before,
        after: { level: m.level, xp: m.xp, xpToNext: xpToNextLevel(m.level) },
        events,
        leveledUp: m.level > before.level,
        levelsGained: m.level - before.level,
      });
    }

    return { xpAward, moneyAward, snapshots, money: this.money };
  }
}

export const partyState = new PartyState();
