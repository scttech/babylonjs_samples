// Steering: turning what the player does (keys, or a thumb on a touch screen) into a push on
// the marble. It is all plain numbers, with no Babylon.js and no page, so the rules are easy
// to test. See ../tests/steering.tests.js.
//
// Every kind of input is boiled down to one thing, a "stick": { x, y }, where x is how far
// right and y is how far up the player wants to go, as seen on the screen, each from -1 to 1
// and never longer than 1 overall. From there it is the same whatever made it:
//   a stick (on the screen) -> a direction in the world -> a force on the marble.

const NO_STICK = { x: 0, y: 0 };

// How hard the marble is pushed at full stick, in units a second a second (its mass is 1).
const STEER_FORCE = 22;
// The speed above which pushing stops helping: a marble can be rolled faster than this by a
// slope, but not by the player.
const TOP_SPEED = 10;
// How much of the push there is when the marble is in the air, where there is nothing to push against.
const AIR_CONTROL = 0.25;

// A stick can't be longer than 1: a stick pushed to its corner is still only as strong as one
// pushed straight up, or going diagonally would be faster than going straight.
function clampStick(stick) {
  const length = Math.hypot(stick.x, stick.y);
  if (length <= 1) return { x: stick.x, y: stick.y };
  return { x: stick.x / length, y: stick.y / length };
}

// The stick for the keys held down: the arrow keys and WASD. `held` is a set of
// KeyboardEvent.code values. Opposite keys cancel, and a diagonal is as strong as a straight line.
const KEYS = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
};

function keyboardStick(held) {
  const any = (codes) => (codes.some((code) => held.has(code)) ? 1 : 0);
  return clampStick({ x: any(KEYS.right) - any(KEYS.left), y: any(KEYS.up) - any(KEYS.down) });
}

// Two sticks as one, for a player with a hand on the keys and a thumb on the screen.
function combineSticks(a, b) {
  return clampStick({ x: a.x + b.x, y: a.y + b.y });
}

// Which way, in the world, a stick points. The camera looks across the course from a corner, so
// "up on the screen" is not along an axis of the world but away from the camera along the
// diagonal, and "right on the screen" is at right angles to that. `alpha` is the angle round the
// vertical that the camera sits at (ISO_ALPHA, from camera.js). The camera is at
// (cos alpha, sin alpha) from what it looks at, so up on the screen is the other way, and right
// is that turned a quarter turn. The result is flat (y is 0) and as long as the stick is.
function worldDirection(stick, alpha) {
  const forward = { x: -Math.cos(alpha), z: -Math.sin(alpha) }; // away from the camera, along the ground
  const right = { x: forward.z, z: -forward.x }; // a quarter turn from forward, to the right on the screen
  return {
    x: right.x * stick.x + forward.x * stick.y,
    y: 0,
    z: right.z * stick.x + forward.z * stick.y,
  };
}

// The force to push the marble with: the direction the stick points in the world, at full
// strength, but fading to nothing as the marble gets to TOP_SPEED *in that direction*, and
// stronger when it is going the other way, so it can turn round quickly. In the air there is a
// quarter of the push. `velocity` is the marble's velocity, { x, y, z }. A marble with a different
// strength (an enemy's is less) can say so: `force` is its full push, and `topSpeed` the speed above which
// its push stops helping.
function steeringForce(direction, velocity, grounded, { force = STEER_FORCE, topSpeed = TOP_SPEED } = {}) {
  const length = Math.hypot(direction.x, direction.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  const unit = { x: direction.x / length, z: direction.z / length };
  const along = velocity.x * unit.x + velocity.z * unit.z; // how fast it is already going that way
  const fade = Math.min(2, Math.max(0, 1 - along / topSpeed));
  const strength = force * length * fade * (grounded ? 1 : AIR_CONTROL);
  return { x: unit.x * strength, y: 0, z: unit.z * strength };
}

// How far a thumb has to move from where it touched down to push the stick all the way: a
// fraction of the screen's smaller side, but never less than a minimum, so it is a comfortable
// thumb's length on a phone and on a tablet.
const STICK_RADIUS_FRACTION = 0.12;
const STICK_MIN_RADIUS = 40; // in pixels
// A thumb never keeps perfectly still, so a stick pushed less than this much counts as not pushed.
const STICK_DEAD_ZONE = 0.12;

function stickRadiusFor(width, height) {
  return Math.max(STICK_MIN_RADIUS, Math.min(width, height) * STICK_RADIUS_FRACTION);
}

// A stick made by a thumb on the screen. Wherever the thumb first touches is the middle of the
// stick, and moving it from there pushes the stick that way, as far as `radius` pixels for full
// strength. It never looks at the screen: it is told where the finger is. Like the swipes in the
// Parkour Runner, it follows one finger and ignores any other.
class TouchStick {
  constructor({ radius = 80, deadZone = STICK_DEAD_ZONE } = {}) {
    this.radius = radius;
    this.deadZone = deadZone;
    this.id = null; // the finger that is making the stick
    this.originX = 0; // where it touched down: the middle of the stick
    this.originY = 0;
    this.value = { x: 0, y: 0 }; // the stick, as the rest of the game wants it
    this.knob = { x: 0, y: 0 }; // how far, in pixels, the thumb is from the middle, kept within the radius, to draw it
  }

  get active() {
    return this.id !== null;
  }

  // A finger has touched down. Only one makes the stick. Says whether this one does.
  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.originX = x;
    this.originY = y;
    this.value = { x: 0, y: 0 };
    this.knob = { x: 0, y: 0 };
    return true;
  }

  // The finger has moved. On a screen y grows downward, and on a stick up is positive, so y is turned over.
  move(id, x, y) {
    if (id !== this.id) return false;
    const dx = x - this.originX;
    const dy = y - this.originY;
    const distance = Math.hypot(dx, dy);
    const reach = Math.min(1, this.radius / (distance || 1)); // how much of the way to the thumb the knob can go
    this.knob = { x: dx * reach, y: dy * reach };

    const pushed = clampStick({ x: dx / this.radius, y: -dy / this.radius });
    const strength = Math.hypot(pushed.x, pushed.y);
    if (strength < this.deadZone) {
      this.value = { x: 0, y: 0 };
    } else {
      const scaled = (strength - this.deadZone) / (1 - this.deadZone); // just past the dead zone is 0, not a jump
      this.value = { x: (pushed.x / strength) * scaled, y: (pushed.y / strength) * scaled };
    }
    return true;
  }

  // The finger has lifted: the stick is let go. Says whether it was this finger.
  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.value = { x: 0, y: 0 };
    this.knob = { x: 0, y: 0 };
    return true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, STICK_RADIUS_FRACTION, STICK_MIN_RADIUS, STICK_DEAD_ZONE, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce, stickRadiusFor, TouchStick };
} else {
  Object.assign(window, { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, STICK_RADIUS_FRACTION, STICK_MIN_RADIUS, STICK_DEAD_ZONE, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce, stickRadiusFor, TouchStick });
}
