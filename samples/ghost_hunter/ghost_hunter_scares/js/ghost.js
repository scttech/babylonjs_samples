// A ghost, as numbers. How it flickers, bobs, drifts, turns to look at the player, and fades in and out is plain arithmetic of the time,
// with no Babylon.js in it, so that the tests can say what a ghost does at any moment. How it looks is in ghostmesh.js, which only
// reads what is worked out here. See ../tests/ghost.tests.js.

const GHOST = {
  height: 1.8, // metres: a ghost is a little taller than a person
  hover: 0.25, // how far above the floor the hem of it floats
  opacity: 0.8, // the most it can show (1 would be a solid thing)
  fadeIn: 1.6, // seconds to appear
  fadeOut: 2.2, // seconds to vanish
  life: 28, // seconds before it fades away of itself
  summonDelay: 2.5, // seconds from a place being marked to the ghost beginning to appear
  flickerHz: 6, // how fast the light of it wavers
  flickerDepth: 0.4, // how far it dims at its dimmest (0 never, 1 right out)
  bobHz: 0.45, // how often it rises and falls
  bobHeight: 0.14,
  driftRadius: 0.9, // metres: how far it wanders about the place it haunts
  driftHz: 0.1,
  turnRate: 2.2, // radians a second: how fast it turns to face you
  max: 4, // how many at once
};

const TAU = Math.PI * 2;

// A number from 0 up to 1 that is the same for the same input and looks random: a ghost's own phase comes from its seed.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// How much of its light a ghost has at a moment, from 1 down to 1 - depth. Three waves that do not fit together, so it never repeats
// in any way that can be seen: it wavers, and now and then it nearly goes out.
function flicker(time, seed = 0, table = GHOST) {
  const t = time * table.flickerHz * TAU + hash(seed) * TAU;
  const wave = 0.5 + 0.5 * (0.5 * Math.sin(t) + 0.3 * Math.sin(t * 2.31 + 1.7) + 0.2 * Math.sin(t * 0.37 + 4.1));
  const dip = Math.pow(Math.max(0, Math.sin(time * 0.9 + hash(seed + 1) * TAU)), 24); // a rare, sharp dip
  return 1 - table.flickerDepth * Math.max(0, Math.min(1, 1 - wave * (1 - dip) - dip * 0.6));
}

// How much of a ghost is there: 0 before it begins, up to 1 as it appears, 1 while it is there, and down to 0 as it fades (from
// `fadeStart`, the time it began to go, or never). Smooth at both ends: it does not pop.
function envelope(age, fadeStart, table = GHOST) {
  if (age <= 0) return 0;
  const smooth = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
  const rising = smooth(age / table.fadeIn);
  if (fadeStart === null || age < fadeStart) return rising;
  if (age >= fadeStart + table.fadeOut) return 0;
  return rising * smooth(1 - (age - fadeStart) / table.fadeOut);
}

// How high the ghost is above where it hovers: it rises and falls.
function bob(time, seed = 0, table = GHOST) {
  return Math.sin(time * table.bobHz * TAU + hash(seed + 2) * TAU) * table.bobHeight;
}

// Where it has drifted to from the place it haunts, [x, z]: a slow loop that does not close, so that it wanders and does not circle.
function drift(time, seed = 0, table = GHOST) {
  const a = time * table.driftHz * TAU + hash(seed + 3) * TAU;
  return [Math.sin(a) * table.driftRadius, Math.sin(a * 0.73 + 1.3) * table.driftRadius * 0.8];
}

