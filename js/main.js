/* ============================================================
   main.js — game flow: prologue → stage1 → world map loop
   ============================================================ */

import { ASSETS, HEROES, TACTIC, DIALOGUES, SWARM_ENEMY_IDS, TERRITORY_STAGES, STAGE_WAVES } from './constants.js';
import { partyState } from './state.js';
import { DialogueSystem } from './dialogue.js';
import { GameEngine } from './engine.js';
import { Controls } from './controls.js';
import { SceneRenderer, transition, screenShake, flashWhite, sleep } from './effects.js';
import { audio } from './audio.js';
import { WorldMap } from './world-map.js';
import { HomeBase } from './home-base.js';

let dialogue, renderer, engine, controls, worldMap, homeBase;
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
  worldMap = new WorldMap();
  homeBase = new HomeBase();
  audio._ensureCtx();

  partyState.reset();
  partyState.addHero('player');

  await runPrologue();
  await runStage1();
  // ステージ1クリア後はワールドマップループへ
  await runWorldLoop();
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

async function runStage1() {
  const result = await runBattleStage({ stageKey: 'sekigahara_field', useDeploy: false });
  // 勝敗どちらでも本拠地を解放し、ワールドマップに移行（敗北はやり直し可能）
  partyState.conquerTerritory('home_camp');
  if (result.victory) {
    await dialogue.show(DIALOGUES.reach_exit);
    const rewards = partyState.awardStageRewards(result.kills, result.time, {}, result.maxCombo);
    await showStageClearResult({ ...result, terr: { name: '関ヶ原（脱出成功）' } }, rewards);
  } else {
    await showDefeatScreen(result);
  }
}

async function runWorldLoop() {
  while (true) {
    const action = await worldMap.show();
    if (action.action === 'home') {
      await homeBase.show();
    } else if (action.action === 'attack') {
      await attackTerritory(action.terr);
      // 全制覇判定（任意）
      if (partyState.isTerritoryConquered('attila_castle')) {
        await showWorldClear();
        break;
      }
    }
  }
}

async function attackTerritory(terr) {
  await transition('black');
  renderer.clear();
  // ステージ設定: TERRITORY_STAGESにあれば使用、なければ sekigahara_field
  const stageDef = TERRITORY_STAGES[terr.id];
  if (stageDef) {
    STAGE_WAVES[terr.id] = { ...stageDef, title: terr.name, bgm: 'pve.mp3' };
  }
  await transition('unblack');

  const result = await runBattleStage({ stageKey: stageDef ? terr.id : 'sekigahara_field', useDeploy: true });

  if (result.victory) {
    await transition('black');
    renderer.clear();
    await transition('unblack');
    renderer.drawGrassland();
    // 制圧処理
    partyState.conquerTerritory(terr.id);
    // 仲間化
    if (terr.recruit && !partyState.hasHero(terr.recruit)) {
      partyState.addHero(terr.recruit);
    }
    const rewards = partyState.awardStageRewards(result.kills, result.time, terr.reward || {}, result.maxCombo);
    if (terr.recruit) {
      const def = HEROES[terr.recruit];
      await dialogue.show([
        { speaker: def.name, text: `恩に着る、${HEROES.player.name === '？？？' ? '貴殿' : ''}よ。\n力を貸そう。`, portrait: terr.recruit },
        { speaker: '', text: `${def.name}が仲間になった！` },
      ]);
    } else {
      await dialogue.show([
        { speaker: '', text: `${terr.name}を制圧した！` },
      ]);
    }
    renderer.clear();
    await showStageClearResult({ ...result, terr }, rewards);
  } else {
    await transition('black'); renderer.clear(); await transition('unblack');
    await showDefeatScreen(result);
  }
}

async function runBattleStage({ stageKey, useDeploy }) {
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

  // パーティー初期化
  const party = [HEROES.player];
  engine.initStage(stageKey, party, HEROES);
  // プレイヤー装備
  const playerExt = partyState.equipment.player || HEROES.player.startingExtension || 'novice_katana';
  engine.equipExtension(engine.player, playerExt);

  // 出陣編成された仲間を即座に追加（useDeploy=true時）
  if (useDeploy) {
    for (const hk of partyState.getDeployedHeroes()) {
      const def = HEROES[hk];
      if (!def) continue;
      engine.addAlly(def);
      const ally = engine.allies[engine.allies.length - 1];
      const eqKey = partyState.equipment[hk] || def.startingExtension;
      if (eqKey && ally) engine.equipExtension(ally, eqKey);
    }
  }

  audio.playBgm('pve.mp3');

  let tacticIndex = 1;
  const tactics = [TACTIC.AGGRESSIVE, TACTIC.BALANCED, TACTIC.DEFENSIVE];
  $('btnTactic').textContent = tactics[tacticIndex].name;
  $('btnTactic').onclick = () => {
    tacticIndex = (tacticIndex + 1) % tactics.length;
    engine.setTactic(tactics[tacticIndex]);
    $('btnTactic').textContent = tactics[tacticIndex].name;
    audio.playSe('select');
  };

  $('btnPause').onclick = () => {
    if (engine.paused) { engine.resume(); $('btnPause').textContent = '⏸'; }
    else { engine.pause(); $('btnPause').textContent = '▶'; }
  };

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
  if (engine.destroy) engine.destroy();
  $('sceneLayer').classList.remove('hidden');

  return result;
}

