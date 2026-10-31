// Touch: playing with thumbs. A thumb stick under the left thumb to run (push it all the way to sprint), the rest of the screen to drag to look, a jump button
// under the right thumb, and a pause button. It speaks the same language as the keyboard: `input()` gives { forward, right, sprint, jump } like `moveInput`, and
// what the drag turned gives the same { dx, dy } as the mouse, so the game's own code does not know which it is being told. The arithmetic (how far a thumb is
// pushed, what is a dead zone, what a phone is) is plain functions in a table of numbers, tested without a screen; the controls and the buttons are built from
// the page's document. See ../tests/touch.tests.js.

const TOUCH = {
  stickRadius: 64, // pixels the thumb can be moved from where it was put down: the stick's reach
  deadZone: 0.15, // how much of the reach is no push at all (a thumb is never quite still)
  sprintAt: 0.85, // pushed this much of the way, the runner sprints
  lookScale: 1.6, // a drag looks this many times as far as a mouse that moved the same number of pixels (a thumb is slower than a wrist)
  stickZone: 0.45, // the left share of the screen where a touch is a stick; the rest is for looking
  landscapeRatio: 1.1, // a phone taller than this many times its width is held upright, and the game asks for it to be turned
};

// How far a thumb is pushed: `dx` and `dy` are pixels from where it went down (down the screen is positive). Gives { x, y, amount }: x and y are the push as a
// unit direction (right and up the screen are positive), and `amount` is 0 to 1, with the dead zone taken off and the rest stretched to fill the range.
function stickValue(dx, dy, table = TOUCH) {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0, amount: 0 };
  const reach = Math.min(1, length / table.stickRadius);
  const amount = reach <= table.deadZone ? 0 : (reach - table.deadZone) / (1 - table.deadZone);
  if (amount === 0) return { x: 0, y: 0, amount: 0 };
  return { x: dx / length, y: -dy / length, amount };
}

// What a stick says to the game: { forward, right, sprint }, the same as the keys. The push is not scaled (the runner runs at its own speeds): a push in
// a direction is that direction, and a push all the way is a sprint.
function stickInput(value, table = TOUCH) {
  if (value.amount === 0) return { forward: 0, right: 0, sprint: false };
  return { forward: value.y, right: value.x, sprint: value.amount >= table.sprintAt };
}

// Whether to use touch controls. `env` is { coarse: whether the main pointer is a finger (matchMedia "(pointer: coarse)"), touchPoints: how many fingers
// the device can feel at once, search: the page's query string }. Touch is on for a device that has a finger and a screen, and can be forced on (`?touch`)
// to try it with a mouse, or off (`?touch=off`) on a device that has both.
function isTouchDevice({ coarse = false, touchPoints = 0, search = "" } = {}) {
  const params = new URLSearchParams(search);
  const forced = params.get("touch");
  if (forced === "off" || forced === "0") return false;
  if (params.has("touch")) return true;
  return coarse && touchPoints > 0;
}

// Whether the phone is held upright, which is the wrong way for this game.
function needsLandscape(width, height, table = TOUCH) {
  return height > width * table.landscapeRatio;
}

// What the keyboard and the thumbs ask for together: the larger of each, and a sprint or a jump from either.
function mergeInput(a, b) {
  const pick = (x, y) => (Math.abs(x) >= Math.abs(y) ? x : y);
  return { forward: pick(a.forward, b.forward), right: pick(a.right, b.right), sprint: a.sprint || b.sprint, jump: a.jump || b.jump };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOUCH, stickValue, stickInput, isTouchDevice, needsLandscape, mergeInput };
} else {
  Object.assign(window, { TOUCH, stickValue, stickInput, isTouchDevice, needsLandscape, mergeInput });
}
