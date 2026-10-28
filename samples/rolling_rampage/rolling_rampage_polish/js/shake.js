// A camera shake: a knock that makes the view jolt, and settle. It is a number that starts at the strength of the knock
// and fades to nothing, and the view is moved by an amount that wobbles with it. Nothing here touches the camera: it
// gives an offset, in world units, for the game to add to the view. See ../tests/shake.tests.js.

const SHAKE_DURATION = 0.4; // how long a shake lasts, in seconds
const SHAKE_STRENGTH = 0.5; // how far the view is thrown at the start of one, in world units
const SHAKE_SPEED = 55; // how fast it wobbles, in radians a second

// How much of a shake is left, from 1 when it starts to 0 when it is over. It fades quickly at first, and then
// settles, which is how a knock feels (a straight fade feels like a machine).
function shakeFade(age, duration = SHAKE_DURATION) {
  if (age >= duration) return 0;
  const left = 1 - Math.max(0, age) / duration;
  return left * left;
}

// Where the shake has put the view `age` seconds in, for a knock of `strength`: a pair of numbers (across and up the
// screen) that wobble with different speeds, so it jumps about and doesn't just slide back and forth.
function shakeOffset(age, strength = SHAKE_STRENGTH, duration = SHAKE_DURATION) {
  const amount = strength * shakeFade(age, duration);
  return { x: Math.sin(age * SHAKE_SPEED) * amount, y: Math.cos(age * SHAKE_SPEED * 1.3 + 1) * amount };
}

class Shake {
  constructor({ duration = SHAKE_DURATION, strength = SHAKE_STRENGTH } = {}) {
    this.duration = duration;
    this.strength = strength; // the strength of a knock of size 1: it can be changed while the game runs
    this.age = duration; // a shake that is over
    this.size = 0;
  }

  get active() {
    return this.age < this.duration;
  }

  // A knock of `size` (1 is a full one, 0.3 a little one). One that comes in the middle of a shake starts it over,
  // unless it is a smaller knock than what is left.
  knock(size = 1) {
    if (this.active && size < this.size * shakeFade(this.age, this.duration)) return;
    this.age = 0;
    this.size = size;
  }

  // Time passes (only while the game is going: a pause stops a shake where it is).
  update(dt) {
    if (this.active) this.age += dt;
  }

  // Where the view is moved to, across and up the screen: nothing, when there is no shake.
  get offset() {
    if (!this.active) return { x: 0, y: 0 };
    return shakeOffset(this.age, this.strength * this.size, this.duration);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHAKE_DURATION, SHAKE_STRENGTH, SHAKE_SPEED, shakeFade, shakeOffset, Shake };
} else {
  Object.assign(window, { SHAKE_DURATION, SHAKE_STRENGTH, SHAKE_SPEED, shakeFade, shakeOffset, Shake });
}
