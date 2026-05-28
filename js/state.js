/* ============================================================
   state.js — 永続パーティー + 内政資源 + 領地状態
   ============================================================ */

import { xpToNextLevel } from './constants.js';

class PartyState {
  constructor() {
    this.reset();
  }

  reset() {
    this.members = []; // [{ heroKey, level, xp }]
    // 資源
    this.resources = { gold: 0, food: 200, materials: 50, soldiers: 100 };
    // 領地: { id, owner: 'player'|'enemy'|'neutral', conquered: bool }
    this.territories = {};
    // ターン (内政1回 = 1週)
    this.turn = 1;
    // 出陣編成: 戦闘時に連れていく仲間
    this.deploy = []; // [heroKey, heroKey, ...] (player除く)
    // 装備: { heroKey: extKey }
    this.equipment = { player: 'novice_katana' };
    // 進捗ログ
    this.log = [];
    // 待機（次回戦闘の準備度合い）
    this.taskAssignments = {}; // { heroKey: 'shi'|'nou'|'sho'|'kou' }
  }

  addHero(heroKey) {
    if (!this.members.find(m => m.heroKey === heroKey)) {
      this.members.push({ heroKey, level: 1, xp: 0 });
    }
  }

  removeHero(heroKey) {
    const i = this.members.findIndex(m => m.heroKey === heroKey);
    if (i >= 0) this.members.splice(i, 1);
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
  awardStageRewards(kills, timeSec, territoryBonus = {}) {
    const xpAward = Math.floor(80 + kills * 1.5);
    const goldAward = Math.floor(40 + kills * 0.6) + (territoryBonus.gold || 0);
    const materialAward = (territoryBonus.materials || 0) + Math.floor(kills * 0.1);
    const foodAward = (territoryBonus.food || 0);

    this.resources.gold += goldAward;
    this.resources.materials += materialAward;
    this.resources.food += foodAward;

    const snapshots = [];
    for (const m of this.members) {
      const before = { level: m.level, xp: m.xp, xpToNext: xpToNextLevel(m.level) };
      const events = [];

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

    return {
      xpAward, goldAward, materialAward, foodAward,
      snapshots,
      resources: { ...this.resources },
    };
  }

  // 内政: 1ターン進行
  advanceTurn(productions) {
    this.turn++;
    // productions = { gold, food, materials, soldiers }
    for (const k of Object.keys(productions)) {
      this.resources[k] = (this.resources[k] || 0) + (productions[k] || 0);
    }
    // 兵糧消費: 兵士数×0.05 / ターン
    const foodCost = Math.ceil((this.resources.soldiers || 0) * 0.05);
    this.resources.food = Math.max(0, this.resources.food - foodCost);
    // 兵糧不足は兵士が減る
    if (this.resources.food === 0 && foodCost > 0) {
      this.resources.soldiers = Math.max(0, this.resources.soldiers - 5);
    }
  }

  spendGold(amount) {
    if (this.resources.gold < amount) return false;
    this.resources.gold -= amount;
    return true;
  }

  spendMaterials(amount) {
    if (this.resources.materials < amount) return false;
    this.resources.materials -= amount;
    return true;
  }

  // 領地状態管理
  setTerritory(id, data) {
    this.territories[id] = { ...this.territories[id], ...data };
  }

  conquerTerritory(id) {
    this.setTerritory(id, { owner: 'player', conquered: true });
  }

  isTerritoryConquered(id) {
    return this.territories[id] && this.territories[id].conquered;
  }

  // 出陣編成
  toggleDeploy(heroKey) {
    const i = this.deploy.indexOf(heroKey);
    if (i >= 0) this.deploy.splice(i, 1);
    else if (this.deploy.length < 5) this.deploy.push(heroKey);
  }

  getDeployedHeroes() {
    return this.deploy.filter(k => this.hasHero(k));
  }
}

export const partyState = new PartyState();
