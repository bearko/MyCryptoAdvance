/* ============================================================
   world-map.js — 編成派遣型ワールドマップ
   - 各編成が領地に位置し、移動に日数がかかる
   - 領地クリックで派遣指示
   - 到着時に伝令モーダル（自動/手動/待機）
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
    this.pendingArrivals = [];
  }

  show() {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.layer.classList.remove('hidden');
      requestAnimationFrame(() => {
        this._render();
        // 直前に貯まっていた伝令を処理
        this._processArrivalQueue();
      });
    });
  }

  hide() {
    this.layer.classList.add('hidden');
  }

  _render() {
    const res = partyState.resources;
    const turn = partyState.turn;
    const day = partyState.day;
    const hint = this._getProgressHint();
    this.layer.innerHTML = `
      <div class="wm-header">
        <div class="wm-title">${WORLD_MAP.name}</div>
        <div class="wm-resources">
          <span class="wm-res wm-res--gold">💰 ${res.gold}</span>
          <span class="wm-res wm-res--food">🌾 ${res.food}</span>
          <span class="wm-res wm-res--mat">⚒ ${res.materials}</span>
          <span class="wm-res wm-res--sold">⚔ ${res.soldiers}</span>
          <span class="wm-res wm-res--turn">第${turn}週 (${day}日目)</span>
        </div>
        <div class="wm-hint">${hint}</div>
      </div>
      <div class="wm-field" id="wmField">
        <svg id="wmSvg" class="wm-svg"></svg>
        <div class="wm-nodes" id="wmNodes"></div>
        <div class="wm-squads" id="wmSquads"></div>
      </div>
      <div class="wm-footer">
        <button class="btn wm-next-btn" id="wmNextBtn">▶ 次の1週進める</button>
      </div>
    `;

    this._drawConnections();
    this._drawNodes();
    this._drawSquads();

    $('wmNextBtn').addEventListener('click', () => this._onAdvanceWeek());
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
    squadsEl.innerHTML = '';
    // 移動中編成: 始点と終点の間に表示
    for (const s of partyState.squads) {
      if (s.heroes.length === 0) continue;
      const isPlayer = s.heroes.includes('player');
      const heroDef = HEROES[s.heroes[0]];
      let pos;
      if (s.status === 'traveling') {
        const from = WORLD_MAP.territories.find(t => t.id === s.location);
        const to = WORLD_MAP.territories.find(t => t.id === s.destination);
        if (!from || !to) continue;
        // 進行度合いを daysRemaining から推定
        const totalDays = getTravelDays(s.location, s.destination, WORLD_MAP);
        const progress = Math.min(0.95, Math.max(0.05, 1 - s.daysRemaining / Math.max(1, totalDays)));
        pos = {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        };
      } else {
        const t = WORLD_MAP.territories.find(t => t.id === s.location);
        if (!t) continue;
        // 拠点の周囲少しずらして表示
        const offsetIdx = partyState.getSquadsAt(s.location).indexOf(s);
        pos = { x: t.x + (offsetIdx - 0.5) * 5, y: t.y + 7 };
      }
      const sqEl = document.createElement('div');
      sqEl.className = `wm-squad ${isPlayer ? 'wm-squad--player' : ''} ${s.status === 'traveling' ? 'wm-squad--traveling' : ''}`;
      sqEl.style.left = `${pos.x}%`;
      sqEl.style.top = `${pos.y}%`;
      sqEl.title = `${this._squadDisplayName(s)} (${s.heroes.length}名)`;
      const trav = s.status === 'traveling' ? `<span class="wm-squad__days">${s.daysRemaining}日</span>` : '';
      sqEl.innerHTML = `<img src="${ASSETS.hero(heroDef.imageId)}" draggable="false">${trav}`;
      sqEl.addEventListener('click', e => {
        e.stopPropagation();
        audio.playSe('select');
        this._showSquadInfo(s);
      });
      squadsEl.appendChild(sqEl);
    }
  }

  _squadDisplayName(s) {
    const idx = partyState.squads.indexOf(s) + 1;
    return `第${idx}部隊`;
  }

  _getProgressHint() {
    const traveling = partyState.getTravelingSquads().length;
    const arrived = partyState.arrivalQueue.length;
    if (arrived > 0) return `📜 ${arrived}部隊が目的地に到着！`;
    if (partyState.isTerritoryConquered('attila_castle')) return '🎉 ワールド1制覇完了！';
    if (this._isAccessible('attila_castle')) return '👑 ついにアッティラ討伐の時！';
    if (traveling > 0) return `🚶 ${traveling}部隊が行軍中`;
    if (partyState.members.length < 3) return '⚔ まずは仲間を増やそう';
    return '📜 編成を派遣して領地を制圧せよ';
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
    // 本拠地: そこに居る編成がいれば家臣メニューを開く
    if (terr.type === 'home') {
      this._exit({ action: 'home', terr });
      return;
    }
    if (partyState.isTerritoryConquered(terr.id)) {
      // 制圧済み: 編成が居れば情報、なければ通過点扱い
      this._showTerritoryDetail(terr);
      return;
    }
    this._showDispatchModal(terr);
  }

  _showSquadInfo(s) {
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const heroes = s.heroes.map(h => {
      const def = HEROES[h];
      const lv = partyState.getHeroLevel(h);
      return `<div class="wm-modal__hero">
        <img src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
        <span>${def.name} Lv.${lv}</span>
      </div>`;
    }).join('');
    const statusText = s.status === 'traveling'
      ? `移動中 → ${WORLD_MAP.territories.find(t => t.id === s.destination)?.name} (残${s.daysRemaining}日)`
      : `${WORLD_MAP.territories.find(t => t.id === s.location)?.name} に駐留中`;
    modal.innerHTML = `
      <div class="wm-modal">
        <h3 class="wm-modal__title">${this._squadDisplayName(s)} ${s.heroes.includes('player') ? '👑' : ''}</h3>
        <div class="wm-modal__desc">${statusText}</div>
        <div class="wm-modal__party-list">${heroes}</div>
        <div class="wm-modal__actions">
          <button class="btn" id="squadClose">閉じる</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    modal.querySelector('#squadClose').addEventListener('click', () => {
      audio.playSe('select');
      modal.remove();
    });
  }

  _showTerritoryDetail(terr) {
    // 制圧済み領地クリック: 詳細表示 + 帰投/移動派遣
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const squadsHere = partyState.getSquadsAt(terr.id);
    // 隣接領地に居る編成 = この領地に派遣可能
    const dispatchable = partyState.squads.filter(s => {
      if (s.status !== 'idle' || s.heroes.length === 0) return false;
      if (s.location === terr.id) return false;
      const conns = WORLD_MAP.connections;
      return conns.some(([a, b]) =>
        (a === s.location && b === terr.id) || (b === s.location && a === terr.id)
      );
    });
    const squadsList = squadsHere.length > 0
      ? squadsHere.map(s => `<div class="wm-modal__hero">${this._squadDisplayName(s)} (${s.heroes.length}名)</div>`).join('')
      : '<div class="wm-modal__desc">駐留する編成なし</div>';
    const dispatchList = dispatchable.length > 0
      ? `<div class="wm-modal__party-label">この拠点へ移動</div>` + dispatchable.map(s => {
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        const fromName = WORLD_MAP.territories.find(t => t.id === s.location)?.name || '';
        return `<button class="deploy-row" data-squad="${s.id}">
          <div style="font-weight:900">${this._squadDisplayName(s)}</div>
          <div class="deploy-row__info">
            <div class="deploy-row__lv">${fromName}より ${days}日</div>
          </div>
        </button>`;
      }).join('')
      : '';
    modal.innerHTML = `
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
    `;
    this.layer.appendChild(modal);
    modal.querySelector('#terrClose').addEventListener('click', () => {
      audio.playSe('select');
      modal.remove();
    });
    modal.querySelectorAll('button[data-squad]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.squad;
        const s = partyState.getSquad(sid);
        if (!s) return;
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        partyState.dispatchSquad(sid, terr.id, days);
        audio.playSe('confirm');
        modal.remove();
        this._render();
      });
    });
  }

  _showDispatchModal(terr) {
    // 派遣可能な編成 = idle で 1名以上いる編成、かつ隣接領地に居る
    const availableSquads = partyState.squads.filter(s => {
      if (s.status !== 'idle' || s.heroes.length === 0) return false;
      // 隣接判定
      const conns = WORLD_MAP.connections;
      return conns.some(([a, b]) =>
        (a === s.location && b === terr.id) || (b === s.location && a === terr.id)
      );
    });

    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const rewardParts = [];
    if (terr.reward) {
      if (terr.reward.gold) rewardParts.push(`💰 ${terr.reward.gold}`);
      if (terr.reward.materials) rewardParts.push(`⚒ ${terr.reward.materials}`);
      if (terr.reward.food) rewardParts.push(`🌾 ${terr.reward.food}`);
    }
    const recruitInfo = terr.recruit ? `<div class="wm-modal__reward">🤝 仲間化: ${HEROES[terr.recruit].name}</div>` : '';

    const list = availableSquads.length === 0
      ? '<div class="wm-modal__desc deploy-empty">派遣可能な部隊がありません。<br>隣接領地に居る idle 編成が必要です。</div>'
      : availableSquads.map(s => {
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        const avgLv = partyState.getSquadAvgLevel(s.id).toFixed(1);
        const heroes = s.heroes.map(h => HEROES[h].name).join(' / ');
        const fromName = WORLD_MAP.territories.find(t => t.id === s.location)?.name || '';
        return `<button class="deploy-row" data-squad="${s.id}">
          <div style="font-weight:900">${this._squadDisplayName(s)} ${s.heroes.includes('player') ? '👑' : ''}</div>
          <div class="deploy-row__info">
            <div class="deploy-row__name">${heroes}</div>
            <div class="deploy-row__lv">${fromName}より ${days}日 / 平均Lv.${avgLv}</div>
          </div>
        </button>`;
      }).join('');

    modal.innerHTML = `
      <div class="wm-modal">
        <h3 class="wm-modal__title">${terr.icon} ${terr.name} へ派遣</h3>
        <div class="wm-modal__diff">難易度 ${'★'.repeat(terr.difficulty || 1)}</div>
        <div class="wm-modal__desc">${terr.desc}</div>
        ${rewardParts.length ? `<div class="wm-modal__reward">報酬: ${rewardParts.join(' / ')}</div>` : ''}
        ${recruitInfo}
        <div class="wm-modal__party-label">派遣する部隊を選択</div>
        <div class="wm-modal__deploy-list">${list}</div>
        <div class="wm-modal__actions">
          <button class="btn btn--secondary" id="wmCancel">キャンセル</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    modal.querySelector('#wmCancel').addEventListener('click', () => {
      audio.playSe('select');
      modal.remove();
    });
    modal.querySelectorAll('button[data-squad]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.squad;
        const s = partyState.getSquad(sid);
        if (!s) return;
        const days = getTravelDays(s.location, terr.id, WORLD_MAP);
        partyState.dispatchSquad(sid, terr.id, days);
        audio.playSe('confirm');
        modal.remove();
        this._render();
      });
    });
  }

  async _onAdvanceWeek() {
    audio.playSe('confirm');
    partyState.advanceWeek();
    this._render();
    // 到着伝令キューを処理
    await this._processArrivalQueue();
  }

  async _processArrivalQueue() {
    while (partyState.arrivalQueue.length > 0) {
      const item = partyState.arrivalQueue.shift();
      const s = partyState.getSquad(item.squadId);
      const terr = WORLD_MAP.territories.find(t => t.id === item.terrId);
      if (!s || !terr) continue;
      // 制圧済みなら駐留に変更してスキップ
      if (partyState.isTerritoryConquered(terr.id)) {
        partyState.setSquadIdle(item.squadId);
        continue;
      }
      const choice = await this._showArrivalModal(s, terr);
      if (choice === 'manual') {
        // 編成情報を引き継いで戦闘
        this._exit({ action: 'attack', terr, squadId: s.id });
        return;
      } else if (choice === 'auto') {
        // 自動進行
        const isCoalition = partyState.getSquadsAt(terr.id).length >= 2;
        const allSquadsHere = partyState.getSquadsAt(terr.id);
        const squadIds = isCoalition ? allSquadsHere.map(x => x.id) : [s.id];
        const result = await this._runAutoBattle(squadIds, terr, isCoalition);
        // 結果を見せる
        await this._showAutoResult(result, terr);
        // 先に編成のlocationを確定（勝利時は新領地、敗北時は本拠地へ退却）
        for (const sid of squadIds) {
          if (result.victory) {
            partyState.moveSquadTo(sid, terr.id);
          } else {
            // 敗北: 本拠地に退却
            partyState.moveSquadTo(sid, 'home_camp');
          }
        }
        if (result.victory) {
          partyState.conquerTerritory(terr.id);
          // 勝利→編成idle化が終わってから仲間化（playerSquadに合流させるため）
          if (terr.recruit) partyState.addHero(terr.recruit);
        }
        this._render();
      } else {
        // 待機 → そのまま駐留
        partyState.setSquadIdle(item.squadId);
        this._render();
      }
    }
  }

  _showArrivalModal(squad, terr) {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'wm-modal-bg';
      const allSquadsHere = partyState.getSquadsAt(terr.id).filter(s => s.id !== squad.id);
      const isCoalition = allSquadsHere.length > 0;
      const sqIdsForCalc = [squad.id, ...allSquadsHere.map(s => s.id)];
      const successRate = calcSuccessRate(sqIdsForCalc, terr.id, terr.difficulty || 1, isCoalition ? 2 : 1);
      const heroes = squad.heroes.map(h => {
        const def = HEROES[h];
        const lv = partyState.getHeroLevel(h);
        return `<div class="wm-modal__hero">
          <img src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
          <span>${def.name} Lv.${lv}</span>
        </div>`;
      }).join('');
      const isBoss = terr.isFinalBoss;
      const coaInfo = isCoalition
        ? `<div class="wm-modal__reward">⚔ 連合軍: 他${allSquadsHere.length}部隊と共闘</div>`
        : '';
      modal.innerHTML = `
        <div class="wm-modal">
          <h3 class="wm-modal__title">📜 伝令 — ${terr.name}に到着</h3>
          <div class="wm-modal__desc">${this._squadDisplayName(squad)} ${squad.heroes.includes('player') ? '👑' : ''} が${terr.name}に到着しました。</div>
          <div class="wm-modal__party-list">${heroes}</div>
          ${coaInfo}
          ${!isBoss ? `<div class="wm-modal__reward">自動進行 成功率: <b>${Math.round(successRate * 100)}%</b></div>` : '<div class="wm-modal__reward">⚠ ボス戦 — 手動戦闘のみ</div>'}
          <div class="wm-modal__actions">
            <button class="btn btn--secondary" id="arrWait">⏸ 待機</button>
            ${!isBoss ? '<button class="btn" id="arrAuto">⚙ 自動進行</button>' : ''}
            <button class="btn" id="arrManual">⚔ 手動で戦う</button>
          </div>
        </div>
      `;
      this.layer.appendChild(modal);
      const finish = (choice) => {
        audio.playSe('confirm');
        modal.remove();
        resolve(choice);
      };
      modal.querySelector('#arrWait').addEventListener('click', () => finish('wait'));
      modal.querySelector('#arrManual').addEventListener('click', () => finish('manual'));
      const autoBtn = modal.querySelector('#arrAuto');
      if (autoBtn) autoBtn.addEventListener('click', () => finish('auto'));
    });
  }

  async _runAutoBattle(squadIds, terr, isCoalition) {
    // 自動戦闘の演出: 短い「処理中」表示
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'wm-modal-bg';
      overlay.innerHTML = `
        <div class="wm-modal" style="text-align:center;">
          <h3 class="wm-modal__title">⚙ 自動進行中</h3>
          <div class="wm-modal__desc">${terr.name} で交戦中…</div>
          <div class="auto-spinner">⚔</div>
        </div>
      `;
      this.layer.appendChild(overlay);
      setTimeout(() => {
        overlay.remove();
        const result = runAutoBattle(squadIds, terr, isCoalition);
        resolve(result);
      }, 1500);
    });
  }

  _showAutoResult(result, terr) {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'wm-modal-bg';
      const title = result.victory ? '✓ 勝利報告' : '✗ 敗北報告';
      const sub = result.victory
        ? `${terr.name}を制圧しました（成功率${Math.round(result.successRate*100)}%）`
        : `${terr.name}の攻略に失敗（成功率${Math.round(result.successRate*100)}%）`;
      const coa = result.isCoalition ? '<div class="wm-modal__reward">連合軍バフ適用 (報酬×1.3)</div>' : '';
      modal.innerHTML = `
        <div class="wm-modal">
          <h3 class="wm-modal__title">${title}</h3>
          <div class="wm-modal__desc">${sub}</div>
          ${coa}
          <div class="result__stats">
            <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
            <div class="stat-item"><span class="stat-label">獲得XP</span><span class="stat-value">${result.bonusXp}</span></div>
          </div>
          <div class="wm-modal__actions">
            <button class="btn" id="autoOk">OK</button>
          </div>
        </div>
      `;
      this.layer.appendChild(modal);
      modal.querySelector('#autoOk').addEventListener('click', () => {
        audio.playSe('confirm');
        modal.remove();
        // 勝利時のみ報酬配布
        if (result.victory) {
          const rewards = partyState.awardStageRewards(result.kills, result.time, terr.reward || {}, result.maxCombo, result.bonusXp);
          // 簡易リザルト表示は省略、すぐmap復帰
        }
        resolve();
      });
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
