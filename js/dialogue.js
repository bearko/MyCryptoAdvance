/* ============================================================
   dialogue.js — typewriter dialogue system
   ============================================================ */

export class DialogueSystem {
  constructor() {
    this.layer = document.getElementById('dialogueLayer');
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
    this.typeSpeed = 40;
    this._onClick = this._onClick.bind(this);
  }

  show(dialogues) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.queue = dialogues;
      this.currentIndex = 0;
      this.layer.classList.remove('hidden');
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
    this.isTyping = true;
    this.indicatorEl.style.visibility = 'hidden';
    this._typeNext();
  }

  _typeNext() {
    if (this.charIndex < this.fullText.length) {
      this.textEl.textContent += this.fullText[this.charIndex];
      this.charIndex++;
      this.typeTimer = setTimeout(() => this._typeNext(), this.typeSpeed);
    } else {
      this.isTyping = false;
      this.indicatorEl.style.visibility = 'visible';
    }
  }

  _onClick(e) {
    if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();

    if (this.isTyping) {
      clearTimeout(this.typeTimer);
      this.textEl.textContent = this.fullText;
      this.isTyping = false;
      this.indicatorEl.style.visibility = 'visible';
    } else {
      this.currentIndex++;
      this._showLine();
    }
  }

  hide() {
    this.layer.classList.add('hidden');
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('touchend', this._onClick);
    document.removeEventListener('keydown', this._onClick);
    clearTimeout(this.typeTimer);
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
  }
}
