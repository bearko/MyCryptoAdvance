/* ============================================================
   state.js — 永続パーティー + 内政資源 + 領地状態
   ============================================================ */

import { xpToNextLevel } from './constants.js';
import { calcProduction, ATTR_LABEL } from './factory-attrs.js';

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
    // ターン (週)
    this.turn = 1;
    // カレンダー（日単位）
    this.day = 1; // 累積日数
    // 編成: 1-3名のヒーローで構成
    // [{ id, heroes:[heroKey...], location:terrId, destination:terrId|null, daysRemaining:0, status:'idle'|'traveling'|'arrived' }]
    this.squads = [];
    this.nextSquadId = 1;
    // 装備: { heroKey: extKey }
    this.equipment = { player: 'novice_katana' };
    // 進捗ログ
    this.log = [];
    // 政務割り当て
    this.taskAssignments = {}; // { heroKey: 'shi'|'nou'|'sho'|'kou' }
    // 施設レベル
    this.facilities = { dojo: 0, market: 0, farm: 0, smith: 0 };
    // 最後のターンイベント
    this.lastEvent = null;
    // 到着待ち（伝令キュー: 手動戦闘の到着）
    this.arrivalQueue = []; // [{ squadId, terrId }]
    // 自動戦闘完了キュー
    this.autoBattleQueue = []; // [{ squadId, terrId }]
    // 内政自動処理キュー
    this.weeklyAffairsDue = false;
  }

  addHero(heroKey) {
    if (!this.members.find(m => m.heroKey === heroKey)) {
      this.members.push({ heroKey, level: 1, xp: 0 });
      // 新規仲間は自動で空きのある編成に追加（3名上限）
      this._autoAssignToSquad(heroKey);
    }
  }

  _autoAssignToSquad(heroKey) {
    // 既にどこかの編成に居る
    if (this.squads.some(s => s.heroes.includes(heroKey))) return;
    // 編成が無ければ作成
    if (this.squads.length === 0) {
      this.squads.push({
        id: this._nextSquadId(),
        heroes: [heroKey],
        location: 'home_camp',
        destination: null,
        daysRemaining: 0,
        status: 'idle',
      });
      return;
    }
    // 1) playerが居る編成を最優先で合流（地理的に出会った相手）
    const playerSquad = this.getPlayerSquad();
    if (playerSquad && playerSquad.heroes.length < 3 && playerSquad.status === 'idle') {
      playerSquad.heroes.push(heroKey);
      return;
    }
    // 2) 同じ場所(playerSquadのlocation)の空き編成
    const playerLoc = playerSquad ? playerSquad.location : 'home_camp';
    const target = this.squads.find(s => s.heroes.length < 3 && s.status === 'idle' && s.location === playerLoc);
    if (target) {
      target.heroes.push(heroKey);
      return;
    }
    // 3) 新編成（playerSquadと同じ場所、なければhome_camp）
    this.squads.push({
      id: this._nextSquadId(),
      heroes: [heroKey],
      location: playerLoc,
      destination: null,
      daysRemaining: 0,
      status: 'idle',
    });
  }

  // 編成の場所を更新（戦闘勝利後等）
  moveSquadTo(squadId, terrId) {
    const s = this.getSquad(squadId);
    if (s) {
      s.location = terrId;
      s.destination = null;
      s.daysRemaining = 0;
      s.status = 'idle';
    }
  }

  _nextSquadId() {
    return `squad_${this.nextSquadId++}`;
  }

  // 編成系ヘルパー
  getSquad(squadId) { return this.squads.find(s => s.id === squadId); }
  getPlayerSquad() { return this.squads.find(s => s.heroes.includes('player')); }
  getSquadsAt(terrId) { return this.squads.filter(s => s.location === terrId && s.status !== 'traveling'); }
  getTravelingSquads() { return this.squads.filter(s => s.status === 'traveling'); }
  getSquadsTargeting(terrId) { return this.squads.filter(s => s.destination === terrId); }

  moveHeroToSquad(heroKey, squadId) {
    // 旅行中編成は触れない
    const cur = this.squads.find(s => s.heroes.includes(heroKey));
    const dst = this.squads.find(s => s.id === squadId);
    if (!cur || !dst || cur === dst) return false;
    if (cur.status === 'traveling' || dst.status === 'traveling') return false;
    if (dst.heroes.length >= 3) return false;
    // 同じ拠点にいないと移動不可
    if (cur.location !== dst.location) return false;
    cur.heroes = cur.heroes.filter(h => h !== heroKey);
    dst.heroes.push(heroKey);
    // 空編成は削除（player編成は残す）
    if (cur.heroes.length === 0 && !cur.heroes.includes('player')) {
      this.squads = this.squads.filter(s => s.id !== cur.id);
    }
    return true;
  }

  createSquadAt(location) {
    const s = {
      id: this._nextSquadId(),
      heroes: [],
      location,
      destination: null,
      daysRemaining: 0,
      status: 'idle',
    };
    this.squads.push(s);
    return s;
  }

  removeSquad(squadId) {
    const s = this.getSquad(squadId);
    if (!s) return;
    // 兵を解散して他の編成に吸収
    for (const h of s.heroes) {
      this._autoAssignToSquadExcluding(h, squadId);
    }
    this.squads = this.squads.filter(x => x.id !== squadId);
  }

  _autoAssignToSquadExcluding(heroKey, excludeId) {
    const target = this.squads.find(s => s.id !== excludeId && s.heroes.length < 3 && s.status === 'idle');
    if (target) target.heroes.push(heroKey);
  }

  dispatchSquad(squadId, destinationTerrId, days, battleMode = 'manual') {
    const s = this.getSquad(squadId);
    if (!s || s.status === 'traveling' || s.heroes.length === 0) return false;
    s.destination = destinationTerrId;
    s.daysRemaining = days;
    s.totalTravelDays = days; // 進捗計算用
    s.battleMode = battleMode; // 'auto' or 'manual'
    s.status = 'traveling';
    return true;
  }

  // 1日進める
  tickDay() {
    this.day++;
    // 旅行中・戦闘中の編成を進める
    for (const s of this.squads) {
      if (s.status === 'traveling') {
        s.daysRemaining--;
        if (s.daysRemaining <= 0) {
          s.location = s.destination;
          s.destination = null;
          s.daysRemaining = 0;
          s.totalTravelDays = 0;
          // 既に制圧済みなら戦闘なしで駐留
          if (this.isTerritoryConquered(s.location)) {
            s.status = 'idle';
          } else if (s.battleMode === 'auto') {
            // 自動戦闘モード: 戦闘期間に入る
            s.status = 'fighting';
            s.fightDaysRemaining = 3; // 3日かかる
            s.fightTotalDays = 3;
          } else {
            // 手動戦闘モード: 伝令キューに登録（プレイヤー指示待ち）
            s.status = 'arrived';
            this.arrivalQueue.push({ squadId: s.id, terrId: s.location });
          }
        }
      } else if (s.status === 'fighting') {
        s.fightDaysRemaining--;
        if (s.fightDaysRemaining <= 0) {
          // 自動戦闘解決待ちキューに登録（重複防止のためstatusを'resolving'に）
          s.status = 'resolving';
          s.fightDaysRemaining = 0;
          this.autoBattleQueue.push({ squadId: s.id, terrId: s.location });
        }
      }
    }
    // 週開始判定 (day=1,8,15... = week start, 内政適用)
    if ((this.day - 1) % 7 === 0 && this.day > 1) {
      this.weeklyAffairsDue = true;
    }
  }

  isWeekStart() {
    return this.weeklyAffairsDue;
  }

  consumeWeekStart() {
    this.weeklyAffairsDue = false;
  }

  // 7日進める = 1週進める (手動用)
  advanceWeek() {
    for (let i = 0; i < 7; i++) this.tickDay();
  }

  // 政務割当から自動生産量を計算
  calcAutoProductions() {
    const prod = { gold: 0, food: 0, materials: 0, soldiers: 0 };
    for (const [heroKey, task] of Object.entries(this.taskAssignments)) {
      if (!this.hasHero(heroKey)) continue;
      const amount = calcProduction(heroKey, task);
      const resource = ATTR_LABEL[task].resource;
      prod[resource] += amount;
    }
    return prod;
  }

  // 派遣後、編成が制圧成功した場合の状態更新
  setSquadIdle(squadId) {
    const s = this.getSquad(squadId);
    if (s) s.status = 'idle';
  }

  // 編成全員のレベル平均
  getSquadAvgLevel(squadId) {
    const s = this.getSquad(squadId);
    if (!s || s.heroes.length === 0) return 1;
    const sum = s.heroes.reduce((acc, h) => acc + this.getHeroLevel(h), 0);
    return sum / s.heroes.length;
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
  // bonusXp: 敵tier・フェーズベースで蓄積された撃破XP合計
  awardStageRewards(kills, timeSec, territoryBonus = {}, maxCombo = 0, bonusXp = 0) {
    const battleRank = this.evaluateBattle(kills, maxCombo, timeSec);
    const mul = battleRank.mul;
    // 基礎XP は控えめに（雑魚ばかり倒しても伸びない）。bonusXpが質的成長。
    // bonusXpは敵Tier×フェーズ倍率の累積。0.2倍に抑え過剰レベルアップを防止。
    const baseXp = Math.floor((30 + kills * 0.4) * mul);
    const xpAward = baseXp + Math.floor(bonusXp * mul * 0.2);
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
}

export const partyState = new PartyState();
