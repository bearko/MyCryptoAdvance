/* ============================================================
   world-map.js — ワールドマップ画面 (信長の野望風)
   ============================================================ */

import { WORLD_MAP, HEROES, ASSETS } from './constants.js';
import { partyState } from './state.js';
import { audio } from './audio.js';

const $ = id => document.getElementById(id);

export class WorldMap {
  constructor() {
    this.layer = $('worldMapLayer');
    this.resolve = null;
  }

  show() {
    return new Promise(resolve => {
      this.resolve = resolve;
      this._render();
      this.layer.classList.remove('hidden');
    });
  }

  hide() {
    this.layer.classList.add('hidden');
  }

  _render() {
    const res = partyState.resources;
    const turn = partyState.turn;
    this.layer.innerHTML = `
      <div class="wm-header">
        <div class="wm-title">${WORLD_MAP.name}</div>
        <div class="wm-resources">
          <span class="wm-res wm-res--gold">💰 ${res.gold}</span>
          <span class="wm-res wm-res--food">🌾 ${res.food}</span>
          <span class="wm-res wm-res--mat">⚒ ${res.materials}</span>
          <span class="wm-res wm-res--sold">⚔ ${res.soldiers}</span>
          <span class="wm-res wm-res--turn">第${turn}週</span>
        </div>
      </div>
      <div class="wm-field" id="wmField">
        <svg id="wmSvg" class="wm-svg"></svg>
        <div class="wm-nodes" id="wmNodes"></div>
      </div>
      <div class="wm-footer">
        <button class="btn wm-deploy-btn" id="wmDeployBtn">⚔ 出陣編成 (${partyState.deploy.length}/5)</button>
      </div>
    `;

    this._drawConnections();
    this._drawNodes();

    $('wmDeployBtn').addEventListener('click', () => this._showDeployModal());
  }

  _drawConnections() {
    const svg = $('wmSvg');
    const field = $('wmField');
    const rect = field.getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    svg.innerHTML = '';

    WORLD_MAP.connections.forEach(([a, b]) => {
      const ta = WORLD_MAP.territories.find(t => t.id === a);
      const tb = WORLD_MAP.territories.find(t => t.id === b);
      if (!ta || !tb) return;
      const x1 = (ta.x / 100) * rect.width;
      const y1 = (ta.y / 100) * rect.height;
      const x2 = (tb.x / 100) * rect.width;
      const y2 = (tb.y / 100) * rect.height;
      const aOk = partyState.isTerritoryConquered(a);
      const bOk = partyState.isTerritoryConquered(b);
      const accessible = aOk || bOk;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', accessible ? '#c4a35a' : 'rgba(60,50,80,0.5)');
      line.setAttribute('stroke-width', accessible ? '2.5' : '1.5');
      if (!accessible) line.setAttribute('stroke-dasharray', '5,4');
      svg.appendChild(line);
    });
  }

  _drawNodes() {
    const nodesEl = $('wmNodes');
    nodesEl.innerHTML = '';

    WORLD_MAP.territories.forEach(t => {
      const isConquered = partyState.isTerritoryConquered(t.id);
      const isHome = t.type === 'home';
      const isAccessible = isHome || this._isAccessible(t.id);

      const el = document.createElement('button');
      el.className = 'wm-node';
      el.dataset.terr = t.id;
      el.style.left = `${t.x}%`;
      el.style.top = `${t.y}%`;

      if (isConquered) el.classList.add('wm-node--conquered');
      else if (isAccessible) el.classList.add('wm-node--available');
      else el.classList.add('wm-node--locked');
      if (t.isFinalBoss) el.classList.add('wm-node--boss');
      if (isHome) el.classList.add('wm-node--home');

      const diffBadge = t.difficulty ? `<span class="wm-node__diff">${'★'.repeat(t.difficulty)}</span>` : '';
      el.innerHTML = `
        <span class="wm-node__icon">${isConquered && !isHome ? '✓' : t.icon}</span>
        <span class="wm-node__label">${t.name}</span>
        ${diffBadge}
      `;

      if (isHome || isAccessible) {
        el.addEventListener('click', () => {
          audio.playSe('confirm');
          this._onNodeClick(t);
        });
      }

      nodesEl.appendChild(el);
    });
  }

