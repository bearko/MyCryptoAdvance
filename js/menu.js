/* ============================================================
   menu.js — party status, equipment, and level-up overlay
   ============================================================ */

import { ASSETS } from './constants.js';
import { gameState } from './state.js';
import { audio } from './audio.js';

export class MenuSystem {
  constructor() {
    this.overlay = document.getElementById('menuOverlay');
  }

  showPartyStatus() {
    return new Promise(resolve => {
      this.overlay.innerHTML = '';
      this.overlay.classList.remove('hidden');

      const card = document.createElement('div');
      card.className = 'menu-card';

      let html = '<h2 class="menu-title">パーティ</h2><div class="party-list">';
      for (const hero of gameState.party) {
        const maxHp = gameState.getMaxHp(hero);
        const ratio = Math.max(0, hero.stats.hp / maxHp);
        const xpRatio = hero.xpToNext > 0 ? hero.xp / hero.xpToNext : 0;
        html += `
          <div class="party-member">
            <img class="party-member__portrait" src="${ASSETS.hero(hero.imageId)}" alt="${hero.name}" draggable="false">
            <div class="party-member__info">
              <div class="party-member__name">${hero.name} <span class="party-member__lv">Lv.${hero.level}</span></div>
              <div class="party-member__stats">
                HP ${hero.stats.hp}/${maxHp} | PHY ${gameState.getEffectiveStat(hero, 'phy')} | INT ${gameState.getEffectiveStat(hero, 'int')} | AGI ${gameState.getEffectiveStat(hero, 'agi')}
              </div>
              <div class="party-member__bars">
                <div class="stat-bar"><div class="stat-bar__label">HP</div><div class="stat-bar__track"><div class="stat-bar__fill stat-bar__fill--hp" style="width:${ratio * 100}%"></div></div></div>
                <div class="stat-bar"><div class="stat-bar__label">EXP</div><div class="stat-bar__track"><div class="stat-bar__fill stat-bar__fill--xp" style="width:${xpRatio * 100}%"></div></div></div>
              </div>
              <div class="party-member__equip">装備: ${hero.equippedExt ? hero.equippedExt.name : 'なし'}</div>
            </div>
          </div>`;
      }
      html += '</div>';

      const exts = gameState.getExtensions();
      if (exts.length > 0) {
        html += '<h3 class="menu-subtitle">所持エクステンション</h3><div class="ext-list">';
        exts.forEach((ext, i) => {
          const equipped = gameState.party.some(h => h.equippedExt && h.equippedExt.id === ext.id);
          html += `<div class="ext-item${equipped ? ' ext-item--equipped' : ''}">
            <img class="ext-item__icon" src="${ASSETS.extension(ext.id)}" alt="${ext.name}" draggable="false">
            <span class="ext-item__name">${ext.name}</span>
            <span class="ext-item__stat">${ext.stat.toUpperCase()} +${ext.value}</span>
            ${equipped ? '<span class="ext-item__badge">装備中</span>' : ''}
          </div>`;
        });
        html += '</div>';
      }

      const items = gameState.getUsableItems();
      if (items.length > 0) {
        html += '<h3 class="menu-subtitle">アイテム</h3><div class="item-list">';
        items.forEach(item => {
          html += `<div class="ext-item"><span class="ext-item__name">${item.name}</span><span class="ext-item__stat">×${item.qty}</span></div>`;
        });
        html += '</div>';
      }

      card.innerHTML = html;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn menu-close';
      closeBtn.textContent = '閉じる';
      closeBtn.addEventListener('click', () => {
        audio.playSe('confirm');
        this.overlay.classList.add('hidden');
        resolve();
      });
      card.appendChild(closeBtn);

      this.overlay.appendChild(card);
    });
  }

