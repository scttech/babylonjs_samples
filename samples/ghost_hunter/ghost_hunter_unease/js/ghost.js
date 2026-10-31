// A ghost, as numbers. How it flickers, bobs, drifts, turns to look at the player, and fades in and out is plain arithmetic of the time,
// with no Babylon.js in it, so that the tests can say what a ghost does at any moment. How it looks is in ghostmesh.js, which only
// reads what is worked out here. (A ghost asks bearingTo of director.js whether it is being looked at.) See ../tests/ghost.tests.js.

const GHOST = {
  height: 2.1, // metres: a ghost is taller than a person, and thin
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
  unlit: 0.3, // how much of a ghost is there when no light is on it (1 would be all of it): the flashlight shows the rest
  creepSpeed: 0.35, // metres a second it comes towards you while you are not looking at it
  closest: 2.3, // and the nearest it comes: it stops here, and waits for you to look
  personalSpace: 1.8, // and the nearest it is ever, however it got there (you walked up to it, or it wandered): it is moved straight back out to here
  farReach: 7, // metres: it begins to reach for you inside this distance (the mouth and the arms follow `near`)
  watchedDepth: 0.65, // how far it dims when it is looked at: it stutters, as if it were not quite there
  watchedHz: 2.5, // and how fast
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
    this.offset = [0, 0]; // how far it has come from its place, towards the player, while unwatched
    this.watched = true; // is the player looking at it?
    this.near = 0; // how near it is, as a feeling: 0 far away, 1 as close as it comes
    this.reveal = 1; // how much a light is on it, 0 to 1: the game brings it down when no light is on it
    this.captured = false;
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
    return [this.home[0] + dx + this.offset[0], this.home[1] + this.table.hover + bob(Math.max(0, this.age), this.seed, this.table), this.home[2] + dz + this.offset[1]];
  }

  // How much it shows, from 0 to the table's opacity: there, and flickering.
  opacity() {
    const shown = this.table.unlit + (1 - this.table.unlit) * this.reveal;
    // looked at, it stutters: a ghost that is watched is not quite there
    const watchedBlink = this.watched ? flicker(Math.max(0, this.age) * (this.table.watchedHz / this.table.flickerHz), this.seed + 9, { ...this.table, flickerDepth: this.table.watchedDepth }) : 1;
    return this.table.opacity * shown * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table) * watchedBlink;
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
  // `watched` says whether the player is looking at it. A ghost that is looked at stays where it is; one that is not creeps towards the player,
  // a little at a time, until it is as close as it comes.
  update(seconds, playerPosition, watched = true) {
    if (this.done) return;
    this.age += seconds;
    this.watched = watched;
    const here = this.position();
    const distance = Math.hypot(playerPosition[0] - here[0], playerPosition[2] - here[2]);
    this.near = Math.max(0, Math.min(1, (this.table.farReach - distance) / (this.table.farReach - this.table.closest)));
    if (distance < this.table.personalSpace) {
      const push = this.table.personalSpace - distance; // too near, whatever the reason: it is moved straight back out
      const away = distance > 1e-6 ? [(here[0] - playerPosition[0]) / distance, (here[2] - playerPosition[2]) / distance] : [0, 1];
      this.offset[0] += away[0] * push;
      this.offset[1] += away[1] * push;
    } else if (!watched && this.stage === "present" && distance > this.table.closest) {
      const step = Math.min(this.table.creepSpeed * seconds, distance - this.table.closest);
      this.offset[0] += ((playerPosition[0] - here[0]) / distance) * step;
      this.offset[1] += ((playerPosition[2] - here[2]) / distance) * step;
    }
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

  // Captures a ghost that has shown itself: it goes, and is counted as captured. Gives whether it was.
  capture(id) {
    const ghost = this.items.find((item) => item.id === id);
    if (!ghost || ghost.stage === "waiting" || ghost.stage === "gone" || ghost.captured) return false;
    ghost.captured = true;
    ghost.vanish();
    return true;
  }

  // Sends away the ghosts of a mark (it was taken up), or all of them.
  banish(placement) {
    for (const item of this.items) if (placement === undefined || item.placement === placement) item.vanish();
  }

  // `halfFov` is how many degrees each side of straight ahead the player sees: a ghost inside it (and a little beyond) is being looked at.
  update(seconds, player, halfFov = 30) {
    for (const item of this.items) {
      const looked = !player.forward || item.stage === "waiting" || Math.abs(bearingTo(player, item.position())) <= halfFov + 8;
      item.update(seconds, player.position, looked);
    }
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