  _isAccessible(terrId) {
    if (partyState.isTerritoryConquered(terrId)) return true;
    for (const [a, b] of WORLD_MAP.connections) {
      if ((a === terrId && partyState.isTerritoryConquered(b)) ||
          (b === terrId && partyState.isTerritoryConquered(a))) {
        return true;
      }
    }
    return false;
  }

  _onNodeClick(terr) {
    if (terr.type === 'home') {
      this._exit({ action: 'home', terr });
      return;
    }
    if (partyState.isTerritoryConquered(terr.id)) {
      // 制圧済みなら詳細だけ
      return;
    }
    // 攻略確認モーダル
    this._showAttackModal(terr);
  }

  _showAttackModal(terr) {
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const deployed = partyState.getDeployedHeroes();
    const recruitInfo = terr.recruit ? `<div class="wm-modal__reward">🤝 仲間化: ${HEROES[terr.recruit].name}</div>` : '';
    const rewardParts = [];
    if (terr.reward) {
      if (terr.reward.gold) rewardParts.push(`💰 ${terr.reward.gold}`);
      if (terr.reward.materials) rewardParts.push(`⚒ ${terr.reward.materials}`);
      if (terr.reward.food) rewardParts.push(`🌾 ${terr.reward.food}`);
    }
    modal.innerHTML = `
      <div class="wm-modal">
        <h3 class="wm-modal__title">${terr.icon} ${terr.name}</h3>
        <div class="wm-modal__diff">難易度 ${'★'.repeat(terr.difficulty || 1)}</div>
        <div class="wm-modal__desc">${terr.desc}</div>
        ${rewardParts.length ? `<div class="wm-modal__reward">報酬: ${rewardParts.join(' / ')}</div>` : ''}
        ${recruitInfo}
        <div class="wm-modal__party">
          <div class="wm-modal__party-label">出陣メンバー (${deployed.length + 1}名)</div>
          <div class="wm-modal__party-list">
            <div class="wm-modal__hero">
              <img src="${ASSETS.hero(HEROES.player.imageId)}" alt="player" draggable="false">
              <span>${HEROES.player.name}</span>
            </div>
            ${deployed.map(k => `
              <div class="wm-modal__hero">
                <img src="${ASSETS.hero(HEROES[k].imageId)}" alt="${k}" draggable="false">
                <span>${HEROES[k].name}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="wm-modal__actions">
          <button class="btn btn--secondary" id="wmCancel">キャンセル</button>
          <button class="btn" id="wmAttack">出陣する</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    modal.querySelector('#wmCancel').addEventListener('click', () => {
      audio.playSe('select');
      modal.remove();
    });
    modal.querySelector('#wmAttack').addEventListener('click', () => {
      audio.playSe('confirm');
      modal.remove();
      this._exit({ action: 'attack', terr });
    });
  }

  _showDeployModal() {
    audio.playSe('select');
    const members = partyState.members.filter(m => m.heroKey !== 'player');
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    modal.innerHTML = `
      <div class="wm-modal">
        <h3 class="wm-modal__title">⚔ 出陣編成</h3>
        <div class="wm-modal__desc">同行する仲間を最大5名まで選択</div>
        <div class="wm-modal__deploy-list" id="deployList"></div>
        <div class="wm-modal__actions">
          <button class="btn" id="deployClose">決定</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    const list = modal.querySelector('#deployList');
    const renderList = () => {
      list.innerHTML = '';
      members.forEach(m => {
        const def = HEROES[m.heroKey];
        if (!def) return;
        const selected = partyState.deploy.includes(m.heroKey);
        const row = document.createElement('button');
        row.className = `deploy-row ${selected ? 'deploy-row--selected' : ''}`;
        row.innerHTML = `
          <img src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
          <div class="deploy-row__info">
            <div class="deploy-row__name">${def.name}</div>
            <div class="deploy-row__lv">Lv.${m.level}</div>
          </div>
          <div class="deploy-row__check">${selected ? '✓' : ''}</div>
        `;
        row.addEventListener('click', () => {
          audio.playSe('select');
          partyState.toggleDeploy(m.heroKey);
          renderList();
        });
        list.appendChild(row);
      });
      if (members.length === 0) {
        list.innerHTML = '<div class="deploy-empty">仲間がいません。領地を解放して仲間を集めましょう。</div>';
      }
    };
    renderList();
    modal.querySelector('#deployClose').addEventListener('click', () => {
      audio.playSe('confirm');
      modal.remove();
      this._render();
    });
  }

  _exit(result) {
    this.hide();
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(result);
    }
  }
}