  showEquipMenu() {
    return new Promise(resolve => {
      this.overlay.innerHTML = '';
      this.overlay.classList.remove('hidden');

      const card = document.createElement('div');
      card.className = 'menu-card';

      const exts = gameState.getExtensions();

      let html = '<h2 class="menu-title">装備変更</h2>';
      for (const hero of gameState.party) {
        html += `<div class="equip-hero" data-hero-id="${hero.id}">
          <div class="equip-hero__header">
            <img class="equip-hero__portrait" src="${ASSETS.hero(hero.imageId)}" alt="${hero.name}" draggable="false">
            <span class="equip-hero__name">${hero.name}</span>
            <span class="equip-hero__current">現在: ${hero.equippedExt ? hero.equippedExt.name : 'なし'}</span>
          </div>
          <div class="equip-options">
            <button class="btn btn--small equip-btn" data-hero="${hero.id}" data-ext="-1">外す</button>
            ${exts.map((ext, i) => `<button class="btn btn--small equip-btn" data-hero="${hero.id}" data-ext="${i}">
              ${ext.name} (${ext.stat.toUpperCase()}+${ext.value})
            </button>`).join('')}
          </div>
        </div>`;
      }

      card.innerHTML = html;

      card.querySelectorAll('.equip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const heroId = btn.dataset.hero;
          const extIdx = parseInt(btn.dataset.ext);
          audio.playSe('item');
          if (extIdx < 0) gameState.unequipExtension(heroId);
          else gameState.equipExtension(heroId, extIdx);
          this.overlay.classList.add('hidden');
          this.showEquipMenu().then(resolve);
        });
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn menu-close';
      closeBtn.textContent = '決定';
      closeBtn.addEventListener('click', () => {
        audio.playSe('confirm');
        this.overlay.classList.add('hidden');
        resolve();
      });
      card.appendChild(closeBtn);
      this.overlay.appendChild(card);
    });
  }

  showLevelUp(heroes) {
    return new Promise(resolve => {
      if (heroes.length === 0) { resolve(); return; }
      this.overlay.innerHTML = '';
      this.overlay.classList.remove('hidden');
      audio.playSe('levelup');

      const card = document.createElement('div');
      card.className = 'menu-card levelup-card';

      let html = '<h2 class="menu-title levelup-title">LEVEL UP!</h2><div class="levelup-list">';
      heroes.forEach(hero => {
        html += `<div class="levelup-hero">
          <img class="levelup-hero__portrait" src="${ASSETS.hero(hero.imageId)}" alt="${hero.name}" draggable="false">
          <div class="levelup-hero__info">
            <div class="levelup-hero__name">${hero.name}</div>
            <div class="levelup-hero__lv">Lv.${hero.level}</div>
            <div class="levelup-hero__stats">
              HP ${hero.stats.maxHp} | PHY ${hero.stats.phy} | INT ${hero.stats.int} | AGI ${hero.stats.agi}
            </div>
          </div>
        </div>`;
      });
      html += '</div>';
      card.innerHTML = html;

      const btn = document.createElement('button');
      btn.className = 'btn menu-close';
      btn.textContent = 'OK';
      btn.addEventListener('click', () => {
        audio.playSe('confirm');
        this.overlay.classList.add('hidden');
        resolve();
      });
      card.appendChild(btn);
      this.overlay.appendChild(card);
    });
  }

  showReward(node) {
    return new Promise(resolve => {
      this.overlay.innerHTML = '';
      this.overlay.classList.remove('hidden');
      audio.playSe('item');

      const card = document.createElement('div');
      card.className = 'menu-card reward-card';
      let html = '<h2 class="menu-title">戦利品</h2><div class="reward-list">';

      if (node.reward) {
        if (node.reward.type === 'extension') {
          const ext = gameState.getExtensions().find(e => e.key === node.reward.key);
          if (ext) {
            html += `<div class="reward-item">
              <img class="reward-item__icon" src="${ASSETS.extension(ext.id)}" alt="${ext.name}" draggable="false">
              <span class="reward-item__name">${ext.name}</span>
              <span class="reward-item__desc">${ext.stat.toUpperCase()} +${ext.value}</span>
            </div>`;
          }
        } else if (node.reward.type === 'item') {
          html += `<div class="reward-item"><span class="reward-item__name">${node.reward.key} ×${node.reward.qty}</span></div>`;
        }
      }
      if (node.itemReward) {
        html += `<div class="reward-item"><span class="reward-item__name">${node.itemReward.key === 'hi_potion' ? '高級回復薬' : node.itemReward.key} ×${node.itemReward.qty}</span></div>`;
      }
      if (node.xpReward) {
        html += `<div class="reward-item"><span class="reward-item__name">経験値 +${node.xpReward}</span></div>`;
      }
      html += '</div>';
      card.innerHTML = html;

      const btn = document.createElement('button');
      btn.className = 'btn menu-close';
      btn.textContent = 'OK';
      btn.addEventListener('click', () => {
        audio.playSe('confirm');
        this.overlay.classList.add('hidden');
        resolve();
      });
      card.appendChild(btn);
      this.overlay.appendChild(card);
    });
  }
}
