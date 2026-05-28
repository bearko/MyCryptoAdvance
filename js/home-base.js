/* ============================================================
   home-base.js — 本拠地: 内政・募集・武具
   ============================================================ */

import { HEROES, EXTENSIONS, ASSETS, RECRUIT_POOL, SHOP_EXTENSIONS, FACILITIES, TRAINING_TIERS } from './constants.js';
import { partyState } from './state.js';
import { calcAttrs, calcProduction, ATTR_LABEL } from './factory-attrs.js';
import { audio } from './audio.js';

const $ = id => document.getElementById(id);

export class HomeBase {
  constructor() {
    this.layer = $('homeBaseLayer');
    this.resolve = null;
    this.tab = 'govern';
  }

  show() {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.tab = 'govern';
      this.layer.classList.remove('hidden');
      this._render();
    });
  }

  hide() {
    this.layer.classList.add('hidden');
  }

  _render() {
    const res = partyState.resources;
    this.layer.innerHTML = `
      <div class="hb-header">
        <div class="hb-title">🏯 西軍本陣 — 第${partyState.turn}週</div>
        <div class="hb-resources">
          <span class="hb-res hb-res--gold">💰 ${res.gold}</span>
          <span class="hb-res hb-res--food">🌾 ${res.food}</span>
          <span class="hb-res hb-res--mat">⚒ ${res.materials}</span>
          <span class="hb-res hb-res--sold">⚔ ${res.soldiers}</span>
        </div>
      </div>
      <div class="hb-tabs">
        <button class="hb-tab ${this.tab==='govern'?'hb-tab--active':''}" data-tab="govern">政務</button>
        <button class="hb-tab ${this.tab==='squads'?'hb-tab--active':''}" data-tab="squads">編成</button>
        <button class="hb-tab ${this.tab==='dojo'?'hb-tab--active':''}" data-tab="dojo">道場</button>
        <button class="hb-tab ${this.tab==='facility'?'hb-tab--active':''}" data-tab="facility">施設</button>
        <button class="hb-tab ${this.tab==='recruit'?'hb-tab--active':''}" data-tab="recruit">募集</button>
        <button class="hb-tab ${this.tab==='shop'?'hb-tab--active':''}" data-tab="shop">武具</button>
      </div>
      <div class="hb-body" id="hbBody"></div>
      <div class="hb-footer">
        <button class="btn btn--secondary" id="hbExit">マップへ戻る</button>
      </div>
    `;

    this.layer.querySelectorAll('.hb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playSe('select');
        this.tab = btn.dataset.tab;
        this._render();
      });
    });
    $('hbExit').addEventListener('click', () => this._exit());

    this._renderTab();
  }

  _renderTab() {
    const body = $('hbBody');
    if (this.tab === 'govern') this._renderGovern(body);
    else if (this.tab === 'squads') this._renderSquads(body);
    else if (this.tab === 'dojo') this._renderDojo(body);
    else if (this.tab === 'facility') this._renderFacility(body);
    else if (this.tab === 'recruit') this._renderRecruit(body);
    else if (this.tab === 'shop') this._renderShop(body);
    else this._renderRoster(body);
  }

  _renderSquads(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">部隊編成</h3>
        <p class="hb-section-desc">1編成あたり1-3名。本拠地に駐留中の編成のみ変更できます。<br>4人以上集まったら新たな編成を作成可能。</p>
        <div class="squad-list" id="squadList"></div>
        <button class="btn hb-advance-btn" id="addSquadBtn" style="margin-top:0.6rem">+ 新しい編成を作成</button>
        <h4 class="hb-subtitle" style="margin-top:1.1rem;">未配属の家臣</h4>
        <div class="squad-unassigned" id="unassignedList"></div>
      </div>
    `;
    this._renderSquadList();
    $('addSquadBtn').addEventListener('click', () => {
      audio.playSe('select');
      partyState.createSquadAt('home_camp');
      this._renderSquadList();
    });
  }

  _renderSquadList() {
    const list = $('squadList');
    list.innerHTML = '';
    const homeSquads = partyState.squads.filter(s => s.location === 'home_camp' && s.status === 'idle');
    if (homeSquads.length === 0) {
      list.innerHTML = '<div class="hb-empty">本拠地に駐留する編成がありません。</div>';
    }
    homeSquads.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'squad-card';
      const idx = partyState.squads.indexOf(s) + 1;
      const heroes = s.heroes.map(h => {
        const def = HEROES[h];
        return `<button class="squad-hero" data-action="remove" data-squad="${s.id}" data-hero="${h}">
          <img src="${ASSETS.hero(def.imageId)}" draggable="false">
          <span>${def.name}</span>
        </button>`;
      }).join('');
      const empty = '<div class="squad-empty-slot">空きスロット</div>'.repeat(3 - s.heroes.length);
      const removable = !s.heroes.includes('player');
      card.innerHTML = `
        <div class="squad-card__head">
          <span class="squad-card__title">第${idx}部隊 ${s.heroes.includes('player') ? '👑' : ''}</span>
          ${removable ? `<button class="btn--small squad-card__remove" data-squad="${s.id}">解散</button>` : ''}
        </div>
        <div class="squad-card__heroes">${heroes}${empty}</div>
      `;
      list.appendChild(card);
    });
    // 未配属
    const assignedSet = new Set(partyState.squads.flatMap(s => s.heroes));
    const unassigned = partyState.members.filter(m => !assignedSet.has(m.heroKey));
    const ulist = $('unassignedList');
    ulist.innerHTML = '';
    unassigned.forEach(m => {
      const def = HEROES[m.heroKey];
      if (!def) return;
      const row = document.createElement('button');
      row.className = 'squad-hero squad-hero--unassigned';
      row.dataset.action = 'assign';
      row.dataset.hero = m.heroKey;
      row.innerHTML = `<img src="${ASSETS.hero(def.imageId)}" draggable="false"><span>${def.name}</span>`;
      ulist.appendChild(row);
    });

    // クリックハンドラ
    list.querySelectorAll('.squad-card__remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        audio.playSe('select');
        partyState.removeSquad(btn.dataset.squad);
        this._renderSquadList();
      });
    });
    list.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playSe('select');
        const hero = btn.dataset.hero;
        const squad = partyState.getSquad(btn.dataset.squad);
        if (!squad) return;
        // playerは外せない
        if (hero === 'player') {
          this._showToast('プレイヤーは外せません');
          return;
        }
        squad.heroes = squad.heroes.filter(h => h !== hero);
        this._renderSquadList();
      });
    });
    ulist.querySelectorAll('[data-action="assign"]').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playSe('select');
        const hero = btn.dataset.hero;
        // 空きのある編成を探して入れる
        const target = homeSquads.find(s => s.heroes.length < 3);
        if (!target) {
          this._showToast('編成枠が満杯です。新しい編成を作成してください。');
          return;
        }
        target.heroes.push(hero);
        this._renderSquadList();
      });
    });
  }

  _renderGovern(body) {
    // 各家臣に4つの政務を割り当て、ターン進行で生産を確定
    const members = partyState.members.filter(m => m.heroKey !== 'player');

    const productionPreview = this._calcProductionPreview();

    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">政務の割り当て</h3>
        <p class="hb-section-desc">家臣にタスクを割り当てて領地を発展させましょう。<br>主属性のタスクに就かせると効果UP（×1.5）。</p>
        <div class="hb-prod-preview">
          <div class="hb-prod hb-prod--shi">⚔ 兵 +${productionPreview.soldiers}</div>
          <div class="hb-prod hb-prod--nou">🌾 食 +${productionPreview.food}</div>
          <div class="hb-prod hb-prod--sho">💰 金 +${productionPreview.gold}</div>
          <div class="hb-prod hb-prod--kou">⚒ 材 +${productionPreview.materials}</div>
        </div>
        <div class="hb-govern-list" id="governList"></div>
        <button class="btn hb-advance-btn" id="hbAdvance">▶ 1週進める</button>
      </div>
    `;

    const list = $('governList');
    if (members.length === 0) {
      list.innerHTML = '<div class="hb-empty">家臣がいません。領地を解放して仲間を集めましょう。</div>';
    } else {
      members.forEach(m => {
        const def = HEROES[m.heroKey];
        if (!def) return;
        const attrs = calcAttrs(m.heroKey);
        const cur = partyState.taskAssignments[m.heroKey] || 'idle';
        const row = document.createElement('div');
        row.className = 'govern-row';
        row.innerHTML = `
          <img class="govern-row__portrait" src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
          <div class="govern-row__info">
            <div class="govern-row__name">${def.name} <span class="govern-row__lv">Lv.${m.level}</span></div>
            <div class="govern-row__attrs">
              <span class="attr attr--shi ${attrs.primary==='shi'?'attr--primary':''}">士 ${attrs.shi}</span>
              <span class="attr attr--nou ${attrs.primary==='nou'?'attr--primary':''}">農 ${attrs.nou}</span>
              <span class="attr attr--sho ${attrs.primary==='sho'?'attr--primary':''}">商 ${attrs.sho}</span>
              <span class="attr attr--kou ${attrs.primary==='kou'?'attr--primary':''}">工 ${attrs.kou}</span>
            </div>
          </div>
          <div class="govern-row__tasks">
            <button class="task-btn ${cur==='shi'?'task-btn--active':''}" data-hero="${m.heroKey}" data-task="shi" title="練兵">⚔</button>
            <button class="task-btn ${cur==='nou'?'task-btn--active':''}" data-hero="${m.heroKey}" data-task="nou" title="農業">🌾</button>
            <button class="task-btn ${cur==='sho'?'task-btn--active':''}" data-hero="${m.heroKey}" data-task="sho" title="商い">💰</button>
            <button class="task-btn ${cur==='kou'?'task-btn--active':''}" data-hero="${m.heroKey}" data-task="kou" title="探索">⚒</button>
          </div>
        `;
        list.appendChild(row);
      });
      list.querySelectorAll('.task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          audio.playSe('select');
          const hk = btn.dataset.hero;
          const task = btn.dataset.task;
          if (partyState.taskAssignments[hk] === task) {
            delete partyState.taskAssignments[hk];
          } else {
            partyState.taskAssignments[hk] = task;
          }
          this._renderTab();
        });
      });
    }

    $('hbAdvance').addEventListener('click', () => this._advanceTurn());
  }

  _calcProductionPreview() {
    const prod = { gold: 0, food: 0, materials: 0, soldiers: 0 };
    for (const [heroKey, task] of Object.entries(partyState.taskAssignments)) {
      if (!partyState.hasHero(heroKey)) continue;
      const amount = calcProduction(heroKey, task);
      const resource = ATTR_LABEL[task].resource;
      prod[resource] += amount;
    }
    return prod;
  }

  _advanceTurn() {
    if (this._advancing) return; // 連打防止
    this._advancing = true;
    audio.playSe('confirm');
    const prod = this._calcProductionPreview();
    const result = partyState.advanceTurn(prod);
    this._render();
    if (result.event) {
      this._showEventModal(result.event, () => { this._advancing = false; });
    } else {
      if (result.starvation > 0) this._showToast(`兵糧不足！ 兵士-${result.starvation}`);
      this._advancing = false;
    }
  }

  _showEventModal(event, onClose) {
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const e = event.effect;
    const effectParts = [];
    if (e.gold) effectParts.push(`💰 ${e.gold > 0 ? '+' : ''}${e.gold}`);
    if (e.food) effectParts.push(`🌾 ${e.food > 0 ? '+' : ''}${e.food}`);
    if (e.materials) effectParts.push(`⚒ ${e.materials > 0 ? '+' : ''}${e.materials}`);
    if (e.soldiers) effectParts.push(`⚔ ${e.soldiers > 0 ? '+' : ''}${e.soldiers}`);
    const isBad = (e.gold || 0) < 0 || (e.food || 0) < 0 || (e.soldiers || 0) < 0;
    modal.innerHTML = `
      <div class="wm-modal event-modal ${isBad ? 'event-modal--bad' : 'event-modal--good'}">
        <h3 class="wm-modal__title">${event.name}</h3>
        <div class="wm-modal__desc">${event.desc}</div>
        <div class="event-effect">${effectParts.join('　')}</div>
        <div class="wm-modal__actions">
          <button class="btn" id="eventClose">OK</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    audio.playSe(isBad ? 'defeat' : 'item');
    modal.querySelector('#eventClose').addEventListener('click', () => {
      audio.playSe('confirm');
      modal.remove();
      if (onClose) onClose();
    });
  }

  _renderRecruit(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">家臣の募集</h3>
        <p class="hb-section-desc">金を使って仲間を雇い入れます。<br>領地を解放すれば英雄を仲間にできることも。</p>
        <div class="hb-shop-list" id="recruitList"></div>
      </div>
    `;
    const list = $('recruitList');
    RECRUIT_POOL.forEach(item => {
      const def = HEROES[item.heroKey];
      if (!def) return;
      const owned = partyState.hasHero(item.heroKey);
      const attrs = calcAttrs(item.heroKey);
      const card = document.createElement('div');
      card.className = `shop-card ${owned ? 'shop-card--owned' : ''}`;
      card.innerHTML = `
        <img class="shop-card__icon" src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
        <div class="shop-card__info">
          <div class="shop-card__name">${def.name}</div>
          <div class="shop-card__desc">
            <span class="attr attr--shi">士${attrs.shi}</span>
            <span class="attr attr--nou">農${attrs.nou}</span>
            <span class="attr attr--sho">商${attrs.sho}</span>
            <span class="attr attr--kou">工${attrs.kou}</span>
          </div>
        </div>
        <div class="shop-card__action">
          ${owned ? '<span class="shop-card__owned">所属済</span>' : `<button class="btn btn--small" data-hero="${item.heroKey}" data-cost="${item.cost}">💰 ${item.cost}</button>`}
        </div>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('button[data-hero]').forEach(btn => {
      btn.addEventListener('click', () => {
        const heroKey = btn.dataset.hero;
        const cost = parseInt(btn.dataset.cost);
        if (partyState.spendGold(cost)) {
          partyState.addHero(heroKey);
          audio.playSe('item');
          this._render();
        } else {
          audio.playSe('defeat');
          this._showToast('金が足りません');
        }
      });
    });
  }

  _renderShop(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">武具の購入</h3>
        <p class="hb-section-desc">エクステンションを買って家臣を強化。<br>装備は次回の戦闘から反映されます。</p>
        <div class="hb-shop-list" id="shopList"></div>
      </div>
    `;
    const list = $('shopList');
    SHOP_EXTENSIONS.forEach(item => {
      const ext = EXTENSIONS[item.extKey];
      if (!ext) return;
      const card = document.createElement('div');
      card.className = 'shop-card';
      const bonusParts = [];
      if (ext.phyBonus) bonusParts.push(`PHY+${ext.phyBonus}`);
      if (ext.intBonus) bonusParts.push(`INT+${ext.intBonus}`);
      if (ext.agiBonus) bonusParts.push(`AGI+${ext.agiBonus}`);
      if (ext.hpBonus) bonusParts.push(`HP+${ext.hpBonus}`);
      card.innerHTML = `
        <img class="shop-card__icon" src="${ASSETS.extension(ext.id)}" alt="${ext.name}" draggable="false">
        <div class="shop-card__info">
          <div class="shop-card__name">${ext.name}</div>
          <div class="shop-card__desc">${ext.archetype} / ${bonusParts.join(' ')}</div>
        </div>
        <div class="shop-card__action">
          <button class="btn btn--small" data-ext="${item.extKey}" data-cost="${item.cost}">💰 ${item.cost}</button>
        </div>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('button[data-ext]').forEach(btn => {
      btn.addEventListener('click', () => {
        const extKey = btn.dataset.ext;
        const cost = parseInt(btn.dataset.cost);
        if (partyState.resources.gold < cost) {
          audio.playSe('defeat');
          this._showToast('金が足りません');
          return;
        }
        // 装備対象選択 → 確定時に金を引く
        this._showEquipModal(extKey, cost);
      });
    });
  }

  _showEquipModal(extKey, cost) {
    const ext = EXTENSIONS[extKey];
    const modal = document.createElement('div');
    modal.className = 'wm-modal-bg';
    const list = partyState.members.map(m => {
      const def = HEROES[m.heroKey];
      if (!def) return '';
      const cur = partyState.equipment[m.heroKey];
      return `<button class="equip-target" data-hero="${m.heroKey}">
        <img src="${ASSETS.hero(def.imageId)}" draggable="false">
        <span>${def.name}</span>
        <span class="equip-target__cur">${cur ? EXTENSIONS[cur]?.name || '' : 'なし'}</span>
      </button>`;
    }).join('');
    modal.innerHTML = `
      <div class="wm-modal">
        <h3 class="wm-modal__title">${ext.name} (💰${cost}G)</h3>
        <div class="wm-modal__desc">装備する家臣を選択（既存装備は上書き）</div>
        <div class="equip-list">${list}</div>
        <div class="wm-modal__actions">
          <button class="btn btn--secondary" id="equipCancel">キャンセル</button>
        </div>
      </div>
    `;
    this.layer.appendChild(modal);
    modal.querySelectorAll('.equip-target').forEach(b => {
      b.addEventListener('click', () => {
        const hk = b.dataset.hero;
        if (partyState.spendGold(cost)) {
          partyState.equipment[hk] = extKey;
          audio.playSe('item');
          modal.remove();
          this._render();
          this._showToast(`${HEROES[hk].name}に${ext.name}を装備`);
        }
      });
    });
    modal.querySelector('#equipCancel').addEventListener('click', () => {
      audio.playSe('select');
      modal.remove();
    });
  }

  _renderDojo(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">道場・特訓</h3>
        <p class="hb-section-desc">金を支払って家臣に経験値を与え、強化します。</p>
        <div class="dojo-tiers">
          ${TRAINING_TIERS.map((t, i) => `
            <div class="dojo-tier" data-tier="${i}">
              <div class="dojo-tier__name">${t.name}</div>
              <div class="dojo-tier__detail">XP +${t.xp} / 💰${t.cost}G</div>
            </div>
          `).join('')}
        </div>
        <h4 class="hb-subtitle">対象家臣を選択</h4>
        <div class="dojo-hero-list" id="dojoHeroList"></div>
      </div>
    `;
    let selectedTier = 0;
    const tiers = body.querySelectorAll('.dojo-tier');
    const updateTier = () => {
      tiers.forEach((el, i) => el.classList.toggle('dojo-tier--selected', i === selectedTier));
    };
    tiers.forEach((el, i) => {
      el.addEventListener('click', () => {
        audio.playSe('select');
        selectedTier = i;
        updateTier();
      });
    });
    updateTier();

    const list = $('dojoHeroList');
    partyState.members.forEach(m => {
      const def = HEROES[m.heroKey];
      if (!def) return;
      const row = document.createElement('button');
      row.className = 'dojo-row';
      row.innerHTML = `
        <img src="${ASSETS.hero(def.imageId)}" draggable="false">
        <div class="dojo-row__info">
          <div class="dojo-row__name">${def.name}</div>
          <div class="dojo-row__lv">Lv.${m.level}　XP ${m.xp}</div>
        </div>
        <div class="dojo-row__action">特訓</div>
      `;
      row.addEventListener('click', () => {
        const tier = TRAINING_TIERS[selectedTier];
        if (!partyState.spendGold(tier.cost)) {
          audio.playSe('defeat');
          this._showToast('金が足りません');
          return;
        }
        const r = partyState.trainHero(m.heroKey, tier.xp);
        audio.playSe('levelup');
        if (r.levelsGained > 0) {
          this._showToast(`${def.name}が${r.levelsGained}レベル上昇！`);
        } else {
          this._showToast(`${def.name}に経験値 +${tier.xp}`);
        }
        this._render();
      });
      list.appendChild(row);
    });
  }

  _renderFacility(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">施設建設</h3>
        <p class="hb-section-desc">本拠地に施設を建設し、毎週の自動生産を強化。</p>
        <div class="facility-list" id="facilityList"></div>
      </div>
    `;
    const list = $('facilityList');
    Object.entries(FACILITIES).forEach(([key, fac]) => {
      const curLv = partyState.facilities[key] || 0;
      const nextLv = fac.levels[curLv];
      const maxed = !nextLv;
      const card = document.createElement('div');
      card.className = 'facility-card';
      const costStr = nextLv ?
        Object.entries(nextLv.cost).map(([k, v]) => `${k === 'gold' ? '💰' : '⚒'}${v}`).join(' ')
        : '';
      card.innerHTML = `
        <div class="facility-card__icon">${fac.icon}</div>
        <div class="facility-card__info">
          <div class="facility-card__name">${fac.name} <span class="facility-card__lv">Lv.${curLv}/${fac.levels.length}</span></div>
          <div class="facility-card__desc">${fac.desc}</div>
        </div>
        <div class="facility-card__action">
          ${maxed
            ? '<span class="facility-card__maxed">最大</span>'
            : `<button class="btn btn--small" data-fac="${key}">↑ ${costStr}</button>`}
        </div>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('button[data-fac]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.fac;
        const curLv = partyState.facilities[key] || 0;
        const next = FACILITIES[key].levels[curLv];
        if (!next) return;
        const gold = next.cost.gold || 0;
        const mats = next.cost.materials || 0;
        if (partyState.resources.gold < gold || partyState.resources.materials < mats) {
          audio.playSe('defeat');
          this._showToast('資源が足りません');
          return;
        }
        partyState.spendGold(gold);
        if (mats) partyState.spendMaterials(mats);
        partyState.facilities[key] = curLv + 1;
        audio.playSe('item');
        this._showToast(`${FACILITIES[key].name}を強化: ${next.name}`);
        this._render();
      });
    });
  }

  _renderRoster(body) {
    body.innerHTML = `
      <div class="hb-section">
        <h3 class="hb-section-title">家臣一覧</h3>
        <div class="roster-list" id="rosterList"></div>
      </div>
    `;
    const list = $('rosterList');
    partyState.members.forEach(m => {
      const def = HEROES[m.heroKey];
      if (!def) return;
      const attrs = calcAttrs(m.heroKey);
      const equipKey = partyState.equipment[m.heroKey];
      const equip = equipKey ? EXTENSIONS[equipKey] : null;
      const card = document.createElement('div');
      card.className = 'roster-card';
      card.innerHTML = `
        <img class="roster-card__portrait" src="${ASSETS.hero(def.imageId)}" alt="${def.name}" draggable="false">
        <div class="roster-card__info">
          <div class="roster-card__name">${def.name} <span class="roster-card__lv">Lv.${m.level}</span></div>
          <div class="roster-card__primary">主属性: <b>${ATTR_LABEL[attrs.primary].name}</b> (${ATTR_LABEL[attrs.primary].desc})</div>
          <div class="roster-card__attrs">
            <span class="attr attr--shi">士${attrs.shi}</span>
            <span class="attr attr--nou">農${attrs.nou}</span>
            <span class="attr attr--sho">商${attrs.sho}</span>
            <span class="attr attr--kou">工${attrs.kou}</span>
          </div>
          <div class="roster-card__equip">装備: ${equip ? equip.name : '—'}</div>
        </div>
      `;
      list.appendChild(card);
    });
    if (partyState.members.length === 0) {
      list.innerHTML = '<div class="hb-empty">家臣がいません。</div>';
    }
  }

  _showToast(text) {
    const t = document.createElement('div');
    t.className = 'hb-toast';
    t.textContent = text;
    this.layer.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  _exit() {
    audio.playSe('select');
    this.hide();
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r();
    }
  }
}
