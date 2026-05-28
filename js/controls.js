/* ============================================================
   controls.js — virtual joystick + keyboard
   - 動的スティック: タッチ位置に出現
   - 入力ターゲット: 画面下半分のみ（上半分はUI操作に開放）
   - destroy()で全リスナーを完全削除（タップリーク防止）
   ============================================================ */

import { MCS } from './constants.js';

export class Controls {
  constructor(container) {
    this.dx = 0;
    this.dy = 0;
    this.keys = {};
    this.touchId = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.joystickEl = null;
    this.knobEl = null;
    this.container = container;
    this.joystickRadius = MCS.JOYSTICK_RADIUS;
    this.joystickDeadzone = MCS.JOYSTICK_DEADZONE;

    this._createJoystick();
    this._bindKeyboard();
    this._bindTouch();
  }

  _createJoystick() {
    this.joystickEl = document.createElement('div');
    this.joystickEl.className = 'joystick hidden';
    this.joystickEl.style.width = `${this.joystickRadius * 2}px`;
    this.joystickEl.style.height = `${this.joystickRadius * 2}px`;
    this.knobEl = document.createElement('div');
    this.knobEl.className = 'joystick__knob';
    this.joystickEl.appendChild(this.knobEl);
    this.container.appendChild(this.joystickEl);
  }

  _bindKeyboard() {
    this._onKeyDown = e => { this.keys[e.key.toLowerCase()] = true; };
    this._onKeyUp   = e => { this.keys[e.key.toLowerCase()] = false; };
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  _isJoystickArea(x, y) {
    // 画面下半分のみアクティブ。HUD/ボタン領域は除外
    if (y < window.innerHeight * 0.5) return false;
    // 右上のミニマップとも被らないように、念のため右上隅も除外
    return true;
  }

  _isOnInteractive(target) {
    // ボタンやHUDボタンに当たった場合はジョイスティックを起動しない
    if (!target) return false;
    let el = target;
    while (el && el !== document.body) {
      if (el.tagName === 'BUTTON' || el.classList?.contains('hud-btn-tactic') || el.classList?.contains('hud-btn-pause')) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  _bindTouch() {
    this._onTouchStart = e => {
      if (this.touchId !== null) return;
      const t = e.changedTouches[0];
      // インタラクティブ要素 (ボタン等) なら無視
      if (this._isOnInteractive(e.target)) return;
      // アクティブエリア外（上半分など）なら無視
      if (!this._isJoystickArea(t.clientX, t.clientY)) return;
      e.preventDefault();
      this.touchId = t.identifier;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.joystickEl.classList.remove('hidden');
      this.joystickEl.style.left = `${t.clientX}px`;
      this.joystickEl.style.top = `${t.clientY}px`;
      this.knobEl.style.transform = 'translate(-50%, -50%)';
      this.dx = 0; this.dy = 0;
    };

    this._onTouchMove = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchId) continue;
        e.preventDefault();
        let tdx = t.clientX - this.touchStartX;
        let tdy = t.clientY - this.touchStartY;
        const len = Math.sqrt(tdx * tdx + tdy * tdy);
        const visualScale = len > this.joystickRadius ? this.joystickRadius / len : 1;
        const knobX = tdx * visualScale;
        const knobY = tdy * visualScale;
        this.knobEl.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        if (len < this.joystickDeadzone) {
          this.dx = 0; this.dy = 0;
        } else {
          const scale = Math.min(len, this.joystickRadius) / this.joystickRadius;
          this.dx = (tdx / len) * scale;
          this.dy = (tdy / len) * scale;
        }
      }
    };

    this._onTouchEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchId) continue;
        this.touchId = null;
        this.dx = 0;
        this.dy = 0;
        this.joystickEl.classList.add('hidden');
        this.knobEl.style.transform = 'translate(-50%, -50%)';
      }
    };

    this.container.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd);
    this.container.addEventListener('touchcancel', this._onTouchEnd);
  }

  update() {
    let kx = 0, ky = 0;
    if (this.keys['w'] || this.keys['arrowup'])    ky -= 1;
    if (this.keys['s'] || this.keys['arrowdown'])  ky += 1;
    if (this.keys['a'] || this.keys['arrowleft'])  kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;

    let x = this.dx + kx;
    let y = this.dy + ky;
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 1) { x /= mag; y /= mag; }
    return { dx: x, dy: y };
  }

  destroy() {
    if (this.joystickEl) this.joystickEl.remove();
    // キーボードリスナー除去
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp)   document.removeEventListener('keyup', this._onKeyUp);
    // タッチリスナー除去（これが無いとバトル後もコンテナでpreventDefaultが効き、
    // 他要素のclickが発火しなくなる致命的バグの原因）
    if (this._onTouchStart) this.container.removeEventListener('touchstart', this._onTouchStart);
    if (this._onTouchMove)  this.container.removeEventListener('touchmove', this._onTouchMove);
    if (this._onTouchEnd) {
      this.container.removeEventListener('touchend', this._onTouchEnd);
      this.container.removeEventListener('touchcancel', this._onTouchEnd);
    }
    this.keys = {};
    this.touchId = null;
    this.dx = 0; this.dy = 0;
  }
}
