// The scout: a runner that walks about the district on the ground, so the district can be looked at from inside. It is a first, simple
// kind of movement: flat ground, no jumping, and walls (the buildings are boxes it can't walk into). The next tutorial replaces it with
// a character controller that has gravity, slopes and steps. Everything here is plain numbers (keys in, a position out), so it is tested
// without a page. See ../tests/scout.tests.js.

const SCOUT = {
  jogSpeed: 4.5, // metres a second
  sprintSpeed: 7.5,
  acceleration: 20, // metres a second, each second: how quickly the runner gets up to speed, and stops
  turnRate: 12, // radians a second: how quickly the body turns to face the way it is going
  radius: 0.45, // how wide the runner is, for the walls
  stepRate: 25, // how quickly the runner's feet follow the ground up and down (a curb is a step of 15 centimetres): a share of the gap each second
};

// The keys, by what they do. A key is named by its `code` (the key's place on the keyboard, so WASD works on any layout).
const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  sprint: ["ShiftLeft", "ShiftRight"],
};

// Every key the scout uses, so the page knows which to take for itself (the arrow keys would scroll the page).
const ALL_MOVE_KEYS = new Set(Object.values(MOVE_KEYS).flat());

// Whether a key was typed into a box of text (the developer panel has none, but a page may), where it is for spelling, not for running.
function typesText(event) {
  const target = event.target;
  return Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"));
}

const anyHeld = (held, codes) => codes.some((code) => held.has(code));

// What the keys held down ask for: { forward, right } each -1, 0 or 1 (both of a pair cancel), and whether to sprint.
function moveInput(held) {
  return {
    forward: (anyHeld(held, MOVE_KEYS.forward) ? 1 : 0) - (anyHeld(held, MOVE_KEYS.back) ? 1 : 0),
    right: (anyHeld(held, MOVE_KEYS.right) ? 1 : 0) - (anyHeld(held, MOVE_KEYS.left) ? 1 : 0),
    sprint: anyHeld(held, MOVE_KEYS.sprint),
  };
}

// The way to go on the ground, as a unit vector { x, z }, for an input and the way the camera looks (yaw): "forward" is where the
// camera looks, and "right" is to the right of that. With no keys, or keys that cancel, there is nowhere to go: null.
function moveDirection(input, yaw) {
  const x = Math.sin(yaw) * input.forward + Math.cos(yaw) * input.right;
  const z = Math.cos(yaw) * input.forward - Math.sin(yaw) * input.right;
  const length = Math.hypot(x, z);
  return length === 0 ? null : { x: x / length, z: z / length };
}

// Turns an angle toward another by at most `step`, the short way round.
function turnToward(current, target, step) {
  const difference = wrapAngle(target - current);
  return Math.abs(difference) <= step ? target : wrapAngle(current + Math.sign(difference) * step);
}

// Pushes a circle out of a box, if they overlap: where the middle of a circle of this radius at (x, z) should be so that it is outside
// `box` ({ minX, maxX, minZ, maxZ }). If it doesn't touch the box, it is where it was.
function pushOutOfBox(x, z, radius, box) {
  const nearestX = Math.min(box.maxX, Math.max(box.minX, x));
  const nearestZ = Math.min(box.maxZ, Math.max(box.minZ, z));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  const distance = Math.hypot(dx, dz);
  if (distance >= radius) return { x, z };
  if (distance > 0) return { x: nearestX + (dx / distance) * radius, z: nearestZ + (dz / distance) * radius };
  // The middle is inside the box: leave by whichever side is nearest.
  const exits = [
    { x: box.minX - radius, z, cost: x - box.minX },
    { x: box.maxX + radius, z, cost: box.maxX - x },
    { x, z: box.minZ - radius, cost: z - box.minZ },
    { x, z: box.maxZ + radius, cost: box.maxZ - z },
  ];
  const best = exits.reduce((a, b) => (b.cost < a.cost ? b : a));
  return { x: best.x, z: best.z };
}

class Scout {
  // `boxes` are the walls: the footprints of the buildings. `bounds` is the edge of the world: { minX, maxX, minZ, maxZ }. `ground` is a
  // function that says how high the ground is at a place (x, z): the road is lower than the sidewalk.
  constructor({ x = 0, z = 0, heading = 0, boxes = [], bounds = null, ground = () => 0, options = SCOUT } = {}) {
    this.x = x;
    this.z = z;
    this.ground = ground;
    this.y = ground(x, z); // how high the feet are
    this.heading = heading; // the way the body faces, as a yaw
    this.speed = 0; // how fast it is going along the ground
    this.boxes = boxes;
    this.bounds = bounds;
    this.options = { ...options };
    this.start = { x, z, heading };
  }

  // Moves on by `dt` seconds. `direction` is where the keys ask to go (or null) and `sprint` whether they ask to go fast.
  update(direction, sprint, dt) {
    const { jogSpeed, sprintSpeed, acceleration, turnRate, radius } = this.options;
    const wanted = direction ? (sprint ? sprintSpeed : jogSpeed) : 0;
    const change = acceleration * dt;
    this.speed = Math.abs(wanted - this.speed) <= change ? wanted : this.speed + Math.sign(wanted - this.speed) * change;

    if (direction) this.heading = turnToward(this.heading, Math.atan2(direction.x, direction.z), turnRate * dt);
    // The body goes the way it is facing, so that a turn is a curve and not a slide sideways.
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;

    // The feet follow the ground up and down, a share of the way each frame, so that a curb is a quick step and not a jump.
    const follow = 1 - Math.exp(-this.options.stepRate * dt);
    this.y += (this.ground(this.x, this.z) - this.y) * follow;

    for (let pass = 0; pass < 2; pass++) {
      for (const box of this.boxes) {
        const out = pushOutOfBox(this.x, this.z, radius, box);
        this.x = out.x;
        this.z = out.z;
      }
    }
    if (this.bounds) {
      this.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.x));
      this.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.z));
    }
  }

  // Back to where it began.
  reset() {
    Object.assign(this, this.start, { speed: 0 });
    this.y = this.ground(this.x, this.z);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCOUT, MOVE_KEYS, ALL_MOVE_KEYS, typesText, moveInput, moveDirection, turnToward, pushOutOfBox, Scout };
} else {
  Object.assign(window, { SCOUT, MOVE_KEYS, ALL_MOVE_KEYS, typesText, moveInput, moveDirection, turnToward, pushOutOfBox, Scout });
}
