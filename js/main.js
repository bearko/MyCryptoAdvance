/* ============================================================
   main.js — game flow: prologue → survival battle → results
   ============================================================ */

import { ASSETS, HEROES, TACTIC, LEVELUP_CHOICES, DIALOGUES, SWARM_ENEMY_IDS } from './constants.js';
import { DialogueSystem } from './dialogue.js';
import { GameEngine } from './engine.js';
import { Controls } from './controls.js';
import { SceneRenderer, transition, screenShake, flashWhite, sleep } from './effects.js';
import { audio } from './audio.js';

let dialogue, renderer, engine, controls;
const $ = id => document.getElementById(id);

async function preloadImages(urls) {
  const bar = document.querySelector('.splash__bar');
  let loaded = 0;
  const total = urls.length;
  await Promise.all(urls.map(url =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => { loaded++; if (bar) bar.style.width = `${(loaded / total) * 100}%`; resolve(); };
      img.src = url;
    })
  ));
}

async function init() {
  const heroImages = Object.values(HEROES).map(h => ASSETS.hero(h.imageId));
  const enemyIds = [101,102,103,104,106,111,112,113,116,121,122,123,131,132,133,136,161,162,166,181,184];
  const enemyImages = enemyIds.map(id => ASSETS.enemy(id));
  const swarmImages = SWARM_ENEMY_IDS.map(id => ASSETS.enemy(id));

  await preloadImages([...heroImages, ...enemyImages, ...swarmImages]);

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

  dialogue = new DialogueSystem();
  renderer = new SceneRenderer();
  audio._ensureCtx();

  await runPrologue();
  await runSurvivalBattle();
}

async function runPrologue() {
  renderer.clear();
  renderer.drawSky();
  await sleep(800);
  const sz = Math.min(96, window.innerWidth * 0.2);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), sz, { className: 'sprite--fall', offsetY: -30 });
  await sleep(1200);
  await dialogue.show(DIALOGUES.scene1_fall);
  renderer.clear();

  await transition('black');
  renderer.clear();
  await transition('unblack');
  renderer.drawGrassland();
  await sleep(600);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), Math.min(80, window.innerWidth * 0.16), { offsetY: 20 });
  await dialogue.show(DIALOGUES.scene2_awaken);

  screenShake(); await sleep(300);
  renderer.addEnemySwarm(SWARM_ENEMY_IDS, ASSETS.enemy);
  await sleep(500); flashWhite(); await sleep(300);
  await dialogue.show(DIALOGUES.scene2_enemies);

  await transition('black'); await sleep(500); renderer.clear();
  await transition('unblack');
  renderer.drawGrassland(); await sleep(300);
  flashWhite(); screenShake(); await sleep(200);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.mitsunari.imageId), Math.min(96, window.innerWidth * 0.2), { className: 'sprite--bounce', offsetY: -30 });
  await sleep(600);
  await dialogue.show(DIALOGUES.scene3_mitsunari);
  renderer.clear();
  await transition('black'); await sleep(300); await transition('unblack');

  await dialogue.show(DIALOGUES.get_katana);
}

