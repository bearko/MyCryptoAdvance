/* ============================================================
   battle.js — turn-based battle system
   ============================================================ */

import { ASSETS } from './constants.js';

export class BattleSystem {
  constructor() {
    this.layer = document.getElementById('battleLayer');
    this.fieldEl = document.getElementById('battleField');
    this.bgEl = document.getElementById('battleBg');
    this.enemiesEl = document.getElementById('battleEnemies');
    this.alliesEl = document.getElementById('battleAllies');
    this.effectLayer = document.getElementById('battleEffectLayer');
    this.statusEl = document.getElementById('battleStatus');
    this.logEl = document.getElementById('battleLog');
    this.commandsEl = document.getElementById('battleCommands');

    this.allies = [];
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.isPlayerTurn = false;
    this.resolve = null;
    this.battleActive = false;

    this._onCommand = this._onCommand.bind(this);
    this.commandsEl.addEventListener('click', this._onCommand);
  }

  start(allies, enemies, bgId) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.allies = allies.map(a => ({ ...a, hp: a.maxHp, cooldowns: {} }));
      this.enemies = enemies.map(e => ({ ...e, hp: e.maxHp }));
      this.battleActive = true;
      this.logEl.innerHTML = '';

      if (bgId) {
        this.bgEl.style.backgroundImage = `url(${ASSETS.background(bgId)})`;
      } else {
        this.bgEl.style.background = 'linear-gradient(to bottom, #2a4a2a, #1a3a1a)';
      }

      this.layer.classList.remove('hidden');
      this._renderUnits();
      this._renderStatus();
      this._addLog('戦闘開始！', 'info');

