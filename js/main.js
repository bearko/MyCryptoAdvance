/* ============================================================
   main.js — game entry, scene orchestration, stage loop
   ============================================================ */

import { ASSETS, HEROES, ENEMIES, EXTENSIONS, STAGE_NODES, NODE_CONNECTIONS, DIALOGUES, SWARM_ENEMY_IDS } from './constants.js';
import { gameState } from './state.js';
import { DialogueSystem } from './dialogue.js';
import { BattleSystem } from './battle.js';
import { SceneRenderer, transition, screenShake, flashWhite, sleep } from './effects.js';
import { MapSystem } from './map.js';
import { MenuSystem } from './menu.js';
import { audio } from './audio.js';

const dialogue = new DialogueSystem();
const battle = new BattleSystem();
const renderer = new SceneRenderer();
const map = new MapSystem();
const menu = new MenuSystem();

const $ = id => document.getElementById(id);

async function preloadImages(urls) {
  const bar = document.querySelector('.splash__bar');
  let loaded = 0;
  const total = urls.length;
  await Promise.all(urls.map(url =>
    new Promise(resolve => {
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
  const heroImages = Object.values(HEROES).map(h => ASSETS.hero(h.imageId));
  const enemyImages = [...new Set(Object.values(ENEMIES).map(e => ASSETS.enemy(e.imageId)))];
  const extImages = Object.values(EXTENSIONS).map(e => ASSETS.extension(e.id));
  const swarmImages = SWARM_ENEMY_IDS.map(id => ASSETS.enemy(id));
  const bgImages = [ASSETS.background(1001)];

  await preloadImages([...heroImages, ...enemyImages.slice(0, 15), ...extImages.slice(0, 6), ...swarmImages, ...bgImages]);

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

  audio._ensureCtx();

  gameState.reset();
  gameState.addHero('player');
  gameState.addHero('mitsunari');

  $('btnParty').addEventListener('click', () => menu.showPartyStatus());
  $('btnEquip').addEventListener('click', () => menu.showEquipMenu());
  $('btnMute').addEventListener('click', () => {
    const muted = audio.toggleMute();
    $('btnMute').textContent = muted ? '🔇' : '🔊';
  });

  await runPrologue();
  await runStageLoop();
}

async function runPrologue() {
  await scene_falling();
  await transition('black');
  await scene_awakening();
  await scene_mitsunari();

  gameState.completeNode('landing');
}

async function scene_falling() {
  renderer.clear();
  renderer.drawSky();
  await sleep(800);

  const sz = Math.min(96, window.innerWidth * 0.2);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), sz, { className: 'sprite--fall', id: 'player-sprite', offsetY: -30 });
  await sleep(1200);
  await dialogue.show(DIALOGUES.scene1_fall);
  renderer.clear();
}

async function scene_awakening() {
  renderer.clear();
  await transition('unblack');
  renderer.drawGrassland();
  await sleep(600);

  const sz = Math.min(80, window.innerWidth * 0.16);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), sz, { id: 'player-ground', offsetY: 20 });
  await dialogue.show(DIALOGUES.scene2_awaken);

  screenShake();
  await sleep(300);
  renderer.addEnemySwarm(SWARM_ENEMY_IDS, ASSETS.enemy);
  await sleep(500);
  flashWhite();
  await sleep(300);

  await dialogue.show(DIALOGUES.scene2_enemies);
  await transition('black');
  await sleep(500);
  renderer.clear();
}

async function scene_mitsunari() {
  await transition('unblack');
  renderer.drawGrassland();
  await sleep(300);

  flashWhite();
  screenShake();
  await sleep(200);

  const sz = Math.min(96, window.innerWidth * 0.2);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.mitsunari.imageId), sz, { className: 'sprite--bounce', offsetY: -30 });
  await sleep(600);

  await dialogue.show(DIALOGUES.scene3_mitsunari);
  renderer.clear();
  await transition('black');
  await sleep(300);
  await transition('unblack');
}

async function runStageLoop() {
  while (true) {
    $('mapHud').classList.remove('hidden');
    const node = await map.show();
    $('mapHud').classList.add('hidden');

    await processNode(node);

    if (node.id === 'sekigahara' && gameState.isNodeCompleted('sekigahara')) {
      await showChapterComplete();
      break;
    }
  }
}

