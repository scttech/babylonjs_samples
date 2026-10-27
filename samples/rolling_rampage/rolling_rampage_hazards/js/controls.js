// The controls: the part that listens to the page. The rules (what a stick is, which way it
// pushes) are in steering.js and need no page; these two classes only watch the keys and the
// fingers and keep a stick up to date for the game to read. See ../tests/controls.tests.js.

// The keys steer with: the arrow keys and WASD. Everything else (R to roll again, C for a
// screenshot) is left alone, so those still work.
const STEERING_KEYS = new Set(Object.values(KEYS).flat());

// Which keys are held right now, and the stick they make. `target` is what hears the keys
// (the window); it can be anything with addEventListener, so a test can give it its own.
class KeyboardInput {
  constructor(target = window) {
    this.target = target;
    this.held = new Set();

    this.listeners = {
      keydown: (event) => {
        if (!STEERING_KEYS.has(event.code)) return;
        event.preventDefault(); // the arrow keys otherwise scroll the page
        this.held.add(event.code);
      },
      keyup: (event) => this.held.delete(event.code),
      // A key held down while the window loses focus never gets its keyup, and would be held for ever.
      blur: () => this.held.clear(),
    };
    for (const [type, listener] of Object.entries(this.listeners)) target.addEventListener(type, listener);
  }

  // The stick the held keys make.
  get stick() {
    return keyboardStick(this.held);
  }

  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.target.removeEventListener(type, listener);
    this.held.clear();
  }
}

// A stick under a thumb: touch (or pen) anywhere on `element` and drag. A ring is drawn where
// the thumb first touched, with a knob in it that follows the thumb. A mouse is ignored, so a
// click on a desktop doesn't start a stick. `ring` and `knob` are the two elements that draw it.
class StickControls {
  constructor(element, { ring = null, knob = null } = {}) {
    this.element = element;
    this.ring = ring;
    this.knob = knob;
    this.touchStick = new TouchStick();

    this.listeners = {
      pointerdown: (event) => this._down(event),
      pointermove: (event) => this._move(event),
      pointerup: (event) => this._up(event),
      pointercancel: (event) => this._up(event),
    };
    for (const [type, listener] of Object.entries(this.listeners)) element.addEventListener(type, listener);
  }

  // The stick the thumb makes.
  get value() {
    return this.touchStick.value;
  }

  _down(event) {
    if (event.pointerType === "mouse") return;
    this.touchStick.radius = stickRadiusFor(this.element.clientWidth, this.element.clientHeight);
    if (!this.touchStick.start(event.pointerId, event.clientX, event.clientY)) return;
    // Keep getting the finger's moves even if it slides off the element.
    if (this.element.setPointerCapture) this.element.setPointerCapture(event.pointerId);
    this._draw(event.clientX, event.clientY);
  }

  _move(event) {
    if (this.touchStick.move(event.pointerId, event.clientX, event.clientY)) this._draw(this.touchStick.originX, this.touchStick.originY);
  }

  _up(event) {
    if (this.touchStick.end(event.pointerId)) this._hide();
  }

  // Draws the ring, centred on (x, y), as big as the stick's reach, and the knob where the thumb is.
  _draw(x, y) {
    if (!this.ring || !this.knob) return;
    const radius = this.touchStick.radius;
    this.ring.style.width = this.ring.style.height = `${radius * 2}px`;
    this.ring.style.transform = `translate(${x - radius}px, ${y - radius}px)`;
    this.knob.style.transform = `translate(${this.touchStick.knob.x}px, ${this.touchStick.knob.y}px)`;
    this.ring.classList.remove("hidden");
  }

  _hide() {
    if (this.ring) this.ring.classList.add("hidden");
  }

  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.element.removeEventListener(type, listener);
    this.touchStick.end(this.touchStick.id);
    this._hide();
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STEERING_KEYS, KeyboardInput, StickControls };
} else {
  Object.assign(window, { STEERING_KEYS, KeyboardInput, StickControls });
}