      setTimeout(() => this._nextTurn(), 800);
    });
  }

  addAlly(allyData) {
    const ally = { ...allyData, hp: allyData.maxHp, cooldowns: {} };
    this.allies.push(ally);
    this._renderUnits();
    this._renderStatus();
  }

  _renderUnits() {
    this.enemiesEl.innerHTML = '';
    this.enemies.forEach((enemy) => {
      const unit = this._createUnitEl(enemy, false);
      this.enemiesEl.appendChild(unit);
    });

    this.alliesEl.innerHTML = '';
    this.allies.forEach((ally) => {
      const unit = this._createUnitEl(ally, true);
      this.alliesEl.appendChild(unit);
    });
  }

  _createUnitEl(unit, isAlly) {
    const el = document.createElement('div');
    el.className = 'battle-unit';
    el.id = `unit-${unit.id}`;
    if (unit.hp <= 0) el.classList.add('battle-unit--dead');

    const img = document.createElement('img');
    img.className = 'battle-unit__sprite';
    if (isAlly) img.classList.add('battle-unit__sprite--large');
    img.src = isAlly ? ASSETS.hero(unit.imageId) : ASSETS.enemy(unit.imageId);
    img.alt = unit.name;
    img.draggable = false;

    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'hp-bar__fill';
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    hpFill.style.width = `${ratio * 100}%`;
    if (ratio < 0.3) hpFill.classList.add('hp-bar__fill--low');
    hpBar.appendChild(hpFill);

    const name = document.createElement('div');
    name.className = `battle-unit__name${isAlly ? ' battle-unit__name--ally' : ''}`;
    name.textContent = unit.name;

    el.appendChild(img);
    el.appendChild(hpBar);
    el.appendChild(name);
    return el;
  }

  _renderStatus() {
    this.statusEl.innerHTML = '';
    this.allies.forEach((ally) => {
      const card = document.createElement('div');
      card.className = 'status-card';
      const ratio = Math.max(0, ally.hp / ally.maxHp);
      card.innerHTML = `
        <img class="status-card__portrait" src="${ASSETS.hero(ally.imageId)}" alt="${ally.name}" draggable="false">
        <div class="status-card__info">
          <div class="status-card__name">${ally.name}</div>
          <div class="status-card__hp">HP ${Math.max(0, ally.hp)} / ${ally.maxHp}</div>
          <div class="status-card__bar">
            <div class="status-card__bar-fill" style="width:${ratio * 100}%;${ratio < 0.3 ? 'background:var(--hp-bar-low)' : ''}"></div>
          </div>
        </div>
      `;
      this.statusEl.appendChild(card);
    });
  }

  _nextTurn() {
    if (!this.battleActive) return;

    const livingEnemies = this.enemies.filter(e => e.hp > 0);
    const livingAllies = this.allies.filter(a => a.hp > 0);

    if (livingEnemies.length === 0) {
      this._endBattle(true);
      return;
    }
    if (livingAllies.length === 0) {
      this._endBattle(false);
      return;
    }

    const allUnits = [
      ...livingAllies.map(a => ({ ...a, isAlly: true })),
      ...livingEnemies.map(e => ({ ...e, isAlly: false })),
    ];
    allUnits.sort((a, b) => b.agi - a.agi);

    this._processTurnQueue(allUnits, 0);
  }

  async _processTurnQueue(queue, index) {
    if (!this.battleActive) return;
    if (index >= queue.length) {
      setTimeout(() => this._nextTurn(), 400);
      return;
    }

    const unit = queue[index];

    const actualUnit = unit.isAlly
      ? this.allies.find(a => a.id === unit.id)
      : this.enemies.find(e => e.id === unit.id);

    if (!actualUnit || actualUnit.hp <= 0) {
      this._processTurnQueue(queue, index + 1);
      return;
    }

    if (unit.isAlly) {
      if (unit.id === 'player') {
        actualUnit._defending = false;
        actualUnit.skills.forEach(s => { if (s.cooldown > 0) s.cooldown--; });
        this.isPlayerTurn = true;
        this._pendingQueueCallback = () => this._processTurnQueue(queue, index + 1);
        this.commandsEl.classList.remove('hidden');
        this._updateCommandButtons();
      } else {
        await this._aiAllyAction(actualUnit);
        this._processTurnQueue(queue, index + 1);
      }
    } else {
      await this._enemyAction(actualUnit);
      this._processTurnQueue(queue, index + 1);
    }
  }

  _updateCommandButtons() {
    const player = this.allies.find(a => a.id === 'player');
    if (!player) return;
    const btns = this.commandsEl.querySelectorAll('.btn--battle');
    btns.forEach(btn => {
      btn.disabled = false;
      const cmd = btn.dataset.cmd;
      if (cmd === 'skill') {
        const skill = player.skills[1];
        if (skill && skill.cooldown > 0) {
          btn.disabled = true;
          btn.textContent = `スキル (${skill.cooldown})`;
        } else {
          btn.textContent = 'スキル';
        }
      }
    });
  }

  _onCommand(e) {
    const btn = e.target.closest('[data-cmd]');
    if (!btn || btn.disabled || !this.isPlayerTurn) return;

    const cmd = btn.dataset.cmd;
    this.isPlayerTurn = false;
    this.commandsEl.classList.add('hidden');

    const player = this.allies.find(a => a.id === 'player');
    const livingEnemies = this.enemies.filter(e => e.hp > 0);
    if (!player || livingEnemies.length === 0) return;

    const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];

    switch (cmd) {
      case 'attack':
        this._performAttack(player, target, player.skills[0], true);
        break;
      case 'skill': {
        const skill = player.skills[1];
        this._performAttack(player, target, skill, true);
        skill.cooldown = 2;
        break;
      }
      case 'defend':
        this._addLog(`${player.name}は身構えた！`, 'info');
        player._defending = true;
        this._animateUnit(player.id, 'acting');
        break;
    }

    setTimeout(() => {
      if (this._pendingQueueCallback) {
        const cb = this._pendingQueueCallback;
        this._pendingQueueCallback = null;
        cb();
      }
    }, 600);
  }

  _performAttack(attacker, target, skill, isAlly) {
    const baseDamage = skill.power * attacker.phy;
    const variance = 0.85 + Math.random() * 0.3;
    const defending = target._defending ? 0.5 : 1;
    let damage = Math.floor(baseDamage * variance * defending);
    const isCrit = Math.random() < 0.1;
    if (isCrit) damage = Math.floor(damage * 1.5);

    target.hp = Math.max(0, target.hp - damage);
    target._defending = false;

    this._animateUnit(attacker.id, 'acting');
    setTimeout(() => {
      this._animateUnit(target.id, 'hit');
      this._showDamage(target.id, damage, isCrit, isAlly);
    }, 200);

    const critText = isCrit ? 'クリティカル！ ' : '';
    this._addLog(`${attacker.name}の${skill.name}！ ${critText}${target.name}に${damage}ダメージ！`, 'damage');

    if (target.hp <= 0) {
      setTimeout(() => {
        this._addLog(`${target.name}を倒した！`, 'info');
      }, 300);
    }

    this._renderUnits();
    this._renderStatus();
  }

  async _aiAllyAction(ally) {
    return new Promise((resolve) => {
      const livingEnemies = this.enemies.filter(e => e.hp > 0);
      if (livingEnemies.length === 0) { resolve(); return; }

      const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];

      let skill = ally.skills[0];
      if (ally.skills[1] && (!ally.cooldowns[ally.skills[1].name] || ally.cooldowns[ally.skills[1].name] <= 0)) {
        if (Math.random() < 0.3) {
          skill = ally.skills[1];
          ally.cooldowns[skill.name] = 3;
        }
      }

      for (const key in ally.cooldowns) {
        if (ally.cooldowns[key] > 0) ally.cooldowns[key]--;
      }

      setTimeout(() => {
        this._performAttack(ally, target, skill, true);
        setTimeout(resolve, 500);
      }, 400);
    });
  }

  async _enemyAction(enemy) {
    return new Promise((resolve) => {
      const livingAllies = this.allies.filter(a => a.hp > 0);
      if (livingAllies.length === 0) { resolve(); return; }

      const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
      const skill = { name: '攻撃', type: 'attack', power: 1.0 };

      setTimeout(() => {
        this._performAttack(enemy, target, skill, false);
        setTimeout(resolve, 500);
      }, 400);
    });
  }

  _animateUnit(unitId, type) {
    const el = document.getElementById(`unit-${unitId}`);
    if (!el) return;
    el.classList.remove('battle-unit--acting', 'battle-unit--hit');
    void el.offsetWidth;
    el.classList.add(`battle-unit--${type}`);
    setTimeout(() => el.classList.remove(`battle-unit--${type}`), 400);
  }

  _showDamage(unitId, damage, isCrit, isAllyAttacking) {
    const el = document.getElementById(`unit-${unitId}`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const fieldRect = this.fieldEl.getBoundingClientRect();

    const dmgEl = document.createElement('div');
    dmgEl.className = 'damage-number';
    if (isCrit) dmgEl.classList.add('damage-number--critical');
    dmgEl.textContent = damage;
    dmgEl.style.left = `${rect.left - fieldRect.left + rect.width / 2 - 15}px`;
    dmgEl.style.top = `${rect.top - fieldRect.top}px`;

    this.effectLayer.appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 1000);
  }

  _addLog(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `battle-log__entry${type ? ` battle-log__entry--${type}` : ''}`;
    entry.textContent = text;
    this.logEl.appendChild(entry);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  _endBattle(victory) {
    this.battleActive = false;
    this.commandsEl.classList.add('hidden');

    setTimeout(() => {
      const result = document.createElement('div');
      result.className = 'battle-result';
      result.innerHTML = `
        <div class="battle-result__title ${victory ? 'battle-result__title--victory' : 'battle-result__title--defeat'}">
          ${victory ? 'VICTORY' : 'DEFEAT'}
        </div>
        <div class="battle-result__sub">${victory ? '戦闘に勝利した！' : '力尽きた…'}</div>
        <button class="battle-result__btn">${victory ? '続ける' : 'もう一度'}</button>
      `;

      result.querySelector('.battle-result__btn').addEventListener('click', () => {
        result.remove();
        this.layer.classList.add('hidden');
        if (this.resolve) {
          this.resolve(victory);
          this.resolve = null;
        }
      });

      this.fieldEl.appendChild(result);
    }, 800);
  }

  hide() {
    this.layer.classList.add('hidden');
  }
}