async function processNode(node) {
  const introKey = getDialogueKey(node.id, 'intro');
  if (introKey && DIALOGUES[introKey]) {
    renderer.clear();
    renderer.drawGrassland();
    await dialogue.show(DIALOGUES[introKey]);
    renderer.clear();
  }

  if (node.recruit) {
    const hero = gameState.addHero(node.recruit);
    if (hero) {
      audio.playSe('item');
    }
  }

  if (node.type === 'camp') {
    gameState.healAll();
    await menu.showEquipMenu();
  }

  if (node.type === 'treasure' && !node.enemies) {
    if (!gameState.isNodeCompleted(node.id)) {
      if (node.reward && node.reward.type === 'extension') gameState.addExtension(node.reward.key);
      if (node.itemReward) gameState.addItem(node.itemReward.key, node.itemReward.qty);
    }
    await menu.showReward(node);
    gameState.completeNode(node.id);
    return;
  }

  if (node.type === 'battle' && node.enemies) {
    if (node.id === 'first_clash' && DIALOGUES.first_clash_intro) {
      await dialogue.show(DIALOGUES.first_clash_intro);
    }

    const allyUnits = gameState.party.filter(h => h.stats.hp > 0).map(h => gameState.toBattleUnit(h));
    const victory = await battle.start(allyUnits, node.enemies, 1001);

    if (victory) {
      gameState.syncFromBattle(battle.allies);
      await handleRewards(node);
    } else {
      gameState.healAll();
      return;
    }
  }

  if (node.type === 'boss' && node.waves) {
    await runBossBattle(node);
    return;
  }

  const victoryKey = getDialogueKey(node.id, 'victory');
  if (victoryKey && DIALOGUES[victoryKey]) {
    renderer.clear();
    renderer.drawGrassland();
    await dialogue.show(DIALOGUES[victoryKey]);
    renderer.clear();
  }

  gameState.completeNode(node.id);
}

async function runBossBattle(node) {
  for (let w = 0; w < node.waves.length; w++) {
    if (w > 0 && DIALOGUES.sekigahara_wave2) {
      await dialogue.show(DIALOGUES.sekigahara_wave2);
    }

    const allyUnits = gameState.party.filter(h => h.stats.hp > 0).map(h => gameState.toBattleUnit(h));
    const victory = await battle.start(allyUnits, node.waves[w], 1001);

    if (victory) {
      gameState.syncFromBattle(battle.allies);
      if (w < node.waves.length - 1) {
        gameState.party.forEach(h => {
          h.stats.hp = Math.min(gameState.getMaxHp(h), h.stats.hp + Math.floor(h.stats.maxHp * 0.3));
        });
      }
    } else {
      gameState.healAll();
      return;
    }
  }

  await handleRewards(node);

  if (DIALOGUES.sekigahara_victory) {
    renderer.clear();
    renderer.drawGrassland();

    const sz = Math.min(72, window.innerWidth * 0.14);
    const centerX = window.innerWidth / 2;
    const positions = [-80, 0, 80, -40];
    gameState.party.forEach((hero, i) => {
      renderer.addSprite(ASSETS.hero(hero.imageId), centerX + (positions[i] || 0) - sz / 2, window.innerHeight * 0.4, sz, {});
    });

    await dialogue.show(DIALOGUES.sekigahara_victory);
    renderer.clear();
  }

  gameState.completeNode(node.id);
}

async function handleRewards(node) {
  if (!gameState.isNodeCompleted(node.id)) {
    if (node.reward && node.reward.type === 'extension') gameState.addExtension(node.reward.key);
    if (node.reward && node.reward.type === 'item') gameState.addItem(node.reward.key, node.reward.qty);
    if (node.itemReward) gameState.addItem(node.itemReward.key, node.itemReward.qty);
  }

  if (node.xpReward) {
    const levelUps = gameState.addXp(node.xpReward);
    await menu.showReward(node);
    if (levelUps.length > 0) {
      await menu.showLevelUp(levelUps);
    }
  }
}

async function showChapterComplete() {
  await transition('black');
  renderer.clear();
  await sleep(800);
  await transition('unblack');

  audio.fadeBgm(2000);

  const container = $('gameContainer');
  container.innerHTML = `
    <div class="chapter-complete">
      <div class="chapter-complete__title">第一章　完</div>
      <div class="chapter-complete__sub">「関ヶ原の戦い」</div>
      <div class="chapter-complete__party"></div>
      <div class="chapter-complete__members"></div>
      <div class="chapter-complete__text">
        石田三成、甲斐姫、森蘭丸が仲間になった！<br>
        時空を超える冒険はまだ始まったばかり——
      </div>
      <button class="title-screen__press chapter-complete__btn" onclick="location.reload()">最初から</button>
      <div class="chapter-complete__tbc">To be continued...</div>
    </div>`;

  const partyEl = container.querySelector('.chapter-complete__members');
  gameState.party.forEach(hero => {
    const img = document.createElement('img');
    img.src = ASSETS.hero(hero.imageId);
    img.className = 'chapter-complete__hero';
    img.alt = hero.name;
    img.draggable = false;
    partyEl.appendChild(img);

    const nameEl = document.createElement('div');
    nameEl.className = 'chapter-complete__hero-name';
    nameEl.textContent = `${hero.name} Lv.${hero.level}`;
    partyEl.appendChild(nameEl);
  });
}

function getDialogueKey(nodeId, suffix) {
  const key = `${nodeId}_${suffix}`;
  return DIALOGUES[key] ? key : null;
}

document.addEventListener('DOMContentLoaded', init);
