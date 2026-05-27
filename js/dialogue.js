/* ============================================================
   dialogue.js — typewriter dialogue with portraits
   ============================================================ */

import { ASSETS, HEROES } from './constants.js';
import { audio } from './audio.js';

export class DialogueSystem {
  constructor() {
    this.layer = document.getElementById('dialogueLayer');
    this.portraitEl = document.getElementById('dialoguePortrait');
    this.speakerEl = document.getElementById('dialogueSpeaker');
    this.textEl = document.getElementById('dialogueText');
    this.indicatorEl = document.getElementById('dialogueIndicator');
    this.queue = [];
    this.currentIndex = 0;
    this.isTyping = false;
    this.fullText = '';
    this.charIndex = 0;
    this.typeTimer = null;
    this.resolve = null;
    this.typeSpeed = 35;
    this.charsSinceSound = 0;
    this._onClick = this._onClick.bind(this);
  }

  show(dialogues) {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.queue = dialogues;
      this.currentIndex = 0;
      this.layer.classList.remove('hidden');
      this.layer.classList.add('dialogue-layer--enter');
      setTimeout(() => this.layer.classList.remove('dialogue-layer--enter'), 300);
      document.addEventListener('click', this._onClick);
      document.addEventListener('touchend', this._onClick);
      document.addEventListener('keydown', this._onClick);
      this._showLine();
    });
  }

  _showLine() {
    if (this.currentIndex >= this.queue.length) {
      this.hide();
      return;
    }

    const line = this.queue[this.currentIndex];
    this.speakerEl.textContent = line.speaker || '';
    this.textEl.textContent = '';
    this.fullText = line.text;
    this.charIndex = 0;
    this.charsSinceSound = 0;
    this.isTyping = true;
    this.indicatorEl.style.visibility = 'hidden';

    if (line.portrait && HEROES[line.portrait]) {
      this.portraitEl.src = ASSETS.hero(HEROES[line.portrait].imageId);
      this.portraitEl.classList.remove('hidden');
    } else {
      this.portraitEl.classList.add('hidden');
    }

    this._typeNext();
  }

  _typeNext() {
    if (this.charIndex < this.fullText.length) {
      const ch = this.fullText[this.charIndex];
      this.textEl.textContent += ch;
      this.charIndex++;
      this.charsSinceSound++;
      if (this.charsSinceSound >= 3 && ch !== ' ' && ch !== '\n') {
        audio.playSe('text');
        this.charsSinceSound = 0;
      }
      const delay = (ch === '。' || ch === '！' || ch === '？' || ch === '…' || ch === '、')
        ? this.typeSpeed * 3 : this.typeSpeed;
      this.typeTimer = setTimeout(() => this._typeNext(), delay);
    } else {
      this.isTyping = false;
      this.indicatorEl.style.visibility = 'visible';
    }
  }

  _onClick(e) {
    if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();

    if (this.isTyping) {
      clearTimeout(this.typeTimer);
      this.textEl.textContent = this.fullText;
      this.isTyping = false;
      this.indicatorEl.style.visibility = 'visible';
    } else {
      audio.playSe('confirm');
      this.currentIndex++;
      this._showLine();
    }
  }

  hide() {
    this.layer.classList.add('hidden');
    this.portraitEl.classList.add('hidden');
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('touchend', this._onClick);
    document.removeEventListener('keydown', this._onClick);
    clearTimeout(this.typeTimer);
    if (this.resolve) { this.resolve(); this.resolve = null; }
  }
}