async function runSurvivalBattle() {
  $('sceneLayer').classList.add('hidden');
  $('gameCanvas').classList.remove('hidden');
  $('battleHud').classList.remove('hidden');

  const gameCanvas = $('gameCanvas');
  const hud = {
    hp: $('hudHpFill'), hpText: $('hudHpText'),
    xpBar: $('hudXpFill'), level: $('hudLevel'),
    timer: $('hudTimer'), kills: $('hudKills'),
    remaining: $('hudRemaining'), allies: $('hudAllies'),
  };

  engine = new GameEngine(gameCanvas, hud);
  controls = new Controls($('gameContainer'));

  const spriteEntries = [];
  Object.values(HEROES).forEach(h => spriteEntries.push([`hero_${h.imageId}`, ASSETS.hero(h.imageId)]));
  [101,102,103,104,106,111,112,113,116,121,122,123,131,132,133,136,161,162,166,181,184].forEach(id =>
    spriteEntries.push([`enemy_${id}`, ASSETS.enemy(id)])
  );
  await engine.loadSprites(spriteEntries);

  const party = [HEROES.player, HEROES.mitsunari];
  engine.initStage('sekigahara_field', party);
  engine.equipWeapon('melee', 'slash', 10);

  audio.playBgm('pve.mp3');

  let tacticIndex = 1;
  const tactics = [TACTIC.AGGRESSIVE, TACTIC.BALANCED, TACTIC.DEFENSIVE];
  $('btnTactic').textContent = tactics[tacticIndex].name;
  $('btnTactic').addEventListener('click', () => {
    tacticIndex = (tacticIndex + 1) % tactics.length;
    engine.setTactic(tactics[tacticIndex]);
    $('btnTactic').textContent = tactics[tacticIndex].name;
    audio.playSe('select');
  });

  $('btnPause').addEventListener('click', () => {
    if (engine.paused) { engine.resume(); $('btnPause').textContent = '⏸'; }
    else { engine.pause(); $('btnPause').textContent = '▶'; }
  });

  engine.onLevelUp = (level) => {
    showLevelUpChoices(level);
  };

  engine.onRescue = async (heroKey) => {
    const heroDef = HEROES[heroKey];
    if (!heroDef) return;
    engine.addAlly(heroDef);
    const dlgKey = `rescue_${heroKey}`;
    if (DIALOGUES[dlgKey]) {
      engine.pause();
      await dialogue.show(DIALOGUES[dlgKey]);
      engine.resume();
    }
  };

  engine.onBoss = (wave) => {
    engine.spawnBoss(wave);
  };

  const result = await new Promise(resolve => {
    engine.onVictory = (stats) => resolve({ victory: true, ...stats, maxCombo: engine.maxCombo });
    engine.onDefeat = () => resolve({ victory: false, ...engine.getResults() });

    const updateLoop = () => {
      if (!engine.running && !engine.paused) return;
      engine.input = controls.update();
      requestAnimationFrame(updateLoop);
    };

    engine.start();
    updateLoop();
  });

  await audio.fadeBgm(1000);
  $('battleHud').classList.add('hidden');
  $('gameCanvas').classList.add('hidden');
  controls.destroy();
  $('sceneLayer').classList.remove('hidden');

  if (result.victory) {
    audio.playSe('victory');
    renderer.clear();
    renderer.drawGrassland();
    await dialogue.show(DIALOGUES.battle_victory);
    renderer.clear();
    await showChapterComplete(result);
  } else {
    audio.playSe('defeat');
    await showDefeatScreen(result);
  }
}

function showLevelUpChoices(level) {
  const overlay = $('levelUpOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'levelup-card';
  card.innerHTML = `<h2 class="levelup-title">LEVEL UP! — Lv.${level}</h2><div class="levelup-choices"></div>`;

  const choices = [];
  const pool = [...LEVELUP_CHOICES];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }

  const choicesEl = card.querySelector('.levelup-choices');
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'btn levelup-btn';
    btn.innerHTML = `<span class="levelup-btn__name">${choice.name}</span><span class="levelup-btn__desc">${choice.desc}</span>`;
    btn.addEventListener('click', () => {
      audio.playSe('levelup');
      overlay.classList.add('hidden');
      engine.applyLevelUp(choice);
    });
    choicesEl.appendChild(btn);
  });

  overlay.appendChild(card);
}

async function showChapterComplete(result) {
  await transition('black'); await sleep(500); await transition('unblack');

  const container = $('gameContainer');
  container.innerHTML = `
    <div class="chapter-complete">
      <div class="chapter-complete__title">STAGE CLEAR</div>
      <div class="chapter-complete__sub">第一章「関ヶ原の戦い」</div>
      <div class="chapter-complete__stats">
        <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
        <div class="stat-item"><span class="stat-label">最大コンボ</span><span class="stat-value">${result.maxCombo || 0}</span></div>
        <div class="stat-item"><span class="stat-label">到達レベル</span><span class="stat-value">Lv.${result.level}</span></div>
        <div class="stat-item"><span class="stat-label">クリア時間</span><span class="stat-value">${Math.floor(result.time / 60)}:${Math.floor(result.time % 60).toString().padStart(2, '0')}</span></div>
      </div>
      <div class="chapter-complete__text">
        クリプトワールドでの冒険は始まったばかり——<br>
        新たな時代と英雄が待っている
      </div>
      <button class="title-screen__press chapter-complete__btn" onclick="location.reload()">もう一度プレイ</button>
      <div class="chapter-complete__tbc">To be continued...</div>
    </div>`;
}

async function showDefeatScreen(result) {
  const container = $('gameContainer');
  container.innerHTML = `
    <div class="chapter-complete" style="--accent: var(--damage);">
      <div class="chapter-complete__title" style="color: var(--damage);">DEFEATED</div>
      <div class="chapter-complete__sub">力尽きた…</div>
      <div class="chapter-complete__stats">
        <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
        <div class="stat-item"><span class="stat-label">到達レベル</span><span class="stat-value">Lv.${result.level}</span></div>
      </div>
      <button class="title-screen__press chapter-complete__btn" onclick="location.reload()">リトライ</button>
    </div>`;
}

document.addEventListener('DOMContentLoaded', init);
