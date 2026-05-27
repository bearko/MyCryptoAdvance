/* ============================================================
   battle.js — turn-based battle with target selection
   ============================================================ */

import { ASSETS, ENEMIES as ENEMY_DB } from './constants.js';
import { gameState } from './state.js';
import { audio } from './audio.js';

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
    this.turnIndicator = document.getElementById('turnIndicator');

    this.allies = [];
    this.enemies = [];
    this.battleActive = false;
    this.isPlayerTurn = false;
    this.resolve = null;
    this._pendingAction = null;
    this._pendingQueueCallback = null;
    this._phyBuff = 1.0;

    this._onCommand = this._onCommand.bind(this);
    this._onEnemyClick = this._onEnemyClick.bind(this);
    this._onAllyClick = this._onAllyClick.bind(this);
    this.commandsEl.addEventListener('click', this._onCommand);
  }

  start(allyUnits, enemyKeys, bgId) {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.allies = allyUnits.map(a => ({ ...a, cooldowns: {}, _defending: false }));
      this.enemies = enemyKeys.map((key, i) => {
        const e = ENEMY_DB[key];
        return {
          id: `enemy_${i}`, name: e.name, imageId: e.imageId,
          maxHp: e.hp, hp: e.hp, phy: e.phy, int: e.int, agi: e.agi,
          skills: [{ id: 'atk', name: '攻撃', type: 'phy', power: 1.0, target: 'single' }],
        };
      });
      this.battleActive = true;
      this._phyBuff = 1.0;
      this.logEl.innerHTML = '';

      if (bgId) {
        this.bgEl.style.backgroundImage = `url(${ASSETS.background(bgId)})`;
      } else {
        this.bgEl.style.background = 'linear-gradient(180deg, #3a5a3a, #1a3a1a)';
      }

      this.layer.classList.remove('hidden');
      this._render();
      this._addLog('戦闘開始！', 'info');
      audio.playBgm('pve.mp3');
      setTimeout(() => this._nextRound(), 800);
    });
  }

  _render() {
    this._renderEnemies();
    this._renderAllies();
    this._renderStatus();
  }

  _renderEnemies() {
    this.enemiesEl.innerHTML = '';
    this.enemies.forEach(enemy => {
      const el = document.createElement('div');
      el.className = 'battle-unit battle-unit--enemy';
      el.id = `unit-${enemy.id}`;
      el.dataset.unitId = enemy.id;
      if (enemy.hp <= 0) el.classList.add('battle-unit--dead');

      const img = document.createElement('img');
      img.className = 'battle-unit__sprite';
      img.src = ASSETS.enemy(enemy.imageId);
      img.alt = enemy.name;
      img.draggable = false;

      const hpWrap = document.createElement('div');
      hpWrap.className = 'hp-bar';
      const hpFill = document.createElement('div');
      hpFill.className = 'hp-bar__fill';
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      hpFill.style.width = `${ratio * 100}%`;
      if (ratio < 0.3) hpFill.classList.add('hp-bar__fill--low');
      hpWrap.appendChild(hpFill);

      const hpText = document.createElement('div');
      hpText.className = 'battle-unit__hp-text';
      hpText.textContent = `${Math.max(0, enemy.hp)}`;

      const name = document.createElement('div');
      name.className = 'battle-unit__name';
      name.textContent = enemy.name;

      el.append(img, hpWrap, hpText, name);
      this.enemiesEl.appendChild(el);
    });
  }

  _renderAllies() {
    this.alliesEl.innerHTML = '';
    this.allies.forEach(ally => {
      const el = document.createElement('div');
      el.className = 'battle-unit battle-unit--ally';
      el.id = `unit-${ally.id}`;
      el.dataset.unitId = ally.id;
      if (ally.hp <= 0) el.classList.add('battle-unit--dead');

      const img = document.createElement('img');
      img.className = 'battle-unit__sprite battle-unit__sprite--large';
      img.src = ASSETS.hero(ally.imageId);
      img.alt = ally.name;
      img.draggable = false;

      const hpWrap = document.createElement('div');
      hpWrap.className = 'hp-bar hp-bar--ally';
      const hpFill = document.createElement('div');
      hpFill.className = 'hp-bar__fill';
      const ratio = Math.max(0, ally.hp / ally.maxHp);
      hpFill.style.width = `${ratio * 100}%`;
      if (ratio < 0.3) hpFill.classList.add('hp-bar__fill--low');
      hpWrap.appendChild(hpFill);

      const name = document.createElement('div');
      name.className = 'battle-unit__name battle-unit__name--ally';
      name.textContent = ally.name;

      el.append(img, hpWrap, name);
      this.alliesEl.appendChild(el);
    });
  }

  _renderStatus() {
    this.statusEl.innerHTML = '';
    this.allies.forEach(ally => {
      const card = document.createElement('div');
      card.className = 'status-card';
      if (ally.hp <= 0) card.classList.add('status-card--dead');
      const ratio = Math.max(0, ally.hp / ally.maxHp);
      card.innerHTML = `
        <img class="status-card__portrait" src="${ASSETS.hero(ally.imageId)}" alt="${ally.name}" draggable="false">
        <div class="status-card__info">
          <div class="status-card__name">${ally.name} <span class="status-card__lv">Lv.${gameState.getHero(ally.id)?.level || 1}</span></div>
          <div class="status-card__hp">HP ${Math.max(0, ally.hp)} / ${ally.maxHp}</div>
          <div class="status-card__bar"><div class="status-card__bar-fill" style="width:${ratio * 100}%;${ratio < 0.3 ? 'background:var(--hp-bar-low)' : ''}"></div></div>
        </div>`;
      this.statusEl.appendChild(card);
    });
  }

  _nextRound() {
    if (!this.battleActive) return;
    const livingE = this.enemies.filter(e => e.hp > 0);
    const livingA = this.allies.filter(a => a.hp > 0);
    if (livingE.length === 0) { this._endBattle(true); return; }
    if (livingA.length === 0) { this._endBattle(false); return; }

    const all = [
      ...livingA.map(a => ({ ref: a, isAlly: true })),
      ...livingE.map(e => ({ ref: e, isAlly: false })),
    ];
    all.sort((a, b) => b.ref.agi - a.ref.agi);
    this._processQueue(all, 0);
  }

  _processQueue(queue, idx) {
    if (!this.battleActive) return;
    if (idx >= queue.length) { setTimeout(() => this._nextRound(), 300); return; }
    const { ref, isAlly } = queue[idx];
    const actual = isAlly ? this.allies.find(a => a.id === ref.id) : this.enemies.find(e => e.id === ref.id);
    if (!actual || actual.hp <= 0) { this._processQueue(queue, idx + 1); return; }

    this._highlightTurn(actual.id, isAlly);

    if (isAlly) {
      if (actual.isPlayer) {
        actual._defending = false;
        actual.skills.forEach(s => { if (s.cooldown > 0) s.cooldown--; });
        this._showCommands(actual, () => this._processQueue(queue, idx + 1));
      } else {
        this._aiAllyTurn(actual).then(() => this._processQueue(queue, idx + 1));
      }
    } else {
      this._enemyTurn(actual).then(() => this._processQueue(queue, idx + 1));
    }
  }

  _highlightTurn(unitId, isAlly) {
    document.querySelectorAll('.battle-unit--active').forEach(el => el.classList.remove('battle-unit--active'));
    const el = document.getElementById(`unit-${unitId}`);
    if (el) el.classList.add('battle-unit--active');
    if (this.turnIndicator) {
      const unit = isAlly ? this.allies.find(a => a.id === unitId) : this.enemies.find(e => e.id === unitId);
      this.turnIndicator.textContent = unit ? `${unit.name} のターン` : '';
      this.turnIndicator.classList.remove('hidden');
    }
  }

  _showCommands(player, callback) {
    this.isPlayerTurn = true;
    this._pendingQueueCallback = callback;
    this.commandsEl.innerHTML = '';

    const cmds = [
      { id: 'attack', label: '攻撃', icon: '⚔' },
      { id: 'skill', label: 'スキル', icon: '✦' },
      { id: 'item', label: 'アイテム', icon: '🧪' },
      { id: 'defend', label: '防御', icon: '🛡' },
    ];

    cmds.forEach(cmd => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--battle';
      btn.dataset.cmd = cmd.id;
      btn.innerHTML = `<span class="cmd-icon">${cmd.icon}</span><span class="cmd-label">${cmd.label}</span>`;
      this.commandsEl.appendChild(btn);
    });

    this.commandsEl.classList.remove('hidden');
    this.commandsEl.classList.add('battle-commands--enter');
    setTimeout(() => this.commandsEl.classList.remove('battle-commands--enter'), 300);
  }

  _onCommand(e) {
    const btn = e.target.closest('[data-cmd]');
    if (!btn || !this.isPlayerTurn) return;
    const cmd = btn.dataset.cmd;
    const player = this.allies.find(a => a.isPlayer && a.hp > 0);
    if (!player) return;

    audio.playSe('select');

    switch (cmd) {
      case 'attack':
        this._pendingAction = { type: 'attack', skill: player.skills[0], user: player };
        this._showTargetSelect('enemy');
        break;
      case 'skill':
        this._showSkillMenu(player);
        break;
      case 'item':
        this._showItemMenu(player);
        break;
      case 'defend':
        player._defending = true;
        this._addLog(`${player.name}は身構えた！`, 'info');
        this._animateUnit(player.id, 'acting');
        this._finishPlayerTurn();
        break;
      case 'back':
        this._showCommands(player, this._pendingQueueCallback);
        break;
    }
  }

  _showSkillMenu(player) {
    this.commandsEl.innerHTML = '';
    player.skills.forEach(skill => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--battle btn--skill';
      const onCd = skill.cooldown > 0;
      btn.disabled = onCd;
      btn.dataset.cmd = 'use_skill';
      btn.dataset.skillId = skill.id;
      const cdText = onCd ? ` (CT:${skill.cooldown})` : '';
      const typeIcon = skill.type === 'heal' || skill.type === 'buff_phy' ? '💚' : '⚔';
      btn.innerHTML = `<span class="cmd-icon">${typeIcon}</span><span class="cmd-label">${skill.name}${cdText}</span>`;
      btn.addEventListener('click', () => {
        if (onCd) return;
        audio.playSe('select');
        this._pendingAction = { type: 'skill', skill, user: player };
        if (skill.target === 'single') {
          this._showTargetSelect('enemy');
        } else if (skill.target === 'single_ally') {
          this._showTargetSelect('ally');
        } else {
          this._executeAction(this._pendingAction, null);
        }
      });
      this.commandsEl.appendChild(btn);
    });

    const back = document.createElement('button');
    back.className = 'btn btn--battle btn--back';
    back.dataset.cmd = 'back';
    back.innerHTML = '<span class="cmd-icon">←</span><span class="cmd-label">戻る</span>';
    this.commandsEl.appendChild(back);
  }

  _showItemMenu(player) {
    const items = gameState.getUsableItems();
    this.commandsEl.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'battle-log__entry battle-log__entry--info';
      empty.textContent = 'アイテムがありません';
      empty.style.textAlign = 'center';
      empty.style.padding = '0.5rem';
      this.commandsEl.appendChild(empty);
    }

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--battle btn--item';
      btn.innerHTML = `<span class="cmd-label">${item.name} ×${item.qty}</span>`;
      btn.addEventListener('click', () => {
        audio.playSe('select');
        if (item.type === 'heal') {
          this._pendingAction = { type: 'item', item, user: player };
          this._showTargetSelect('ally');
        } else if (item.type === 'cd_reset') {
          this._pendingAction = { type: 'item', item, user: player };
          this._executeAction(this._pendingAction, player);
        }
      });
      this.commandsEl.appendChild(btn);
    });

    const back = document.createElement('button');
    back.className = 'btn btn--battle btn--back';
    back.dataset.cmd = 'back';
    back.innerHTML = '<span class="cmd-icon">←</span><span class="cmd-label">戻る</span>';
    this.commandsEl.appendChild(back);
  }

  _showTargetSelect(targetType) {
    this.commandsEl.innerHTML = '';
    const hint = document.createElement('div');
    hint.className = 'target-hint';
    hint.textContent = targetType === 'enemy' ? '敵をタップして選択' : '味方をタップして選択';
    this.commandsEl.appendChild(hint);

    const back = document.createElement('button');
    back.className = 'btn btn--battle btn--back';
    back.dataset.cmd = 'back';
    back.innerHTML = '<span class="cmd-icon">←</span><span class="cmd-label">戻る</span>';
    this.commandsEl.appendChild(back);

    if (targetType === 'enemy') {
      this.enemiesEl.classList.add('battle-enemies--targeting');
      this.enemies.forEach(enemy => {
        if (enemy.hp <= 0) return;
        const el = document.getElementById(`unit-${enemy.id}`);
        if (el) {
          el.classList.add('battle-unit--targetable');
          el.addEventListener('click', this._onEnemyClick);
        }
      });
    } else {
      this.alliesEl.classList.add('battle-allies--targeting');
      this.allies.forEach(ally => {
        if (ally.hp <= 0) return;
        const el = document.getElementById(`unit-${ally.id}`);
        if (el) {
          el.classList.add('battle-unit--targetable');
          el.addEventListener('click', this._onAllyClick);
        }
      });
    }
  }

  _clearTargeting() {
    this.enemiesEl.classList.remove('battle-enemies--targeting');
    this.alliesEl.classList.remove('battle-allies--targeting');
    document.querySelectorAll('.battle-unit--targetable').forEach(el => {
      el.classList.remove('battle-unit--targetable');
      el.removeEventListener('click', this._onEnemyClick);
      el.removeEventListener('click', this._onAllyClick);
    });
  }

  _onEnemyClick(e) {
    const el = e.currentTarget;
    const unitId = el.dataset.unitId;
    const target = this.enemies.find(en => en.id === unitId);
    if (!target || target.hp <= 0) return;
    audio.playSe('confirm');
    this._clearTargeting();
    this._executeAction(this._pendingAction, target);
  }

  _onAllyClick(e) {
    const el = e.currentTarget;
    const unitId = el.dataset.unitId;
    const target = this.allies.find(a => a.id === unitId);
    if (!target || target.hp <= 0) return;
    audio.playSe('confirm');
    this._clearTargeting();
    this._executeAction(this._pendingAction, target);
  }

  _executeAction(action, target) {
    const { type, skill, item, user } = action;

    if (type === 'attack' || type === 'skill') {
      if (skill.target === 'all_enemy') {
        const living = this.enemies.filter(e => e.hp > 0);
        living.forEach((t, i) => setTimeout(() => this._performAttack(user, t, skill, true), i * 200));
        if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
      } else if (skill.target === 'all_ally') {
        if (skill.type === 'heal') {
          const living = this.allies.filter(a => a.hp > 0);
          living.forEach(a => {
            const healAmt = Math.floor(user.int * skill.power + user.maxHp * 0.1);
            a.hp = Math.min(a.maxHp, a.hp + healAmt);
            this._showDamage(a.id, healAmt, false, false, true);
            audio.playSe('heal');
          });
          this._addLog(`${user.name}の${skill.name}！ 味方全員のHPが回復した！`, 'heal');
          if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
        } else if (skill.type === 'buff_phy') {
          this._phyBuff = skill.power;
          this._addLog(`${user.name}の${skill.name}！ 味方の攻撃力が上がった！`, 'info');
          audio.playSe('heal');
          if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
        }
        this._animateUnit(user.id, 'acting');
      } else {
        this._performAttack(user, target, skill, true);
        if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
      }
    } else if (type === 'item') {
      const used = gameState.useItem(item.id);
      if (used) {
        if (used.type === 'heal') {
          target.hp = Math.min(target.maxHp, target.hp + used.value);
          this._showDamage(target.id, used.value, false, false, true);
          this._addLog(`${user.name}は${used.name}を使った！ ${target.name}のHPが${used.value}回復！`, 'heal');
          audio.playSe('heal');
        } else if (used.type === 'cd_reset') {
          user.skills.forEach(s => s.cooldown = 0);
          this._addLog(`${user.name}は${used.name}を使った！ スキルCTがリセットされた！`, 'info');
          audio.playSe('item');
        }
      }
    }

    this._render();
    this._finishPlayerTurn();
  }

  _performAttack(attacker, target, skill, isAllyAttacker) {
    const stat = skill.type === 'int' ? attacker.int : attacker.phy;
    let baseDamage = skill.power * stat * (isAllyAttacker ? this._phyBuff : 1.0);
    const variance = 0.85 + Math.random() * 0.3;
    const defending = target._defending ? 0.5 : 1;
    let damage = Math.floor(baseDamage * variance * defending);
    const isCrit = Math.random() < 0.1;
    if (isCrit) damage = Math.floor(damage * 1.5);
    damage = Math.max(1, damage);

    target.hp = Math.max(0, target.hp - damage);
    target._defending = false;

    this._animateUnit(attacker.id, 'acting');
    setTimeout(() => {
      this._animateUnit(target.id, 'hit');
      this._showDamage(target.id, damage, isCrit, false, false);
      audio.playSe(isCrit ? 'critical' : 'hit');
    }, 150);

    const critText = isCrit ? 'クリティカル！ ' : '';
    this._addLog(`${attacker.name}の${skill.name}！ ${critText}${target.name}に${damage}ダメージ！`, 'damage');

    if (target.hp <= 0) {
      setTimeout(() => this._addLog(`${target.name}を倒した！`, 'info'), 200);
    }

    this._render();
  }

  _finishPlayerTurn() {
    this.isPlayerTurn = false;
    this.commandsEl.classList.add('hidden');
    this._clearTargeting();
    this._pendingAction = null;
    setTimeout(() => {
      if (this._pendingQueueCallback) {
        const cb = this._pendingQueueCallback;
        this._pendingQueueCallback = null;
        cb();
      }
    }, 500);
  }

  _aiAllyTurn(ally) {
    return new Promise(resolve => {
      const livingE = this.enemies.filter(e => e.hp > 0);
      if (livingE.length === 0) { resolve(); return; }

      ally._defending = false;
      ally.skills.forEach(s => { if (s.cooldown > 0) s.cooldown--; });

      const needsHeal = this.allies.some(a => a.hp > 0 && a.hp / a.maxHp < 0.35);
      const healSkill = ally.skills.find(s => s.type === 'heal' && s.cooldown <= 0);
      const buffSkill = ally.skills.find(s => s.type === 'buff_phy' && s.cooldown <= 0);
      const atkSkills = ally.skills.filter(s => s.type !== 'heal' && s.type !== 'buff_phy' && s.cooldown <= 0);

      let skill, target;

      if (needsHeal && healSkill && Math.random() < 0.7) {
        skill = healSkill;
        if (skill.target === 'single_ally') {
          target = this.allies.filter(a => a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          const healAmt = Math.floor(ally.int * skill.power + ally.maxHp * 0.1);
          target.hp = Math.min(target.maxHp, target.hp + healAmt);
          this._animateUnit(ally.id, 'acting');
          this._showDamage(target.id, healAmt, false, false, true);
          this._addLog(`${ally.name}の${skill.name}！ ${target.name}のHPが${healAmt}回復！`, 'heal');
          audio.playSe('heal');
          if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
          this._render();
          setTimeout(resolve, 500);
          return;
        } else {
          const livingA = this.allies.filter(a => a.hp > 0);
          livingA.forEach(a => {
            const healAmt = Math.floor(ally.int * skill.power + ally.maxHp * 0.1);
            a.hp = Math.min(a.maxHp, a.hp + healAmt);
            this._showDamage(a.id, healAmt, false, false, true);
          });
          this._animateUnit(ally.id, 'acting');
          this._addLog(`${ally.name}の${skill.name}！ 味方全員のHPが回復した！`, 'heal');
          audio.playSe('heal');
          if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
          this._render();
          setTimeout(resolve, 500);
          return;
        }
      }

      if (buffSkill && this._phyBuff <= 1.0 && Math.random() < 0.3) {
        skill = buffSkill;
        this._phyBuff = skill.power;
        this._animateUnit(ally.id, 'acting');
        this._addLog(`${ally.name}の${skill.name}！ 味方の攻撃力が上がった！`, 'info');
        audio.playSe('heal');
        if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
        setTimeout(resolve, 500);
        return;
      }

      skill = atkSkills.length > 1 && Math.random() < 0.35 ? atkSkills[1] || atkSkills[0] : atkSkills[0];
      if (!skill) skill = ally.skills[0];

      if (skill.target === 'all_enemy') {
        livingE.forEach((t, i) => setTimeout(() => this._performAttack(ally, t, skill, true), i * 150));
      } else {
        target = livingE[Math.floor(Math.random() * livingE.length)];
        setTimeout(() => this._performAttack(ally, target, skill, true), 300);
      }
      if (skill.cooldownMax) skill.cooldown = skill.cooldownMax;
      setTimeout(resolve, 600);
    });
  }

  _enemyTurn(enemy) {
    return new Promise(resolve => {
      const livingA = this.allies.filter(a => a.hp > 0);
      if (livingA.length === 0) { resolve(); return; }
      const target = livingA[Math.floor(Math.random() * livingA.length)];
      const skill = enemy.skills[0];
      setTimeout(() => {
        this._performAttack(enemy, target, skill, false);
        setTimeout(resolve, 500);
      }, 300);
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

  _showDamage(unitId, value, isCrit, isMiss, isHeal) {
    const el = document.getElementById(`unit-${unitId}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fieldRect = this.fieldEl.getBoundingClientRect();
    const dmgEl = document.createElement('div');
    dmgEl.className = 'damage-number';
    if (isHeal) dmgEl.classList.add('damage-number--heal');
    else if (isCrit) dmgEl.classList.add('damage-number--critical');
    dmgEl.textContent = isHeal ? `+${value}` : `${value}`;
    dmgEl.style.left = `${rect.left - fieldRect.left + rect.width / 2 - 20}px`;
    dmgEl.style.top = `${rect.top - fieldRect.top - 10}px`;
    this.effectLayer.appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 1000);
  }

  _addLog(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `battle-log__entry${type ? ` battle-log__entry--${type}` : ''}`;
    entry.textContent = text;
    this.logEl.appendChild(entry);
    this.logEl.scrollTop = this.logEl.scrollHeight;
    while (this.logEl.children.length > 50) this.logEl.removeChild(this.logEl.firstChild);
  }

  _endBattle(victory) {
    this.battleActive = false;
    this.commandsEl.classList.add('hidden');
    this._clearTargeting();
    document.querySelectorAll('.battle-unit--active').forEach(el => el.classList.remove('battle-unit--active'));
    if (this.turnIndicator) this.turnIndicator.classList.add('hidden');

    audio.playSe(victory ? 'victory' : 'defeat');

    setTimeout(() => {
      const result = document.createElement('div');
      result.className = 'battle-result';
      result.innerHTML = `
        <div class="battle-result__title ${victory ? 'battle-result__title--victory' : 'battle-result__title--defeat'}">
          ${victory ? 'VICTORY' : 'DEFEAT'}
        </div>
        <div class="battle-result__sub">${victory ? '戦闘に勝利した！' : '力尽きた…'}</div>
        <button class="battle-result__btn">${victory ? '続ける' : 'もう一度'}</button>`;

      result.querySelector('.battle-result__btn').addEventListener('click', () => {
        audio.playSe('confirm');
        result.remove();
        this.layer.classList.add('hidden');
        if (this.resolve) { this.resolve(victory); this.resolve = null; }
      });

      this.fieldEl.appendChild(result);
    }, 600);
  }

  hide() {
    this.layer.classList.add('hidden');
  }
}
