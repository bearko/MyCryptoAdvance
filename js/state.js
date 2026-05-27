/* ============================================================
   state.js — game state management (party, inventory, progress)
   ============================================================ */

import { HEROES, EXTENSIONS, ITEMS } from './constants.js';

class GameState {
  constructor() {
    this.party = [];
    this.inventory = [];
    this.equipment = {};
    this.completedNodes = [];
    this.currentNode = null;
    this.chapter = 1;
  }

  reset() {
    this.party = [];
    this.inventory = [
      { ...ITEMS.potion, qty: 3 },
    ];
    this.equipment = {};
    this.completedNodes = [];
    this.currentNode = null;
    this.chapter = 1;
  }

  addHero(heroKey) {
    const template = HEROES[heroKey];
    if (!template || this.party.find(h => h.id === template.id)) return null;
    const hero = {
      ...template,
      level: 1,
      xp: 0,
      xpToNext: 50,
      stats: { ...template.baseStats },
      equippedExt: null,
      cooldowns: {},
    };
    hero.stats.hp = hero.stats.maxHp;
    this.party.push(hero);
    return hero;
  }

  getHero(id) {
    return this.party.find(h => h.id === id);
  }

  addXp(amount) {
    const levelUps = [];
    for (const hero of this.party) {
      hero.xp += amount;
      while (hero.xp >= hero.xpToNext) {
        hero.xp -= hero.xpToNext;
        hero.level++;
        hero.xpToNext = hero.level * 50;
        const g = hero.growthRate;
        hero.stats.maxHp += g.maxHp;
        hero.stats.phy += g.phy;
        hero.stats.int += g.int;
        hero.stats.agi += g.agi;
        hero.stats.hp = hero.stats.maxHp;
        levelUps.push(hero);
      }
    }
    return levelUps;
  }

  healAll() {
    for (const hero of this.party) {
      hero.stats.hp = this.getMaxHp(hero);
    }
  }

  getMaxHp(hero) {
    let maxHp = hero.stats.maxHp;
    if (hero.equippedExt && hero.equippedExt.stat === 'maxHp') {
      maxHp += hero.equippedExt.value;
    }
    return maxHp;
  }

  getEffectiveStat(hero, stat) {
    let val = hero.stats[stat] || 0;
    if (hero.equippedExt && hero.equippedExt.stat === stat) {
      val += hero.equippedExt.value;
    }
    return val;
  }

  addExtension(extKey) {
    const ext = EXTENSIONS[extKey];
    if (!ext) return;
    this.inventory.push({ ...ext, type: 'extension', key: extKey });
  }

  addItem(itemKey, qty = 1) {
    const existing = this.inventory.find(i => i.id === itemKey);
    if (existing) {
      existing.qty += qty;
    } else {
      const item = ITEMS[itemKey];
      if (item) this.inventory.push({ ...item, qty, key: itemKey });
    }
  }

  useItem(itemId) {
    const idx = this.inventory.findIndex(i => i.id === itemId && i.qty > 0 && !i.type);
    if (idx === -1) return null;
    const item = this.inventory[idx];
    item.qty--;
    if (item.qty <= 0) this.inventory.splice(idx, 1);
    return { ...item };
  }

  getUsableItems() {
    return this.inventory.filter(i => !i.type && i.qty > 0);
  }

  getExtensions() {
    return this.inventory.filter(i => i.type === 'extension');
  }

  equipExtension(heroId, extIndex) {
    const hero = this.getHero(heroId);
    if (!hero) return;
    const extensions = this.getExtensions();
    if (extIndex < 0 || extIndex >= extensions.length) return;
    const ext = extensions[extIndex];
    const oldExt = hero.equippedExt;
    hero.equippedExt = ext;
    hero.stats.hp = Math.min(hero.stats.hp, this.getMaxHp(hero));
  }

  unequipExtension(heroId) {
    const hero = this.getHero(heroId);
    if (!hero) return;
    hero.equippedExt = null;
  }

  completeNode(nodeId) {
    if (!this.completedNodes.includes(nodeId)) {
      this.completedNodes.push(nodeId);
    }
  }

  isNodeCompleted(nodeId) {
    return this.completedNodes.includes(nodeId);
  }

  getAvailableNodes(allNodes, connections) {
    if (this.completedNodes.length === 0) return [allNodes[0].id];
    const available = new Set();
    for (const [from, to] of connections) {
      if (this.completedNodes.includes(from) && !this.completedNodes.includes(to)) {
        available.add(to);
      }
    }
    return Array.from(available);
  }

  toBattleUnit(hero) {
    const maxHp = this.getMaxHp(hero);
    return {
      id: hero.id,
      name: hero.name,
      imageId: hero.imageId,
      maxHp,
      hp: Math.min(hero.stats.hp, maxHp),
      phy: this.getEffectiveStat(hero, 'phy'),
      int: this.getEffectiveStat(hero, 'int'),
      agi: this.getEffectiveStat(hero, 'agi'),
      skills: hero.skills.map(s => ({ ...s, cooldown: 0 })),
      cooldowns: {},
      isPlayer: hero.id === 'player',
    };
  }

  syncFromBattle(battleUnits) {
    for (const bu of battleUnits) {
      const hero = this.getHero(bu.id);
      if (hero) {
        hero.stats.hp = Math.max(1, bu.hp);
      }
    }
  }
}

export const gameState = new GameState();
