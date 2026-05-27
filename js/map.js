/* ============================================================
   map.js — node-based exploration map
   ============================================================ */

import { STAGE_NODES, NODE_CONNECTIONS } from './constants.js';
import { gameState } from './state.js';
import { audio } from './audio.js';

export class MapSystem {
  constructor() {
    this.layer = document.getElementById('mapLayer');
    this.canvas = document.getElementById('mapCanvas');
    this.nodesEl = document.getElementById('mapNodes');
    this.titleEl = document.getElementById('mapTitle');
    this.resolve = null;
  }

  show() {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.layer.classList.remove('hidden');
      audio.playBgm('land.mp3');
      this._render();
    });
  }

  hide() {
    this.layer.classList.add('hidden');
  }

  _render() {
    const available = gameState.getAvailableNodes(STAGE_NODES, NODE_CONNECTIONS);
    this._drawConnections();
    this.nodesEl.innerHTML = '';

    if (this.titleEl) {
      const completed = gameState.completedNodes.length;
      const total = STAGE_NODES.length;
      this.titleEl.textContent = `第一章 — 関ヶ原の戦い  (${completed}/${total})`;
    }

    STAGE_NODES.forEach(node => {
      const el = document.createElement('button');
      el.className = 'map-node';
      el.style.left = `${node.x}%`;
      el.style.top = `${node.y}%`;

      const completed = gameState.isNodeCompleted(node.id);
      const isAvailable = available.includes(node.id);
      const isBoss = node.type === 'boss';

      if (completed) {
        el.classList.add('map-node--completed');
      } else if (isAvailable) {
        el.classList.add('map-node--available');
        if (isBoss) el.classList.add('map-node--boss');
      } else {
        el.classList.add('map-node--locked');
        el.disabled = true;
      }

      const iconEl = document.createElement('span');
      iconEl.className = 'map-node__icon';
      iconEl.textContent = completed ? '✓' : node.icon;

      const label = document.createElement('span');
      label.className = 'map-node__label';
      label.textContent = node.name;

      el.append(iconEl, label);

      if (isAvailable && !completed) {
        el.addEventListener('click', () => {
          audio.playSe('confirm');
          this.hide();
          if (this.resolve) { this.resolve(node); this.resolve = null; }
        });
      }

      this.nodesEl.appendChild(el);
    });
  }

  _drawConnections() {
    const ctx = this.canvas.getContext('2d');
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    NODE_CONNECTIONS.forEach(([fromId, toId]) => {
      const from = STAGE_NODES.find(n => n.id === fromId);
      const to = STAGE_NODES.find(n => n.id === toId);
      if (!from || !to) return;

      const fx = from.x / 100 * this.canvas.width;
      const fy = from.y / 100 * this.canvas.height;
      const tx = to.x / 100 * this.canvas.width;
      const ty = to.y / 100 * this.canvas.height;

      const fromDone = gameState.isNodeCompleted(fromId);
      const toDone = gameState.isNodeCompleted(toId);

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = (fromDone && toDone) ? '#c4a35a' : fromDone ? 'rgba(196,163,90,0.5)' : 'rgba(61,53,80,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash(fromDone ? [] : [6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}
