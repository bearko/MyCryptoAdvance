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
    // 施設レベル: 各施設のレベル（次回ターン時に効果適用）
    this.facilities = { dojo: 0, market: 0, farm: 0, smith: 0 };
    // 最後のターンイベント（リザルト表示用）
    this.lastEvent = null;
  }

  addHero(heroKey) {
    if (!this.members.find(m => m.heroKey === heroKey)) {
      this.members.push({ heroKey, level: 1, xp: 0 });
      // 新規仲間は自動で出陣編成に組み込む（5枠まで、playerは除外）
      if (heroKey !== 'player' && this.deploy.length < 5 && !this.deploy.includes(heroKey)) {
        this.deploy.push(heroKey);
      }
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

  // 戦評価: kills/combo/timeに基づくランク
  evaluateBattle(kills, maxCombo, timeSec) {
    let score = 0;
    if (kills >= 200) score += 3; else if (kills >= 100) score += 2; else if (kills >= 50) score += 1;
    if (maxCombo >= 80) score += 3; else if (maxCombo >= 40) score += 2; else if (maxCombo >= 20) score += 1;
    if (timeSec <= 180) score += 3; else if (timeSec <= 300) score += 2; else if (timeSec <= 480) score += 1;
    const ranks = [
      { rank: 'D', mul: 1.0 },
      { rank: 'C', mul: 1.1 },
      { rank: 'B', mul: 1.25 },
      { rank: 'A', mul: 1.4 },
      { rank: 'S', mul: 1.6 },
      { rank: 'S+', mul: 1.8 },
      { rank: 'SS', mul: 2.0 },
      { rank: 'SSS', mul: 2.5 },
    ];
    const idx = Math.min(score, ranks.length - 1);
    return ranks[idx];
  }

  // ステージクリア時の報酬計算 + 配布
  awardStageRewards(kills, timeSec, territoryBonus = {}, maxCombo = 0) {
    const battleRank = this.evaluateBattle(kills, maxCombo, timeSec);
    const mul = battleRank.mul;
    const xpAward = Math.floor((80 + kills * 1.5) * mul);
    const goldAward = Math.floor((40 + kills * 0.6) * mul) + (territoryBonus.gold || 0);
    const materialAward = (territoryBonus.materials || 0) + Math.floor(kills * 0.1 * mul);
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
      battleRank,
    };
  }

  // 内政: 1ターン進行
  advanceTurn(productions) {
    this.turn++;
    // 施設ボーナス
    const fac = this.facilities;
    if (fac.dojo > 0) productions.soldiers = (productions.soldiers || 0) + fac.dojo * 3;
    if (fac.market > 0) productions.gold = (productions.gold || 0) + fac.market * 5;
    if (fac.farm > 0) productions.food = (productions.food || 0) + fac.farm * 5;
    if (fac.smith > 0) productions.materials = (productions.materials || 0) + fac.smith * 3;

    // productions = { gold, food, materials, soldiers }
    for (const k of Object.keys(productions)) {
      this.resources[k] = (this.resources[k] || 0) + (productions[k] || 0);
    }
    // 兵糧消費: 兵士数×0.05 / ターン
    const foodCost = Math.ceil((this.resources.soldiers || 0) * 0.05);
    this.resources.food = Math.max(0, this.resources.food - foodCost);
    // 兵糧不足は兵士が減る
    let starvation = 0;
    if (this.resources.food === 0 && foodCost > 0) {
      starvation = 5;
      this.resources.soldiers = Math.max(0, this.resources.soldiers - starvation);
    }

    // ランダムイベント
    const event = this._rollEvent();
    this.lastEvent = event;
    if (event) {
      const e = event.effect;
      if (e.gold) this.resources.gold = Math.max(0, this.resources.gold + e.gold);
      if (e.food) this.resources.food = Math.max(0, this.resources.food + e.food);
      if (e.materials) this.resources.materials = Math.max(0, this.resources.materials + e.materials);
      if (e.soldiers) this.resources.soldiers = Math.max(0, this.resources.soldiers + e.soldiers);
    }

    return { productions, foodCost, starvation, event };
  }

  _rollEvent() {
    if (Math.random() > 0.45) return null; // 45%でイベント発生
    const events = [
      { id: 'harvest', name: '豊作', desc: '今期は豊作だった！', effect: { food: 60 }, weight: 4 },
      { id: 'merchant', name: '商隊到着', desc: '異国の商隊が訪れた。', effect: { gold: 50, materials: 20 }, weight: 3 },
      { id: 'recruit', name: '志願兵', desc: '志願兵が集まった。', effect: { soldiers: 15 }, weight: 4 },
      { id: 'mine', name: '鉱脈発見', desc: '鉱脈が発見された！', effect: { materials: 40 }, weight: 2 },
      { id: 'drought', name: '日照り', desc: '日照りで作物が枯れた…', effect: { food: -40 }, weight: 3 },
      { id: 'raid', name: '盗賊襲来', desc: '盗賊に襲われた！', effect: { gold: -30, soldiers: -5 }, weight: 2 },
      { id: 'fortune', name: '思わぬ授かりもの', desc: '埋蔵金を発見！', effect: { gold: 100 }, weight: 1 },
    ];
    const totalWeight = events.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    for (const e of events) {
      r -= e.weight;
      if (r <= 0) return e;
    }
    return events[0];
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

  // 特訓: 金を払ってXP付与
  trainHero(heroKey, xpAmount) {
    const m = this.getMember(heroKey);
    if (!m) return null;
    const before = { level: m.level, xp: m.xp, xpToNext: xpToNextLevel(m.level) };
    let remaining = xpAmount;
    let curLevel = m.level;
    let curXp = m.xp;
    let curMax = xpToNextLevel(curLevel);
    let levelsGained = 0;
    while (remaining > 0) {
      const space = curMax - curXp;
      if (remaining < space) {
        curXp += remaining;
        remaining = 0;
      } else {
        remaining -= space;
        curLevel++;
        curXp = 0;
        curMax = xpToNextLevel(curLevel);
        levelsGained++;
      }
    }
    m.level = curLevel;
    m.xp = curXp;
    return { before, after: { level: m.level, xp: m.xp, xpToNext: xpToNextLevel(m.level) }, levelsGained };
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
