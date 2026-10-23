// Touch controls: swipes and taps on the picture. The rules (how far a finger must move to
// be a swipe, which way it went, what counts as a tap) are plain numbers and functions in
// `SwipeDetector`, so they can be tested without a screen. `TouchControls` is the thin
// part that listens to the page and feeds the detector. See ../tests/touch.tests.js.

const SWIPE_MIN = 24; // the shortest swipe, in pixels, however small the screen
const SWIPE_FRACTION = 0.06; // and a swipe is at least this much of the screen's smaller side
const TAP_MAX_MOVE = 12; // a finger that moves more than this isn't a tap
const TAP_MAX_TIME = 250; // and neither is one that stays down longer than this, in milliseconds

// How far a finger must travel to count as a swipe on a screen this size. It scales with the
// screen, so it takes the same small flick on a tablet as on a phone, and has a floor so a
// tiny window doesn't turn every touch into a swipe.
function swipeDistanceFor(width, height) {
  return Math.max(SWIPE_MIN, Math.min(width, height) * SWIPE_FRACTION);
}

// Which way a finger moved, as "left", "right", "up" or "down", or null if it didn't.
// The longer of the two directions wins; on screen, y grows downward.
function directionOf(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

// What each swipe makes the runner do: the same moves the keys make.
const SWIPE_MOVES = { left: "left", right: "right", up: "jump", down: "slide" };

// The move for a swipe, or null if it isn't one.
function swipeMove(direction) {
  return SWIPE_MOVES[direction] || null;
}

// Whether the screen is one you touch. Most of its answer comes from "coarse" pointers: a
// finger is a coarse pointer and a mouse is a fine one, so a laptop with a touch screen
// (and a mouse) says no. Without `matchMedia` it falls back on whether there are touch points.
function isTouchDevice({ maxTouchPoints = 0, matchMedia = null } = {}) {
  if (matchMedia) return matchMedia("(pointer: coarse)").matches;
  return maxTouchPoints > 0;
}

// The browser's answer, for the game to use.
function browserTouchEnvironment() {
  return {
    maxTouchPoints: typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
    matchMedia: typeof window !== "undefined" && window.matchMedia ? (query) => window.matchMedia(query) : null,
  };
}

// Follows one finger and says when it has swiped or tapped. It never looks at the screen:
// it is told where the finger is and when.
class SwipeDetector {
  constructor({ distance = SWIPE_MIN } = {}) {
    this.distance = distance; // how far counts as a swipe
    this.id = null; // the finger being followed (a second finger is ignored)
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.swipes = 0; // how many swipes this touch has made so far: 0 or 1
  }

  // Whether a finger is being followed.
  get active() {
    return this.id !== null;
  }

  // A finger has touched down. Only one is followed at a time, so a second finger is
  // ignored. Says whether this one is the one.
  start(id, x, y, time) {
    if (this.active) return false;
    this.id = id;
    this.startX = x;
    this.startY = y;
    this.startTime = time;
    this.swipes = 0;
    return true;
  }

  // The finger has moved. Returns a direction the moment it has gone far enough, and null
  // until then. A touch makes one swipe: the rest of a long drag does nothing, or one
  // flick across the screen would change lane three times. Lift the finger and swipe again.
  move(id, x, y) {
    if (id !== this.id || this.swipes > 0) return null;
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (Math.hypot(dx, dy) < this.distance) return null;
    this.swipes++;
    return directionOf(dx, dy);
  }

  // The finger has lifted. Returns "tap" if it was a quick touch that hardly moved, and
  // never made a swipe, and null otherwise. Either way it is no longer followed.
  end(id, x, y, time) {
    if (id !== this.id) return null;
    const moved = Math.hypot(x - this.startX, y - this.startY);
    const quick = time - this.startTime <= TAP_MAX_TIME;
    const tap = this.swipes === 0 && moved <= TAP_MAX_MOVE && quick;
    this.cancel();
    return tap ? "tap" : null;
  }

  // Lets go of the finger without saying anything (the browser took the touch away).
  cancel() {
    this.id = null;
    this.swipes = 0;
  }

}

// Listens for fingers on an element and calls `onSwipe(direction)` and `onTap()`. A mouse
// is ignored (its drags are not swipes), and so is anything but the first finger.
class TouchControls {
  constructor(element, { onSwipe = () => {}, onTap = () => {} } = {}) {
    this.element = element;
    this.onSwipe = onSwipe;
    this.onTap = onTap;
    this.detector = new SwipeDetector();

    this.listeners = {
      pointerdown: (event) => this._down(event),
      pointermove: (event) => this._move(event),
      pointerup: (event) => this._up(event),
      pointercancel: () => this.detector.cancel(),
    };
    for (const [type, listener] of Object.entries(this.listeners)) element.addEventListener(type, listener);
  }

  _down(event) {
    if (event.pointerType === "mouse") return;
    this.detector.distance = swipeDistanceFor(this.element.clientWidth, this.element.clientHeight);
    if (this.detector.start(event.pointerId, event.clientX, event.clientY, event.timeStamp)) {
      // Keep getting the finger's moves even if it slides off the element.
      if (this.element.setPointerCapture) this.element.setPointerCapture(event.pointerId);
    }
  }

  _move(event) {
    const direction = this.detector.move(event.pointerId, event.clientX, event.clientY);
    if (direction) this.onSwipe(direction);
  }

  _up(event) {
    if (this.detector.end(event.pointerId, event.clientX, event.clientY, event.timeStamp) === "tap") this.onTap();
  }

  // Stops listening.
  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.element.removeEventListener(type, listener);
    this.detector.cancel();
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector, TouchControls };
} else {
  Object.assign(window, { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector, TouchControls });
}

