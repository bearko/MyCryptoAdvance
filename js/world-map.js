/* ============================================================
   world-map.js — リアルタイム編成派遣マップ
   - 時間進行: 1リアル秒 = 1ゲーム日 (×1速度時)
   - 編成は移動・戦闘中もスムーズにアニメーション
   - 派遣指示時に戦闘モード(自動/手動)を指定
   - 本拠地への帰投ボタン
   ============================================================ */

import { WORLD_MAP, HEROES, ASSETS, getTravelDays } from './constants.js';
import { partyState } from './state.js';
import { audio } from './audio.js';
import { calcSuccessRate, runAutoBattle } from './auto-battle.js';

const $ = id => document.getElementById(id);

export class WorldMap {
  constructor() {
    this.layer = $('worldMapLayer');
    this.resolve = null;
    this._paused = false; // デフォルト再生中
    this._speed = 1;     // 1x, 2x, 4x
    this._timeAcc = 0;   // 日数の小数部
    this._raf = null;
    this._lastTime = 0;
    this._modalOpen = false;
    this._processingQueue = false;
  }

  show() {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.layer.classList.remove('hidden');
      requestAnimationFrame(() => {
        this._render();
        // 前回の続きでキューが残っていたら処理
        this._processQueuesIfAny();
        this._startLoop();
      });
    });
  }

  hide() {
    this._stopLoop();
    this.layer.classList.add('hidden');
  }

  _startLoop() {
    this._lastTime = performance.now();
    const loop = (now) => {
      if (this.layer.classList.contains('hidden')) {
        this._raf = null;
        return;
      }
      const dt = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this._update(dt);
      this._renderSquadsAndHeader();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _update(dt) {
    if (this._paused || this._modalOpen || this._processingQueue) return;
    this._timeAcc += dt * this._speed;
    while (this._timeAcc >= 1.0 && !this._modalOpen && !this._processingQueue) {
      this._timeAcc -= 1.0;
      partyState.tickDay();
      // 週開始: 内政自動適用
      if (partyState.isWeekStart()) {
        partyState.consumeWeekStart();
        const prod = partyState.calcAutoProductions();
        const r = partyState.advanceTurn(prod);
        if (r && r.event) {
          this._showWeeklyEventToast(r.event);
        }
      }
      // キュー処理
      if (partyState.arrivalQueue.length > 0 || partyState.autoBattleQueue.length > 0) {
        this._processQueuesIfAny();
        break;
      }
    }
  }

  async _processQueuesIfAny() {
    if (this._processingQueue) return;
    if (partyState.arrivalQueue.length === 0 && partyState.autoBattleQueue.length === 0) return;
    this._processingQueue = true;
    this._timeAcc = 0; // 蓄積していた小数日をリセット
    try {
      while (partyState.autoBattleQueue.length > 0) {
        const item = partyState.autoBattleQueue.shift();
        await this._handleAutoBattleResult(item);
      }
      while (partyState.arrivalQueue.length > 0) {
        const item = partyState.arrivalQueue.shift();
        const handled = await this._handleArrival(item);
        if (handled === 'manual_dispatch') {
          // 手動戦闘へ遷移するためループ離脱（finally で processing 解放）
          return;
        }
      }
    } finally {
      this._processingQueue = false;
      this._timeAcc = 0;
      this._lastTime = performance.now();
    }
  }

  async _handleArrival(item) {
    const s = partyState.getSquad(item.squadId);
    const terr = WORLD_MAP.territories.find(t => t.id === item.terrId);
    if (!s || !terr) return 'skip';
    // 既に制圧済みなら自動idle
    if (partyState.isTerritoryConquered(terr.id)) {
      partyState.setSquadIdle(item.squadId);
      return 'skip';
    }
    // 手動戦闘モードの場合は確認モーダル
    const choice = await this._showManualBattlePrompt(s, terr);
    if (choice === 'fight') {
      this._exit({ action: 'attack', terr, squadId: s.id });
      return 'manual_dispatch';
    }
    // 待機: 駐留として残す
    partyState.setSquadIdle(item.squadId);
    return 'wait';
  }

  async _handleAutoBattleResult(item) {
    const s = partyState.getSquad(item.squadId);
    const terr = WORLD_MAP.territories.find(t => t.id === item.terrId);
    if (!s || !terr) return;
    // 連合軍判定 (同じ場所に居る全編成: resolving/fighting/arrived/idle)
    const allHere = partyState.squads.filter(x =>
      x.location === terr.id && ['resolving', 'fighting', 'arrived', 'idle'].includes(x.status)
    );
    const isCoalition = allHere.length >= 2;
    const squadIds = isCoalition ? allHere.map(x => x.id) : [s.id];
    const result = runAutoBattle(squadIds, terr, isCoalition);

    // 戦闘結果反映
    if (result.victory) {
      partyState.conquerTerritory(terr.id);
      for (const sid of squadIds) partyState.moveSquadTo(sid, terr.id);
      // 報酬適用
      partyState.awardStageRewards(result.kills, result.time, terr.reward || {}, result.maxCombo, result.bonusXp);
      // 仲間化
      if (terr.recruit && !partyState.hasHero(terr.recruit)) {
        partyState.addHero(terr.recruit);
      }
    } else {
      // 敗北: 本拠地に退却
      for (const sid of squadIds) partyState.moveSquadTo(sid, 'home_camp');
    }
    // 結果トースト
    this._showAutoBattleToast(s, terr, result, isCoalition);
  }

  // ---- UI rendering ----
  _render() {
    const res = partyState.resources;
    const turn = partyState.turn;
    const day = partyState.day;
    const hint = this._getProgressHint();
    this.layer.innerHTML = `
      <div class="wm-header">
        <div class="wm-title">${WORLD_MAP.name}</div>
        <div class="wm-resources" id="wmRes">
          <span class="wm-res wm-res--gold">💰 ${res.gold}</span>
          <span class="wm-res wm-res--food">🌾 ${res.food}</span>
          <span class="wm-res wm-res--mat">⚒ ${res.materials}</span>
          <span class="wm-res wm-res--sold">⚔ ${res.soldiers}</span>
          <span class="wm-res wm-res--turn" id="wmTurn">第${turn}週 (${day}日目)</span>
        </div>
        <div class="wm-hint" id="wmHint">${hint}</div>
      </div>
      <div class="wm-field" id="wmField">
        <svg id="wmSvg" class="wm-svg"></svg>
        <div class="wm-nodes" id="wmNodes"></div>
        <div class="wm-squads" id="wmSquads"></div>
        <div class="wm-toast-host" id="wmToastHost"></div>
      </div>
      <div class="wm-footer">
        <div class="wm-time-ctrl">
          <button class="wm-time-btn ${this._paused?'wm-time-btn--active':''}" id="wmPause">${this._paused ? '▶' : '⏸'}</button>
          <button class="wm-time-btn ${this._speed===1?'wm-time-btn--active':''}" data-speed="1">1×</button>
          <button class="wm-time-btn ${this._speed===2?'wm-time-btn--active':''}" data-speed="2">2×</button>
          <button class="wm-time-btn ${this._speed===4?'wm-time-btn--active':''}" data-speed="4">4×</button>
        </div>
        <button class="btn wm-home-btn" id="wmHomeBtn">🏯 本拠地</button>
      </div>
    `;

    this._drawConnections();
    this._drawNodes();
    this._drawSquads();

    // タイム制御
    $('wmPause').addEventListener('click', () => {
      this._paused = !this._paused;
      this._lastTime = performance.now();
      this._render();
      audio.playSe('select');
    });
    this.layer.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._speed = parseInt(btn.dataset.speed);
        this._render();
        audio.playSe('select');
      });
    });
    $('wmHomeBtn').addEventListener('click', () => {
      const homeNode = WORLD_MAP.territories.find(t => t.id === 'home_camp');
      audio.playSe('confirm');
      this._exit({ action: 'home', terr: homeNode });
    });
  }

  // フレーム毎の軽量再描画 (位置 + ヘッダー)
  _renderSquadsAndHeader() {
    const turnEl = $('wmTurn');
    const hintEl = $('wmHint');
    if (turnEl) turnEl.textContent = `第${partyState.turn}週 (${partyState.day}日目)`;
    if (hintEl) hintEl.textContent = this._getProgressHint();
    this._drawSquads();
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

  _drawSquads() {
    const squadsEl = $('wmSquads');
    if (!squadsEl) return;
    // 既存ノード差分更新（パフォーマンス重視）
    const existingIds = new Set();
    squadsEl.querySelectorAll('[data-sq-id]').forEach(e => existingIds.add(e.dataset.sqId));
    const seenIds = new Set();

    for (const s of partyState.squads) {
      if (s.heroes.length === 0) continue;
      seenIds.add(s.id);
      const isPlayer = s.heroes.includes('player');
      const heroDef = HEROES[s.heroes[0]];
      let pos, badge = '';
      if (s.status === 'traveling') {
        const from = WORLD_MAP.territories.find(t => t.id === s.location);
        const to = WORLD_MAP.territories.find(t => t.id === s.destination);
        if (!from || !to) continue;
        const total = s.totalTravelDays || 1;
        // 小数部 _timeAcc を含めて滑らかに進ませる
        const accProgress = this._paused || this._modalOpen ? 0 : this._timeAcc;
        const dayProgress = Math.max(0, Math.min(1, (total - s.daysRemaining + accProgress) / total));
        pos = { x: from.x + (to.x - from.x) * dayProgress, y: from.y + (to.y - from.y) * dayProgress };
        badge = `<span class="wm-squad__days">${Math.ceil(s.daysRemaining - accProgress)}日</span>`;
      } else if (s.status === 'fighting') {
        const t = WORLD_MAP.territories.find(t => t.id === s.location);
        if (!t) continue;
        pos = { x: t.x + 2, y: t.y + 6 };
        const total = s.fightTotalDays || 3;
        const accProgress = this._paused || this._modalOpen ? 0 : this._timeAcc;
        const remain = Math.max(0, s.fightDaysRemaining - accProgress);
        badge = `<span class="wm-squad__fight">⚔ ${remain.toFixed(1)}日</span>`;
      } else {
        const t = WORLD_MAP.territories.find(t => t.id === s.location);
        if (!t) continue;
        const offsetIdx = partyState.getSquadsAt(s.location).indexOf(s);
        pos = { x: t.x + (offsetIdx - 0.5) * 5, y: t.y + 7 };
      }
      let el = squadsEl.querySelector(`[data-sq-id="${s.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = `wm-squad`;
        el.dataset.sqId = s.id;
        el.innerHTML = `<img src="${ASSETS.hero(heroDef.imageId)}" draggable="false"><span class="wm-squad__badge-slot"></span>`;
        el.addEventListener('click', e => {
          e.stopPropagation();
          audio.playSe('select');
          this._showSquadInfo(partyState.getSquad(s.id));
        });
        squadsEl.appendChild(el);
      }
      el.classList.toggle('wm-squad--player', isPlayer);
      el.classList.toggle('wm-squad--traveling', s.status === 'traveling');
      el.classList.toggle('wm-squad--fighting', s.status === 'fighting');
      el.style.left = `${pos.x}%`;
      el.style.top = `${pos.y}%`;
      const badgeSlot = el.querySelector('.wm-squad__badge-slot');
      if (badgeSlot) badgeSlot.innerHTML = badge;
    }
    // 削除された編成の要素を取り除く
    existingIds.forEach(id => {
      if (!seenIds.has(id)) {
        const node = squadsEl.querySelector(`[data-sq-id="${id}"]`);
        if (node) node.remove();
      }
    });
  }

  _getProgressHint() {
    const traveling = partyState.getTravelingSquads().length;
    const fighting = partyState.squads.filter(s => s.status === 'fighting').length;
    if (partyState.isTerritoryConquered('attila_castle')) return '🎉 ワールド1制覇完了！';
    if (this._isAccessible('attila_castle')) return '👑 ついにアッティラ討伐の時！';
    if (fighting > 0) return `⚔ ${fighting}部隊が自動戦闘中`;
    if (traveling > 0) return `🚶 ${traveling}部隊が行軍中`;
    if (partyState.members.length < 3) return '⚔ まずは仲間を増やそう';
    return '📜 領地アイコンをタップして派遣指示';
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

  // ---- Click handlers ----
  _onNodeClick(terr) {
    if (terr.type === 'home') {
      // 本拠地ノード: メニュー
      this._exit({ action: 'home', terr });
      return;
    }
    if (partyState.isTerritoryConquered(terr.id)) {
      this._showTerritoryDetail(terr);
      return;
    }
    this._showDispatchModal(terr);
  }

  _modalWrap(html) {
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    modal.innerHTML = html;
    this.layer.appendChild(modal);
    this._modalOpen = true;
    return modal;
  }

  _closeModal(modal) {
    modal.remove();
    this._modalOpen = false;
    this._lastTime = performance.now();
  }

  _showSquadInfo(s) {
    if (!s) return;
    const idx = partyState.squads.indexOf(s) + 1;
    const heroes = s.heroes.map(h => {
      const def = HEROES[h];
      const lv = partyState.getHeroLevel(h);
      return `<div class="wm-modal__hero">
        <img src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
        <span>${def.name} Lv.${lv}</span>
      </div>`;
    }).join('');
    let statusText = '';
    if (s.status === 'traveling') {
      statusText = `移動中 → ${WORLD_MAP.territories.find(t => t.id === s.destination)?.name} (残${Math.ceil(s.daysRemaining)}日)`;
    } else if (s.status === 'fighting') {
      statusText = `${WORLD_MAP.territories.find(t => t.id === s.location)?.name} で自動戦闘中 (残${Math.ceil(s.fightDaysRemaining)}日)`;
    } else {
      statusText = `${WORLD_MAP.territories.find(t => t.id === s.location)?.name} に駐留`;
    }
    // 本拠地に戻るボタン (idle時かつhome_camp以外)
    const canReturnHome = s.status === 'idle' && s.location !== 'home_camp';
    const returnBtn = canReturnHome
      ? '<button class="btn" id="sqReturnHome">🏯 本拠地へ帰投</button>'
      : '';
    const modal = this._modalWrap(`
      <div class="wm-modal">
        <h3 class="wm-modal__title">第${idx}部隊 ${s.heroes.includes('player') ? '👑' : ''}</h3>
        <div class="wm-modal__desc">${statusText}</div>
        <div class="wm-modal__party-list">${heroes}</div>
        <div class="wm-modal__actions">
          ${returnBtn}
          <button class="btn" id="sqClose">閉じる</button>
        </div>
      </div>
    `);
    modal.querySelector('#sqClose').addEventListener('click', () => {
      audio.playSe('select');
      this._closeModal(modal);
    });
    if (canReturnHome) {
      modal.querySelector('#sqReturnHome').addEventListener('click', () => {
        audio.playSe('confirm');
        const days = getTravelDays(s.location, 'home_camp', WORLD_MAP);
        partyState.dispatchSquad(s.id, 'home_camp', days, 'manual'); // 本拠地は戦闘なし
        this._closeModal(modal);
      });
    }
  }

  _showTerritoryDetail(terr) {
    const squadsHere = partyState.getSquadsAt(terr.id);
    const dispatchable = partyState.squads.filter(s => {
      if (s.status !== 'idle' || s.heroes.length === 0) return false;
      if (s.location === terr.id) return false;
      const conns = WORLD_MAP.connections;
      return conns.some(([a, b]) =>
        (a === s.location && b === terr.id) || (b === s.location && a === terr.id)
      );
    });
    const squadsList = squadsHere.length > 0
      ? squadsHere.map(s => `<div class="wm-modal__hero">${this._squadName(s)} (${s.heroes.length}名)</div>`).join('')
      : '<div class="wm-modal__desc">駐留する編成なし</div>';
    const dispatchList = dispatchable.length > 0
      ? `<div class="wm-modal__party-label">この拠点へ移動</div>` + dispatchable.map(s => {
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        const fromName = WORLD_MAP.territories.find(t => t.id === s.location)?.name || '';
        return `<button class="deploy-row" data-squad="${s.id}">
          <div style="font-weight:900">${this._squadName(s)}</div>
          <div class="deploy-row__info"><div class="deploy-row__lv">${fromName}より ${days}日</div></div>
        </button>`;
      }).join('')
      : '';
    const modal = this._modalWrap(`
      <div class="wm-modal">
        <h3 class="wm-modal__title">${terr.icon} ${terr.name}</h3>
        <div class="wm-modal__desc">${terr.desc}</div>
        <div class="wm-modal__reward">✓ 制圧済み</div>
        <div class="wm-modal__party-label">駐留中の部隊</div>
        ${squadsList}
        ${dispatchList}
        <div class="wm-modal__actions">
          <button class="btn" id="terrClose">閉じる</button>
        </div>
      </div>
    `);
    modal.querySelector('#terrClose').addEventListener('click', () => {
      audio.playSe('select');
      this._closeModal(modal);
    });
    modal.querySelectorAll('button[data-squad]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.squad;
        const s = partyState.getSquad(sid);
        if (!s) return;
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        partyState.dispatchSquad(sid, terr.id, days, 'manual');
        audio.playSe('confirm');
        this._closeModal(modal);
      });
    });
  }

  _showDispatchModal(terr) {
    const availableSquads = partyState.squads.filter(s => {
      if (s.status !== 'idle' || s.heroes.length === 0) return false;
      const conns = WORLD_MAP.connections;
      return conns.some(([a, b]) =>
        (a === s.location && b === terr.id) || (b === s.location && a === terr.id)
      );
    });
    const rewardParts = [];
    if (terr.reward) {
      if (terr.reward.gold) rewardParts.push(`💰 ${terr.reward.gold}`);
      if (terr.reward.materials) rewardParts.push(`⚒ ${terr.reward.materials}`);
      if (terr.reward.food) rewardParts.push(`🌾 ${terr.reward.food}`);
    }
    const recruitInfo = terr.recruit ? `<div class="wm-modal__reward">🤝 仲間化: ${HEROES[terr.recruit].name}</div>` : '';
    const isBoss = terr.isFinalBoss;
    const list = availableSquads.length === 0
      ? '<div class="wm-modal__desc deploy-empty">派遣可能な部隊がありません。<br>隣接領地に居る idle 編成が必要です。</div>'
      : availableSquads.map(s => {
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        const avgLv = partyState.getSquadAvgLevel(s.id).toFixed(1);
        const sucRate = calcSuccessRate([s.id], terr.id, terr.difficulty || 1, 1);
        const heroes = s.heroes.map(h => HEROES[h].name).join(' / ');
        const fromName = WORLD_MAP.territories.find(t => t.id === s.location)?.name || '';
        return `<div class="deploy-row" data-squad="${s.id}">
          <div style="flex:1">
            <div style="font-weight:900">${this._squadName(s)} ${s.heroes.includes('player') ? '👑' : ''}</div>
            <div class="deploy-row__name">${heroes}</div>
            <div class="deploy-row__lv">${fromName}より ${days}日 / 平均Lv.${avgLv} / 自動成功率${Math.round(sucRate*100)}%</div>
            <div class="dispatch-mode" data-sq="${s.id}">
              ${!isBoss ? `<label><input type="radio" name="mode-${s.id}" value="auto" checked> ⚙ 自動戦闘 (3日)</label>` : ''}
              <label><input type="radio" name="mode-${s.id}" value="manual" ${isBoss ? 'checked' : ''}> ⚔ 手動戦闘</label>
            </div>
            <button class="btn btn--small dispatch-confirm" data-sq="${s.id}">この部隊で出陣</button>
          </div>
        </div>`;
      }).join('');
    const modal = this._modalWrap(`
      <div class="wm-modal">
        <h3 class="wm-modal__title">${terr.icon} ${terr.name} へ派遣</h3>
        <div class="wm-modal__diff">難易度 ${'★'.repeat(terr.difficulty || 1)}</div>
        <div class="wm-modal__desc">${terr.desc}</div>
        ${rewardParts.length ? `<div class="wm-modal__reward">報酬: ${rewardParts.join(' / ')}</div>` : ''}
        ${recruitInfo}
        ${isBoss ? '<div class="wm-modal__reward">⚠ ボス戦 — 手動戦闘のみ</div>' : ''}
        <div class="wm-modal__party-label">派遣する部隊を選択</div>
        <div class="wm-modal__deploy-list">${list}</div>
        <div class="wm-modal__actions">
          <button class="btn btn--secondary" id="wmCancel">キャンセル</button>
        </div>
      </div>
    `);
    modal.querySelector('#wmCancel').addEventListener('click', () => {
      audio.playSe('select');
      this._closeModal(modal);
    });
    modal.querySelectorAll('.dispatch-confirm').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sq;
        const s = partyState.getSquad(sid);
        if (!s) return;
        const modeInput = modal.querySelector(`input[name="mode-${sid}"]:checked`);
        const mode = modeInput ? modeInput.value : 'manual';
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        partyState.dispatchSquad(sid, terr.id, days, mode);
        audio.playSe('confirm');
        this._closeModal(modal);
      });
    });
  }

  _showManualBattlePrompt(squad, terr) {
    return new Promise(resolve => {
      const sqIds = [squad.id, ...partyState.squads.filter(s => s.id !== squad.id && s.location === terr.id && (s.status === 'arrived' || s.status === 'idle')).map(s => s.id)];
      const successRate = calcSuccessRate(sqIds, terr.id, terr.difficulty || 1, sqIds.length > 1 ? 2 : 1);
      const heroes = squad.heroes.map(h => {
        const def = HEROES[h];
        const lv = partyState.getHeroLevel(h);
        return `<div class="wm-modal__hero">
          <img src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
          <span>${def.name} Lv.${lv}</span>
        </div>`;
      }).join('');
      const isBoss = terr.isFinalBoss;
      const modal = this._modalWrap(`
        <div class="wm-modal">
          <h3 class="wm-modal__title">📜 伝令 — ${terr.name}に到着</h3>
          <div class="wm-modal__desc">${this._squadName(squad)} ${squad.heroes.includes('player') ? '👑' : ''} が${terr.name}に到着しました。</div>
          <div class="wm-modal__party-list">${heroes}</div>
          ${sqIds.length > 1 ? `<div class="wm-modal__reward">⚔ 連合軍 (${sqIds.length}部隊)</div>` : ''}
          ${isBoss ? '<div class="wm-modal__reward">⚠ ボス戦 — 全力で挑め</div>' : `<div class="wm-modal__reward">参考: 自動成功率なら${Math.round(successRate*100)}%</div>`}
          <div class="wm-modal__actions">
            <button class="btn btn--secondary" id="bWait">⏸ 待機</button>
            <button class="btn" id="bFight">⚔ 出陣する</button>
          </div>
        </div>
      `);
      const finish = (choice) => {
        audio.playSe('confirm');
        this._closeModal(modal);
        resolve(choice);
      };
      modal.querySelector('#bWait').addEventListener('click', () => finish('wait'));
      modal.querySelector('#bFight').addEventListener('click', () => finish('fight'));
    });
  }

  _showAutoBattleToast(squad, terr, result, isCoalition) {
    const host = $('wmToastHost');
    if (!host) return;
    const toast = document.createElement('div');
    toast.className = `wm-toast ${result.victory ? 'wm-toast--victory' : 'wm-toast--defeat'}`;
    const heroDef = HEROES[squad.heroes[0]];
    const coa = isCoalition ? ' [連合軍]' : '';
    toast.innerHTML = `
      <img src="${ASSETS.hero(heroDef.imageId)}" draggable="false">
      <div class="wm-toast__body">
        <div class="wm-toast__title">${result.victory ? '✓ 制圧成功' : '✗ 撤退'}${coa}</div>
        <div class="wm-toast__sub">${this._squadName(squad)} @ ${terr.name}</div>
        <div class="wm-toast__sub">撃破${result.kills} / XP+${result.bonusXp} / 成功率${Math.round(result.successRate*100)}%</div>
      </div>
    `;
    host.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('wm-toast--fade');
      setTimeout(() => toast.remove(), 600);
    }, 3000);
  }

  _showWeeklyEventToast(event) {
    const host = $('wmToastHost');
    if (!host) return;
    const e = event.effect || {};
    const parts = [];
    if (e.gold) parts.push(`💰${e.gold>0?'+':''}${e.gold}`);
    if (e.food) parts.push(`🌾${e.food>0?'+':''}${e.food}`);
    if (e.materials) parts.push(`⚒${e.materials>0?'+':''}${e.materials}`);
    if (e.soldiers) parts.push(`⚔${e.soldiers>0?'+':''}${e.soldiers}`);
    const isBad = (e.gold||0)<0 || (e.food||0)<0 || (e.soldiers||0)<0;
    const toast = document.createElement('div');
    toast.className = `wm-toast ${isBad ? 'wm-toast--defeat' : 'wm-toast--event'}`;
    toast.innerHTML = `
      <div class="wm-toast__body">
        <div class="wm-toast__title">${event.name}</div>
        <div class="wm-toast__sub">${event.desc}</div>
        <div class="wm-toast__sub">${parts.join(' / ')}</div>
      </div>
    `;
    host.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('wm-toast--fade');
      setTimeout(() => toast.remove(), 600);
    }, 3500);
  }

  _squadName(s) {
    const idx = partyState.squads.indexOf(s) + 1;
    return `第${idx}部隊`;
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
