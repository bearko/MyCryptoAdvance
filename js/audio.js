/* ============================================================
   audio.js — audio system with BGM and synthesized SE
   ============================================================ */

import { ASSETS } from './constants.js';

class AudioManager {
  constructor() {
    this.bgm = null;
    this.bgmVolume = 0.3;
    this.seVolume = 0.5;
    this.ctx = null;
    this.muted = false;
    this.currentBgm = '';
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async playBgm(name) {
    if (this.muted || this.currentBgm === name) return;
    this.stopBgm();
    this.currentBgm = name;
    try {
      this.bgm = new Audio(ASSETS.bgm(name));
      this.bgm.loop = true;
      this.bgm.volume = this.bgmVolume;
      await this.bgm.play().catch(() => {});
    } catch {}
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.src = '';
      this.bgm = null;
    }
    this.currentBgm = '';
  }

  fadeBgm(duration = 1000) {
    return new Promise(resolve => {
      if (!this.bgm) { resolve(); return; }
      const start = this.bgm.volume;
      const steps = 20;
      const step = start / steps;
      const interval = duration / steps;
      let i = 0;
      const timer = setInterval(() => {
        i++;
        if (i >= steps || !this.bgm) {
          clearInterval(timer);
          this.stopBgm();
          resolve();
        } else {
          this.bgm.volume = Math.max(0, start - step * i);
        }
      }, interval);
    });
  }

  playSe(type) {
    if (this.muted) return;
    try {
      const ctx = this._ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = this.seVolume * 0.3;
      const now = ctx.currentTime;

      switch (type) {
        case 'hit':
          osc.type = 'sawtooth'; osc.frequency.value = 200;
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now); osc.stop(now + 0.15);
          break;
        case 'critical':
          osc.type = 'square'; osc.frequency.value = 400;
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gain.gain.value = this.seVolume * 0.4;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now); osc.stop(now + 0.25);
          break;
        case 'heal':
          osc.type = 'sine'; osc.frequency.value = 523;
          osc.frequency.exponentialRampToValueAtTime(1047, now + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now); osc.stop(now + 0.4);
          break;
        case 'select':
          osc.type = 'sine'; osc.frequency.value = 800;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now); osc.stop(now + 0.08);
          break;
        case 'confirm':
          osc.type = 'sine'; osc.frequency.value = 600;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now); osc.stop(now + 0.05);
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.type = 'sine'; osc2.frequency.value = 900;
          gain2.gain.value = this.seVolume * 0.3;
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc2.start(now + 0.06); osc2.stop(now + 0.15);
          break;
        case 'victory':
          this._playMelody(ctx, [523, 659, 784, 1047], 0.15, now);
          break;
        case 'defeat':
          this._playMelody(ctx, [440, 349, 294, 220], 0.2, now);
          break;
        case 'levelup':
          this._playMelody(ctx, [523, 659, 784, 880, 1047], 0.12, now);
          break;
        case 'item':
          osc.type = 'sine'; osc.frequency.value = 700;
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
          break;
        case 'text':
          osc.type = 'square'; osc.frequency.value = 440 + Math.random() * 60;
          gain.gain.value = this.seVolume * 0.08;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.start(now); osc.stop(now + 0.03);
          break;
        default:
          osc.type = 'sine'; osc.frequency.value = 440;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now); osc.stop(now + 0.1);
      }
    } catch {}
  }

  _playMelody(ctx, freqs, dur, startTime) {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = this.seVolume * 0.3;
      const t = startTime + i * dur;
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.5);
      osc.start(t); osc.stop(t + dur * 1.5);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgm) this.bgm.volume = 0;
    else if (!this.muted && this.bgm) this.bgm.volume = this.bgmVolume;
    return this.muted;
  }
}

export const audio = new AudioManager();
