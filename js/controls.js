/* ============================================================
   controls.js — virtual joystick + keyboard (MyCryptoSurvivor式)
   - 動的スティック: タッチ位置に出現
   - JOYSTICK_RADIUS=56, JOYSTICK_DEADZONE=8
   - 出力は正規化済みベクトル (|v|≤1)
   - 移動操作のターゲットは常に主人公
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

  _bindTouch() {
    this.container.addEventListener('touchstart', e => {
      if (this.touchId !== null) return;
      const t = e.changedTouches[0];
      // 画面右側1/3はUI領域として除外
      if (t.clientX > window.innerWidth * 0.66) return;
      e.preventDefault();
      this.touchId = t.identifier;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.joystickEl.classList.remove('hidden');
      this.joystickEl.style.left = `${t.clientX}px`;
      this.joystickEl.style.top = `${t.clientY}px`;
      this.knobEl.style.transform = 'translate(-50%, -50%)';
      this.dx = 0; this.dy = 0;
    }, { passive: false });

    this.container.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchId) continue;
        e.preventDefault();
        let tdx = t.clientX - this.touchStartX;
        let tdy = t.clientY - this.touchStartY;
        const len = Math.sqrt(tdx * tdx + tdy * tdy);
        // 視覚的にクランプ
        const visualScale = len > this.joystickRadius ? this.joystickRadius / len : 1;
        const knobX = tdx * visualScale;
        const knobY = tdy * visualScale;
        this.knobEl.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        // MCS: deadzone未満は無効
        if (len < this.joystickDeadzone) {
          this.dx = 0; this.dy = 0;
        } else {
          // 出力スケール: deflection / radius (0〜1)
          const scale = Math.min(len, this.joystickRadius) / this.joystickRadius;
          this.dx = (tdx / len) * scale;
          this.dy = (tdy / len) * scale;
        }
      }
    }, { passive: false });

    const endTouch = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchId) continue;
        this.touchId = null;
        this.dx = 0;
        this.dy = 0;
        this.joystickEl.classList.add('hidden');
        this.knobEl.style.transform = 'translate(-50%, -50%)';
      }
    };
    this.container.addEventListener('touchend', endTouch);
    this.container.addEventListener('touchcancel', endTouch);
  }

  update() {
    // タッチとキーボード両方を読んで合成
    let kx = 0, ky = 0;
    if (this.keys['w'] || this.keys['arrowup'])    ky -= 1;
    if (this.keys['s'] || this.keys['arrowdown'])  ky += 1;
    if (this.keys['a'] || this.keys['arrowleft'])  kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;

    let x = this.dx + kx;
    let y = this.dy + ky;
    // MCS式: 最終正規化（|v|≤1を保証）
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 1) { x /= mag; y /= mag; }
    return { dx: x, dy: y };
  }

  destroy() {
    this.joystickEl.remove();
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp)   document.removeEventListener('keyup', this._onKeyUp);
  }
}