async function showStageClearResult(result, rewards) {
  await transition('black'); await sleep(400); await transition('unblack');

  const container = $('gameContainer');
  // 既存UIを退避するためHTMLを直接書き換えるのではなく、リザルトレイヤーを使用
  let resultLayer = $('resultLayer');
  if (!resultLayer) {
    resultLayer = document.createElement('div');
    resultLayer.id = 'resultLayer';
    resultLayer.className = 'result-layer';
    container.appendChild(resultLayer);
  }
  resultLayer.classList.remove('hidden');

  resultLayer.innerHTML = `
    <div class="result-screen">
      <div class="result__title">STAGE CLEAR</div>
      <div class="result__sub">${result.terr ? result.terr.name : ''}</div>

      <div class="result__rank">
        <span class="rank-label">戦評価</span>
        <span class="rank-value rank-${(rewards.battleRank?.rank || 'D').replace('+', 'p')}">${rewards.battleRank?.rank || 'D'}</span>
        <span class="rank-mul">×${(rewards.battleRank?.mul || 1).toFixed(2)} 報酬</span>
      </div>
      <div class="result__stats">
        <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
        <div class="stat-item"><span class="stat-label">最大コンボ</span><span class="stat-value">${result.maxCombo || 0}</span></div>
        <div class="stat-item"><span class="stat-label">時間</span><span class="stat-value">${Math.floor(result.time / 60)}:${Math.floor(result.time % 60).toString().padStart(2, '0')}</span></div>
      </div>

      <div class="result__rewards">
        <div class="reward-row"><span class="reward-label">獲得経験値</span><span class="reward-value">+${rewards.xpAward}</span></div>
        <div class="reward-row"><span class="reward-label">獲得金</span><span class="reward-value reward-value--money">+${rewards.goldAward} G</span></div>
        ${rewards.materialAward ? `<div class="reward-row"><span class="reward-label">獲得素材</span><span class="reward-value reward-value--mat">+${rewards.materialAward} ⚒</span></div>` : ''}
        ${rewards.foodAward ? `<div class="reward-row"><span class="reward-label">獲得食料</span><span class="reward-value reward-value--food">+${rewards.foodAward} 🌾</span></div>` : ''}
      </div>

      <h3 class="result__section-title">仲間の成長</h3>
      <div class="result__party" id="resultParty"></div>

      <button class="title-screen__press result__btn" id="resultNext">ワールドマップへ</button>
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

  // スキップ機構: 画面タップ or ボタン押下で動作
  return new Promise(resolve => {
    const ctx = { skip: false, finished: false };
    let resolved = false;
    const btn = $('resultNext');

    const finish = () => {
      if (ctx.finished) return;
      ctx.skip = true;
      finalizeSnapshots(rewards.snapshots);
      ctx.finished = true;
      btn.textContent = 'ワールドマップへ';
      btn.classList.remove('result__btn--skipping');
    };

    const advance = () => {
      if (resolved) return;
      resolved = true;
      audio.playSe('confirm');
      resultLayer.classList.add('hidden');
      resultLayer.innerHTML = '';
      resolve();
    };

    // 1回目のタップ: スキップ → 即座に最終状態へ
    // 2回目のタップ: ワールドマップへ遷移
    // ボタンも背景も同じハンドラ
    const onTap = () => {
      if (!ctx.finished) finish();
      else advance();
    };

    // 画面/ボタン両方で受け付ける（ボタンも普通にバブルさせる）
    resultLayer.addEventListener('click', onTap);
    // タッチデバイス即応のため touchstart も同梱
    resultLayer.addEventListener('touchstart', e => {
      e.preventDefault();
      onTap();
    }, { passive: false });

    btn.textContent = 'タップでスキップ';
    btn.classList.add('result__btn--skipping');

    sleep(400).then(() => animatePartyXpGain(rewards.snapshots, ctx)).then(() => {
      // 自然終了時もfinalizeを通して状態を統一
      finish();
    });
  });
}

function finalizeSnapshots(snapshots) {
  for (const snap of snapshots) {
    const row = document.querySelector(`.party-row[data-hero-key="${snap.heroKey}"]`);
    if (!row) continue;
    const fill = row.querySelector('.xp-bar__fill');
    const cur = row.querySelector('.xp-cur');
    const maxEl = row.querySelector('.xp-max');
    const lvNum = row.querySelector('.lv-num');
    lvNum.textContent = snap.after.level;
    maxEl.textContent = snap.after.xpToNext;
    cur.textContent = snap.after.xp;
    fill.style.width = `${(snap.after.xp / snap.after.xpToNext) * 100}%`;
    if (snap.leveledUp) {
      row.classList.add('party-row--levelup');
      setTimeout(() => row.classList.remove('party-row--levelup'), 400);
    }
  }
}

async function animatePartyXpGain(snapshots, ctx) {
  for (const snap of snapshots) {
    if (ctx && ctx.skip) return; // スキップ要求 → 残りは finalize に任せる
    const row = document.querySelector(`.party-row[data-hero-key="${snap.heroKey}"]`);
    if (!row) continue;

    const evCount = snap.events.length || 1;
    const perEv = Math.max(80, Math.min(400, 2000 / evCount));
    const lvEvents = snap.events.filter(e => e.type === 'levelup');
    const lastLvEvent = lvEvents[lvEvents.length - 1];

    for (const ev of snap.events) {
      if (ctx && ctx.skip) return;
      if (ev.type === 'xp') {
        await animateXpBar(row, ev.from, ev.to, ev.max, perEv, ctx);
      } else if (ev.type === 'levelup') {
        const isLast = ev === lastLvEvent;
        await animateLevelUp(row, ev.newLevel, isLast ? perEv : Math.min(perEv, 150), ctx);
        const fill = row.querySelector('.xp-bar__fill');
        const cur = row.querySelector('.xp-cur');
        fill.style.width = '0%';
        cur.textContent = '0';
      }
    }
  }
}

function animateXpBar(row, from, to, max, targetMs, ctx) {
  return new Promise(resolve => {
    const fill = row.querySelector('.xp-bar__fill');
    const cur = row.querySelector('.xp-cur');
    const maxEl = row.querySelector('.xp-max');
    maxEl.textContent = max;
    const duration = targetMs || Math.min(600, 150 + (to - from) * 25);
    const start = performance.now();
    function step(now) {
      if (ctx && ctx.skip) { resolve(); return; }
      const t = Math.min(1, (now - start) / duration);
      const eased = t * (2 - t);
      const val = from + (to - from) * eased;
      fill.style.width = `${(val / max) * 100}%`;
      cur.textContent = Math.floor(val);
      if (t < 1) requestAnimationFrame(step);
      else { resolve(); }
    }
    requestAnimationFrame(step);
  });
}

function animateLevelUp(row, newLevel, durationMs, ctx) {
  return new Promise(resolve => {
    if (ctx && ctx.skip) { resolve(); return; }
    audio.playSe('levelup');
    const fx = row.querySelector('.party-row__levelup-fx');
    const lvNum = row.querySelector('.lv-num');
    row.classList.add('party-row--levelup');
    fx.classList.remove('hidden');
    lvNum.textContent = newLevel;
    const dur = durationMs || 700;
    const start = performance.now();
    // setIntervalで定期的にskip検出
    const interval = setInterval(() => {
      if ((ctx && ctx.skip) || performance.now() - start >= dur) {
        clearInterval(interval);
        fx.classList.add('hidden');
        row.classList.remove('party-row--levelup');
        resolve();
      }
    }, 30);
  });
}

async function showDefeatScreen(result) {
  return new Promise(resolve => {
    let layer = $('resultLayer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'resultLayer';
      layer.className = 'result-layer';
      $('gameContainer').appendChild(layer);
    }
    layer.classList.remove('hidden');
    layer.innerHTML = `
      <div class="result-screen result-screen--defeat">
        <div class="result__title result__title--defeat">DEFEATED</div>
        <div class="result__sub">力尽きた…</div>
        <div class="result__stats">
          <div class="stat-item"><span class="stat-label">撃破数</span><span class="stat-value">${result.kills}</span></div>
        </div>
        <button class="title-screen__press result__btn" id="defeatRetry">ワールドマップへ</button>
      </div>`;
    $('defeatRetry').addEventListener('click', () => {
      audio.playSe('confirm');
      layer.classList.add('hidden');
      layer.innerHTML = '';
      resolve();
    });
  });
}

async function showWorldClear() {
  await transition('black'); await sleep(500); await transition('unblack');
  const container = $('gameContainer');
  container.innerHTML = `
    <div class="chapter-complete">
      <div class="chapter-complete__title">WORLD CLEAR</div>
      <div class="chapter-complete__sub">第一章「戦国の地」攻略完了</div>
      <div class="chapter-complete__text">
        アッティラを討ち破り、戦国の地に平穏が戻った。<br>
        だが、クリプトワールドの戦いはまだ続く——
      </div>
      <button class="title-screen__press chapter-complete__btn" onclick="location.reload()">最初から</button>
    </div>`;
}

document.addEventListener('DOMContentLoaded', init);
