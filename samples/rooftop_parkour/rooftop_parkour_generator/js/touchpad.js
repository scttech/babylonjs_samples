// The thumbs: the stick, the look pad, and the controls that decide which finger is which. They are given the surface that is touched, and speak the language
// of touch.js (TOUCH, stickValue and stickInput are from there, which comes first). See ../tests/touchpad.tests.js.

// The stick: a thumb goes down somewhere, and the push is measured from there until it comes up. Only one finger is the stick's; another is ignored.
class Stick {
  constructor(table = TOUCH) {
    this.table = table;
    this.id = null;
    this.origin = null;
    this.dx = 0;
    this.dy = 0;
  }

  get active() {
    return this.id !== null;
  }

  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.origin = { x, y };
    this.dx = 0;
    this.dy = 0;
    return true;
  }

  move(id, x, y) {
    if (id !== this.id) return;
    this.dx = x - this.origin.x;
    this.dy = y - this.origin.y;
  }

  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.origin = null;
    this.dx = 0;
    this.dy = 0;
    return true;
  }

  // How the thumb is pushed now, as stickValue says, and where the knob should be drawn (held to the reach).
  get value() {
    return stickValue(this.dx, this.dy, this.table);
  }

  get knob() {
    const length = Math.hypot(this.dx, this.dy);
    const scale = length > this.table.stickRadius ? this.table.stickRadius / length : 1;
    return { x: this.dx * scale, y: this.dy * scale };
  }

  get input() {
    return stickInput(this.value, this.table);
  }
}

// The look pad: a finger dragged over the picture turns the view, by how far it moved each time. Only one finger looks.
class LookPad {
  constructor(table = TOUCH) {
    this.table = table;
    this.id = null;
    this.last = null;
    this.dx = 0;
    this.dy = 0;
  }

  get active() {
    return this.id !== null;
  }

  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.last = { x, y };
    return true;
  }

  move(id, x, y) {
    if (id !== this.id) return;
    this.dx += (x - this.last.x) * this.table.lookScale;
    this.dy += (y - this.last.y) * this.table.lookScale;
    this.last = { x, y };
  }

  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.last = null;
    return true;
  }

  // How far the drag has turned the view since the last time this was asked, and forgets it: { dx, dy }.
  take() {
    const turned = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return turned;
  }
}

// The controls on a page: the surface that is touched (the canvas), the buttons, and what they add up to. A finger that goes down on the left of the surface is the
// stick, one that goes down on the right is the look pad, and the buttons are their own. `enabled` can be changed at any time (and a finger that is down is let go of).
class TouchControls {
  constructor(surface, { enabled = false, table = TOUCH, width = () => surface.clientWidth } = {}) {
    this.surface = surface;
    this.table = table;
    this.width = width;
    this.enabled = enabled;
    this.stick = new Stick(table);
    this.pad = new LookPad(table);
    this.jumpIds = new Set(); // the fingers that are down on the jump button
    surface.addEventListener("pointerdown", (event) => this._down(event));
    surface.addEventListener("pointermove", (event) => this._move(event));
    for (const name of ["pointerup", "pointercancel"]) surface.addEventListener(name, (event) => this._up(event));
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.release();
  }

  // Lets go of everything: no stick, no look, no jump (the page was hidden, or touch was turned off).
  release() {
    this.stick.end(this.stick.id);
    this.pad.end(this.pad.id);
    this.jumpIds.clear();
  }

  _down(event) {
    if (!this.enabled) return;
    const x = event.clientX;
    const inStickZone = x < this.width() * this.table.stickZone;
    if (inStickZone) this.stick.start(event.pointerId, x, event.clientY);
    else this.pad.start(event.pointerId, x, event.clientY);
    try {
      this.surface.setPointerCapture(event.pointerId);
    } catch (error) {
      // a finger that is not there any more, or a pointer that was made by a test
    }
  }

  _move(event) {
    if (!this.enabled) return;
    this.stick.move(event.pointerId, event.clientX, event.clientY);
    this.pad.move(event.pointerId, event.clientX, event.clientY);
  }

  _up(event) {
    this.stick.end(event.pointerId);
    this.pad.end(event.pointerId);
  }

  // The jump button's fingers (the buttons are elements of their own: the page tells the controls which finger went down and up on them).
  jumpDown(id) {
    if (this.enabled) this.jumpIds.add(id);
  }

  jumpUp(id) {
    this.jumpIds.delete(id);
  }

  get jumpHeld() {
    return this.jumpIds.size > 0;
  }

  // What the thumbs ask for, as moveInput says.
  input() {
    return { ...this.stick.input, jump: this.jumpHeld };
  }

  // How far the drag has turned the view since last asked: { dx, dy }.
  take() {
    return this.pad.take();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Stick, LookPad, TouchControls };
} else {
  Object.assign(window, { Stick, LookPad, TouchControls });
}
