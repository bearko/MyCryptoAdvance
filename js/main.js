/* ============================================================
   main.js — game flow: prologue → battle → result with rewards
   ============================================================ */

import { ASSETS, HEROES, TACTIC, DIALOGUES, SWARM_ENEMY_IDS } from './constants.js';
import { partyState } from './state.js';
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

  partyState.reset();
  partyState.addHero('player');

  await runPrologue();
  await runSurvivalBattle();
}

async function runPrologue() {
  renderer.clear();
  renderer.drawSky();
  await sleep(600);
  const sz = Math.min(96, window.innerWidth * 0.2);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), sz, { className: 'sprite--fall', offsetY: -30 });
  await sleep(1000);
  await dialogue.show(DIALOGUES.scene1_fall);

  await transition('black');
  renderer.clear();
  await transition('unblack');
  renderer.drawGrassland();
  await sleep(400);
  renderer.addSpriteCenter(ASSETS.hero(HEROES.player.imageId), Math.min(80, window.innerWidth * 0.16), { offsetY: 20 });
  await dialogue.show(DIALOGUES.scene_alone);

  renderer.clear();
}

async function runSurvivalBattle() {
  $('sceneLayer').classList.add('hidden');
  $('gameCanvas').classList.remove('hidden');
  $('battleHud').classList.remove('hidden');

  const overlay = $('transitionOverlay');
  overlay.className = 'transition-overlay hidden';

  const gameCanvas = $('gameCanvas');
  const hud = {
    hp: $('hudHpFill'), hpText: $('hudHpText'),
    level: $('hudLevel'),
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

  const party = [HEROES.player];
  engine.initStage('sekigahara_field', party, HEROES);
  engine.equipExtension(engine.player, HEROES.player.startingExtension || 'novice_katana');

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

  engine.onEncounter = async (fh) => {
    engine.pause();
    const dlgKey = `encounter_${fh.heroKey}`;
    if (DIALOGUES[dlgKey]) {
      await dialogue.show(DIALOGUES[dlgKey]);
    }
    engine.completeEncounter(fh);
    engine.resume();
  };

  const result = await new Promise(resolve => {
    engine.onVictory = (stats) => resolve({ victory: true, ...stats });
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
    await dialogue.show(DIALOGUES.reach_exit);
    renderer.clear();

    // ステージ報酬を計算してリザルト表示
    const rewards = partyState.awardStageRewards(result.kills, result.time);
    await showStageClearResult(result, rewards);
  } else {
    audio.playSe('defeat');
    await showDefeatScreen(result);
  }
}

async function showStageClearResult(result, rewards) {
  await transition('black'); await sleep(400); await transition('unblack');

  const container = $('gameContainer');
  container.innerHTML = `
    <div class="result-screen">
      <div class="result__title">STAGE CLEAR</div>
      <div class="result__sub">第一章ステージ1「関ヶ原の戦場」　— 脱出成功</div>

      <div class="result__stats">
        <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
        <div class="stat-item"><span class="stat-label">最大コンボ</span><span class="stat-value">${result.maxCombo || 0}</span></div>
        <div class="stat-item"><span class="stat-label">クリア時間</span><span class="stat-value">${Math.floor(result.time / 60)}:${Math.floor(result.time % 60).toString().padStart(2, '0')}</span></div>
      </div>

      <div class="result__rewards">
        <div class="reward-row"><span class="reward-label">獲得経験値</span><span class="reward-value">+${rewards.xpAward}</span></div>
        <div class="reward-row"><span class="reward-label">獲得ゴールド</span><span class="reward-value reward-value--money">${rewards.moneyAward} G　(所持 ${rewards.money} G)</span></div>
      </div>

      <h3 class="result__section-title">仲間の成長</h3>
      <div class="result__party" id="resultParty"></div>

      <button class="title-screen__press result__btn" id="resultNext">次へ</button>
    </div>`;

  const partyEl = $('resultParty');
  rewards.snapshots.forEach(snap => {
    const heroDef = HEROES[snap.heroKey];
    if (!heroDef) return;
    const row = document.createElement('div');
    row.className = 'party-row';
    row.dataset.heroKey = snap.heroKey;
    row.innerHTML = `
      <img class="party-row__portrait" src="${ASSETS.hero(heroDef.imageId)}" alt="${heroDef.name}" draggable="false">
      <div class="party-row__info">
        <div class="party-row__head">
          <span class="party-row__name">${heroDef.name}</span>
          <span class="party-row__level">Lv.<span class="lv-num">${snap.before.level}</span></span>
        </div>
        <div class="party-row__xp">
          <div class="xp-bar"><div class="xp-bar__fill" style="width: ${(snap.before.xp / snap.before.xpToNext) * 100}%"></div></div>
          <span class="xp-text"><span class="xp-cur">${snap.before.xp}</span> / <span class="xp-max">${snap.before.xpToNext}</span></span>
        </div>
      </div>
      <div class="party-row__levelup-fx hidden">LEVEL UP!</div>
    `;
    partyEl.appendChild(row);
  });

  // アニメーション再生
  await sleep(600);
  await animatePartyXpGain(rewards.snapshots);

  $('resultNext').addEventListener('click', () => location.reload());
}

async function animatePartyXpGain(snapshots) {
  // 順番にXPバーをアニメーション
  for (const snap of snapshots) {
    const row = document.querySelector(`.party-row[data-hero-key="${snap.heroKey}"]`);
    if (!row) continue;

    for (const ev of snap.events) {
      if (ev.type === 'xp') {
        await animateXpBar(row, ev.from, ev.to, ev.max, ev.level);
      } else if (ev.type === 'levelup') {
        await animateLevelUp(row, ev.newLevel);
        // 次のXPイベントの最大値は新レベル基準なので、バーをリセット
        const fill = row.querySelector('.xp-bar__fill');
        const cur = row.querySelector('.xp-cur');
        const maxEl = row.querySelector('.xp-max');
        fill.style.width = '0%';
        cur.textContent = '0';
      }
    }
  }
}

function animateXpBar(row, from, to, max, level) {
  return new Promise(resolve => {
    const fill = row.querySelector('.xp-bar__fill');
    const cur = row.querySelector('.xp-cur');
    const maxEl = row.querySelector('.xp-max');
    maxEl.textContent = max;
    const duration = Math.min(800, 200 + (to - from) * 30);
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t * (2 - t); // easeOutQuad
      const val = from + (to - from) * eased;
      fill.style.width = `${(val / max) * 100}%`;
      cur.textContent = Math.floor(val);
      if (t < 1) requestAnimationFrame(step);
      else { audio.playSe('select'); resolve(); }
    }
    requestAnimationFrame(step);
  });
}

function animateLevelUp(row, newLevel) {
  return new Promise(resolve => {
    audio.playSe('levelup');
    const fx = row.querySelector('.party-row__levelup-fx');
    const lvNum = row.querySelector('.lv-num');
    row.classList.add('party-row--levelup');
    fx.classList.remove('hidden');
    lvNum.textContent = newLevel;
    setTimeout(() => {
      fx.classList.add('hidden');
      row.classList.remove('party-row--levelup');
      resolve();
    }, 700);
  });
}

async function showDefeatScreen(result) {
  const container = $('gameContainer');
  container.innerHTML = `
    <div class="result-screen result-screen--defeat">
      <div class="result__title result__title--defeat">DEFEATED</div>
      <div class="result__sub">力尽きた…</div>
      <div class="result__stats">
        <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
      </div>
      <button class="title-screen__press result__btn" onclick="location.reload()">リトライ</button>
    </div>`;
}

document.addEventListener('DOMContentLoaded', init);
