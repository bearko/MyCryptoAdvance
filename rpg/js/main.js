/* ============================================================
   main.js — 起動処理（ロード → タイトル → ゲーム開始）
   ============================================================ */

import { Game } from './game.js';

const root = document.getElementById('app');
const loadingEl = document.getElementById('loading');
const loadingBar = document.getElementById('loadingBar');
const loadingText = document.getElementById('loadingText');
const titleEl = document.getElementById('title');
const startBtn = document.getElementById('startBtn');
const hintEl = document.getElementById('hint');

function setProgress(ratio, text) {
  loadingBar.style.width = `${Math.round(ratio * 100)}%`;
  if (text) loadingText.textContent = text;
}

async function boot() {
  const game = new Game(root);
  try {
    await game.load(setProgress);
  } catch (err) {
    loadingText.textContent = `読み込みに失敗しました: ${err.message}`;
    console.error(err);
    return;
  }

  window.__rpg = game;   // デバッグ用
  loadingEl.classList.add('hidden');
  titleEl.classList.remove('hidden');

  const start = () => {
    titleEl.classList.add('hidden');
    game.start();
    setTimeout(() => hintEl.classList.add('is-faded'), 6000);
  };
  startBtn.addEventListener('click', start, { once: true });
}

// iOS のダブルタップズーム防止
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

boot();
