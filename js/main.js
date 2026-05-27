/* ============================================================
   main.js — game entry point and scene orchestration
   ============================================================ */

import {
  ASSETS, PLAYER, MITSUNARI, ENEMIES_DATA, SWARM_ENEMIES,
  SCENE1_DIALOGUE, SCENE2_DIALOGUE, SCENE3_DIALOGUE, VICTORY_DIALOGUE,
} from './constants.js';
import { DialogueSystem } from './dialogue.js';
import { BattleSystem } from './battle.js';
import { SceneRenderer, transition, screenShake, flashWhite, sleep } from './effects.js';

const dialogue = new DialogueSystem();
const battle = new BattleSystem();
const renderer = new SceneRenderer();

const $ = (id) => document.getElementById(id);

async function preloadImages(urls) {
  const bar = document.querySelector('.splash__bar');
  let loaded = 0;
  const total = urls.length;

  await Promise.all(urls.map(url =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (bar) bar.style.width = `${(loaded / total) * 100}%`;
        resolve();
      };
      img.src = url;
    })
  ));
}

async function init() {
  const imagesToPreload = [
    ASSETS.hero(PLAYER.imageId),
    ASSETS.hero(MITSUNARI.imageId),
    ...ENEMIES_DATA.map(e => ASSETS.enemy(e.imageId)),
    ...SWARM_ENEMIES.map(id => ASSETS.enemy(id)),
  ];

  await preloadImages(imagesToPreload);

  const splash = $('splash');
  splash.style.opacity = '0';
  await sleep(500);
  splash.classList.add('hidden');

  $('titleScreen').classList.remove('hidden');
  $('btnPressStart').addEventListener('click', startGame);
}

async function startGame() {
  $('titleScreen').classList.add('hidden');
  $('gameContainer').classList.remove('hidden');

  await scene1_falling();
  await transition('black');
  await scene2_awakening();
  await scene3_battle();
}

async function scene1_falling() {
  renderer.clear();
  renderer.drawSky();

  await sleep(800);

  const spriteSize = Math.min(96, window.innerWidth * 0.2);
  const sprite = renderer.addSpriteCenter(
    ASSETS.hero(PLAYER.imageId),
    spriteSize,
    { className: 'sprite--fall', id: 'player-sprite', offsetY: -30 }
  );

  await sleep(1200);

  await dialogue.show(SCENE1_DIALOGUE);

  renderer.clear();
}

async function scene2_awakening() {
  renderer.clear();

  await transition('unblack');

  renderer.drawGrassland();

  await sleep(600);

  const spriteSize = Math.min(80, window.innerWidth * 0.16);
  renderer.addSpriteCenter(
    ASSETS.hero(PLAYER.imageId),
    spriteSize,
    { id: 'player-ground', offsetY: 20 }
  );

  await dialogue.show(SCENE2_DIALOGUE.slice(0, 3));

  screenShake();
  await sleep(300);

  renderer.addEnemySwarm(SWARM_ENEMIES, ASSETS.enemy);

  await sleep(500);
  flashWhite();
  await sleep(300);

  await dialogue.show(SCENE2_DIALOGUE.slice(3));

  await transition('black');
  await sleep(500);

  renderer.clear();
  await scene3_mitsunari_entrance();
}

async function scene3_mitsunari_entrance() {
  await transition('unblack');

  renderer.drawGrassland();
  await sleep(300);

  flashWhite();
  screenShake();
  await sleep(200);

  const mitsunariSize = Math.min(96, window.innerWidth * 0.2);
  const mitsunariSprite = renderer.addSpriteCenter(
    ASSETS.hero(MITSUNARI.imageId),
    mitsunariSize,
    { className: 'sprite--bounce', id: 'mitsunari-entrance', offsetY: -30 }
  );

  await sleep(600);

  await dialogue.show(SCENE3_DIALOGUE);

  renderer.clear();
}

async function scene3_battle() {
  setTimeout(() => {
    battle.addAlly({ ...MITSUNARI });
    battle._addLog('石田三成が駆けつけた！', 'info');
  }, 3000);

  const victory = await battle.start(
    [{ ...PLAYER }],
    ENEMIES_DATA.map(e => ({ ...e })),
    1001
  );

  if (victory) {
    await sleep(500);
    battle.hide();
    renderer.clear();
    renderer.drawGrassland();

    const spriteSize = Math.min(80, window.innerWidth * 0.16);
    renderer.addSpriteCenter(ASSETS.hero(PLAYER.imageId), spriteSize, { offsetY: 40 });
    renderer.addSpriteCenter(ASSETS.hero(MITSUNARI.imageId), spriteSize, { offsetY: -40 });

    await dialogue.show(VICTORY_DIALOGUE);

    await transition('black');
    renderer.clear();
    await sleep(800);
    await transition('unblack');
    showEndScreen();
  }
}

function showEndScreen() {
  const container = $('gameContainer');
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1.5rem;padding:2rem;text-align:center;">
      <div style="font-size:clamp(1.2rem,4vw,2rem);font-weight:900;color:var(--accent);letter-spacing:0.08em;">
        第一章　完
      </div>
      <div style="color:var(--muted);font-size:0.9rem;line-height:1.8;">
        石田三成が仲間になった！<br>
        時空を超える冒険はまだ始まったばかり——
      </div>
      <div style="display:flex;gap:1rem;margin-top:1rem;">
        <img src="${ASSETS.hero(PLAYER.imageId)}" style="width:64px;height:64px;image-rendering:pixelated;" alt="Player" draggable="false">
        <img src="${ASSETS.hero(MITSUNARI.imageId)}" style="width:64px;height:64px;image-rendering:pixelated;" alt="石田三成" draggable="false">
      </div>
      <button class="title-screen__press" style="margin-top:1.5rem;" onclick="location.reload()">
        最初から
      </button>
      <div style="color:var(--muted);font-size:0.7rem;margin-top:1rem;">
        To be continued...
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', init);