// The yaw (a turn about the vertical, from straight ahead towards the right) that faces from one point to another.
function facingYaw(from, to) {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

// From one angle towards another by at most `step` radians, the short way round.
function turnToward(current, target, step) {
  let difference = (target - current) % TAU;
  if (difference > Math.PI) difference -= TAU;
  if (difference < -Math.PI) difference += TAU;
  return Math.abs(difference) <= step ? target : current + Math.sign(difference) * step;
}

class Apparition {
  // `home` is the place it haunts, [x, y, z] (y is the floor). `delay` is the seconds until it begins to appear.
  constructor({ id, home, seed = id, delay = 0, placement = null, table = GHOST }) {
    this.id = id;
    this.home = home.slice();
    this.seed = seed;
    this.placement = placement; // the mark it haunts, if any
    this.table = table;
    this.age = -delay; // negative: it has not begun
    this.fadeStart = null; // the age at which it began to go
    this.yaw = 0;
    this.done = false;
  }

  // The stage it is at: "waiting", "appearing", "present", "fading", "gone".
  get stage() {
    if (this.done) return "gone";
    if (this.age <= 0) return "waiting";
    if (this.fadeStart !== null && this.age >= this.fadeStart) return "fading";
    return this.age < this.table.fadeIn ? "appearing" : "present";
  }

  // Where it is now.
  position() {
    const [dx, dz] = drift(Math.max(0, this.age), this.seed, this.table);
    return [this.home[0] + dx, this.home[1] + this.table.hover + bob(Math.max(0, this.age), this.seed, this.table), this.home[2] + dz];
  }

  // How much it shows, from 0 to the table's opacity: there, and flickering.
  opacity() {
    return this.table.opacity * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table);
  }

  // Starts it going, now (if it has not begun, it never will).
  vanish() {
    if (this.age <= 0) {
      this.done = true; // it never showed itself: it is simply not coming
      return;
    }
    if (this.fadeStart === null) this.fadeStart = Math.max(this.age, this.table.fadeIn);
  }

  // Time going by: it ages, turns towards the player, and goes when it has faded (or has lived its life).
  update(seconds, playerPosition) {
    if (this.done) return;
    this.age += seconds;
    if (this.fadeStart === null && this.age >= this.table.life) this.vanish();
    if (this.age > 0) this.yaw = turnToward(this.yaw, facingYaw(this.position(), playerPosition), this.table.turnRate * seconds);
    if (this.fadeStart !== null && this.age >= this.fadeStart + this.table.fadeOut) this.done = true;
  }
}

// The ghosts there are. It makes them, ages them, and tells of every one that comes and goes, and knows nothing of how they look.
class Haunting {
  constructor(table = GHOST) {
    this.table = table;
    this.items = [];
    this.nextId = 1;
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _tell(type, item) {
    for (const callback of this.listeners) callback({ type, item });
  }

  // A ghost to haunt a place. When there are too many the oldest is sent away, and there is a new one anyway.
  summon(home, { placement = null, delay = this.table.summonDelay } = {}) {
    const ghost = new Apparition({ id: this.nextId++, home, placement, delay, table: this.table });
    this.items.push(ghost);
    const present = this.items.filter((item) => !item.done && item.fadeStart === null);
    if (present.length > this.table.max) present[0].vanish();
    this._tell("added", ghost);
    return ghost;
  }

  // Sends away the ghosts of a mark (it was taken up), or all of them.
  banish(placement) {
    for (const item of this.items) if (placement === undefined || item.placement === placement) item.vanish();
  }

  update(seconds, player) {
    for (const item of this.items) item.update(seconds, player.position);
    for (const item of this.items.filter((other) => other.done)) this._tell("removed", item);
    this.items = this.items.filter((item) => !item.done);
  }

  // The nearest ghost to a point that has shown itself, with how far.
  nearest(point) {
    let best = null;
    for (const item of this.items) {
      if (item.stage === "waiting" || item.stage === "gone") continue;
      const position = item.position();
      const distance = Math.hypot(position[0] - point[0], position[1] - point[1], position[2] - point[2]);
      if (!best || distance < best.distance) best = { item, distance };
    }
    return best;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition, Haunting };
} else {
  Object.assign(window, { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition, Haunting });
}
