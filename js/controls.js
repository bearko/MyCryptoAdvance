/* ============================================================
   controls.js — touch joystick + keyboard input
   ============================================================ */

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
    this.joystickRadius = 50;
    this.active = false;

    this._createJoystick();
    this._bindKeyboard();
    this._bindTouch();
  }

  _createJoystick() {
    this.joystickEl = document.createElement('div');
    this.joystickEl.className = 'joystick hidden';
    this.knobEl = document.createElement('div');
    this.knobEl.className = 'joystick__knob';
    this.joystickEl.appendChild(this.knobEl);
    this.container.appendChild(this.joystickEl);
  }

  _bindKeyboard() {
    document.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  }

  _bindTouch() {
    this.container.addEventListener('touchstart', e => {
      if (this.touchId !== null) return;
      const t = e.changedTouches[0];
      if (t.clientX > window.innerWidth * 0.65) return;
      e.preventDefault();
      this.touchId = t.identifier;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.joystickEl.classList.remove('hidden');
      this.joystickEl.style.left = `${t.clientX}px`;
      this.joystickEl.style.top = `${t.clientY}px`;
      this.knobEl.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });

    this.container.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.touchId) continue;
        e.preventDefault();
        let tdx = t.clientX - this.touchStartX;
        let tdy = t.clientY - this.touchStartY;
        const dist = Math.sqrt(tdx * tdx + tdy * tdy);
        const max = this.joystickRadius;
        if (dist > max) { tdx = tdx / dist * max; tdy = tdy / dist * max; }
        this.knobEl.style.transform = `translate(calc(-50% + ${tdx}px), calc(-50% + ${tdy}px))`;
        this.dx = tdx / max;
        this.dy = tdy / max;
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
    if (this.touchId !== null) return { dx: this.dx, dy: this.dy };
    let kx = 0, ky = 0;
    if (this.keys['w'] || this.keys['arrowup'])    ky -= 1;
    if (this.keys['s'] || this.keys['arrowdown'])  ky += 1;
    if (this.keys['a'] || this.keys['arrowleft'])  kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;
    const mag = Math.sqrt(kx * kx + ky * ky);
    if (mag > 0) { kx /= mag; ky /= mag; }
    return { dx: kx, dy: ky };
  }

  destroy() {
    this.joystickEl.remove();
  }
}
