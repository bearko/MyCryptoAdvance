/* ============================================================
   input.js — 仮想スティック（スマホ）＋ キーボード（PC）

   スティックは画面下30%の「スティック画面」に常時表示され、
   そのエリアのどこを触ってもスティックがその位置へ移動して効く。
   ボタンは別タッチで同時に押せる（マルチタッチ対応）。
   ============================================================ */

const KEY_MAP = {
  arrowup: 'up', w: 'up', k: 'up',
  arrowdown: 'down', s: 'down', j: 'down',
  arrowleft: 'left', a: 'left', h: 'left',
  arrowright: 'right', d: 'right', l: 'right',
  ' ': 'action', enter: 'action', z: 'action', e: 'action',
  shift: 'attack', x: 'attack', f: 'attack',
};

export class Input {
  /**
   * @param {{pad: HTMLElement, stick: HTMLElement, knob: HTMLElement, buttons: HTMLElement[]}} els
   *   pad … スティックの受付エリア（下30%のペイン）
   */
  constructor(els) {
    this.padEl = els.pad;
    this.stickEl = els.stick;
    this.knobEl = els.knob;
    this.radius = 52;      // スティックの可動半径(px)
    this.deadzone = 6;

    // タイトルなどのオーバーレイ表示中は触らせない。
    // ここが true になる前にスティックが touchstart を preventDefault すると、
    // ボタンの click が発火しなくなる（スマホでタップが効かなくなる）。
    this.enabled = false;

    this.axis = { x: 0, y: 0 };
    this.magnitude = 0;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };

    this.held = new Set();     // 押しっぱなし
    this.pressed = new Set();  // このフレームで押された（consume で消える）
    this.keys = new Set();

    this._bindKeyboard();
    this._bindStick();
    this._bindButtons(els.buttons || []);
  }

  // --- キーボード ---
  _bindKeyboard() {
    const norm = e => (e.key || '').toLowerCase();
    window.addEventListener('keydown', e => {
      const k = norm(e);
      if (!this.enabled || !(k in KEY_MAP)) return;
      e.preventDefault();
      if (!this.keys.has(k)) {
        const name = KEY_MAP[k];
        if (name === 'action' || name === 'attack') this.pressed.add(name);
      }
      this.keys.add(k);
    });
    window.addEventListener('keyup', e => {
      const k = norm(e);
      if (k in KEY_MAP) this.keys.delete(k);
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.held.clear(); });
  }

  /** ボタンの上ではスティックを起動しない */
  _isUiTarget(target) {
    return !!(target && target.closest && target.closest('button, .pad'));
  }

  /** スティックが受付エリアからはみ出さない位置に寄せる */
  _placeStick(clientX, clientY) {
    const rect = this.padEl.getBoundingClientRect();
    const half = this.stickEl.offsetWidth / 2;
    const x = Math.min(Math.max(clientX - rect.left, half), Math.max(half, rect.width - half));
    const y = Math.min(Math.max(clientY - rect.top, half), Math.max(half, rect.height - half));
    this.stickEl.style.left = `${x}px`;
    this.stickEl.style.top = `${y}px`;
    return { x: rect.left + x, y: rect.top + y };   // 画面座標での中心
  }

  // --- 仮想スティック ---
  _bindStick() {
    const start = (id, x, y) => {
      if (!this.enabled) return false;
      if (this.pointerId !== null) return false;
      this.pointerId = id;
      this.origin = this._placeStick(x, y);
      this.stickEl.classList.add('is-active');
      this.knobEl.style.transform = 'translate(-50%, -50%)';
      this.axis.x = 0; this.axis.y = 0; this.magnitude = 0;
      // 触った位置そのものをスティック中心にするので、その場で少し倒しておく
      this._applyDelta(x - this.origin.x, y - this.origin.y);
      return true;
    };

    const move = (id, x, y) => {
      if (id !== this.pointerId) return;
      this._applyDelta(x - this.origin.x, y - this.origin.y);
    };

    const end = id => {
      if (id !== this.pointerId) return;
      this.pointerId = null;
      this.axis.x = 0; this.axis.y = 0; this.magnitude = 0;
      this.stickEl.classList.remove('is-active');
      this.stickEl.style.left = '';   // 定位置へ戻す
      this.stickEl.style.top = '';
      this.knobEl.style.transform = 'translate(-50%, -50%)';
    };

    this.padEl.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (this._isUiTarget(t.target)) continue;
        if (start(t.identifier, t.clientX, t.clientY)) e.preventDefault();
      }
    }, { passive: false });

    this.padEl.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.pointerId) {
          e.preventDefault();
          move(t.identifier, t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    const touchEnd = e => { for (const t of e.changedTouches) end(t.identifier); };
    this.padEl.addEventListener('touchend', touchEnd);
    this.padEl.addEventListener('touchcancel', touchEnd);

    // PC のマウスドラッグ
    this.padEl.addEventListener('mousedown', e => {
      if (this._isUiTarget(e.target)) return;
      if (start('mouse', e.clientX, e.clientY)) e.preventDefault();
    });
    window.addEventListener('mousemove', e => move('mouse', e.clientX, e.clientY));
    window.addEventListener('mouseup', () => end('mouse'));
  }

  /** 中心からのズレを軸の値とノブの位置に変換する */
  _applyDelta(dx, dy) {
    const len = Math.hypot(dx, dy);
    const vis = len > this.radius ? this.radius / len : 1;
    this.knobEl.style.transform =
      `translate(calc(-50% + ${dx * vis}px), calc(-50% + ${dy * vis}px))`;
    if (len < this.deadzone) {
      this.axis.x = 0; this.axis.y = 0; this.magnitude = 0;
      return;
    }
    const scale = Math.min(len, this.radius) / this.radius;
    this.axis.x = (dx / len) * scale;
    this.axis.y = (dy / len) * scale;
    this.magnitude = scale;
  }

  // --- 画面上のボタン ---
  _bindButtons(buttons) {
    for (const btn of buttons) {
      const name = btn.dataset.button;
      const down = e => {
        e.preventDefault();
        if (!this.enabled) return;
        btn.classList.add('is-down');
        if (!this.held.has(name)) this.pressed.add(name);
        this.held.add(name);
      };
      const up = e => {
        e.preventDefault();
        btn.classList.remove('is-down');
        this.held.delete(name);
      };
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up);
      btn.addEventListener('touchcancel', up);
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('mouseleave', up);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    }
  }

  /** スティックとキーボードを合成した移動入力（長さは 0..1） */
  moveVector() {
    let x = this.axis.x;
    let y = this.axis.y;
    let kx = 0, ky = 0;
    for (const k of this.keys) {
      const n = KEY_MAP[k];
      if (n === 'up') ky -= 1;
      else if (n === 'down') ky += 1;
      else if (n === 'left') kx -= 1;
      else if (n === 'right') kx += 1;
    }
    if (kx || ky) {
      const kl = Math.hypot(kx, ky);
      x += kx / kl;
      y += ky / kl;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, length: Math.min(len, 1) };
  }

  /** 押された瞬間を1回だけ拾う */
  consume(name) {
    if (!this.pressed.has(name)) return false;
    this.pressed.delete(name);
    return true;
  }

  isHeld(name) {
    if (this.held.has(name)) return true;
    for (const k of this.keys) if (KEY_MAP[k] === name) return true;
    return false;
  }

  /** フレーム終わりに未消費の押下を捨てる */
  endFrame() {
    this.pressed.clear();
  }
}
