// Creatures: what a spider, a ghoul and a skeleton are and do, as numbers. Each one is a table of what it is (how fast, how far it
// lunges), a small state machine of what it is doing (lurking, stalking, lunging, recovering, dying), and a pose: the creature as a list
// of bones and blobs, worked out from the time, in its own space, with +z forward and y up. How the bones are drawn is in
// creaturemesh.js, which draws whatever list it is given, so the same code will draw a model's skeleton later. No Babylon.js is in this
// file. (It uses TAU and turnToward from ghost.js, which comes first.) See ../tests/creatures.tests.js.

const CREATURES = {
  spider: {
    name: "spider", health: 3, speed: 1.5, lungeSpeed: 5.5, lungeRange: 1.6, lungeTime: 0.45, recoverTime: 1.4, notice: 7,
    touchRange: 0.55, turnRate: 6, strideLength: 0.5, radius: 0.35, height: 0.35, lurkTime: [0.6, 1.8], deathTime: 1.2,
  },
  ghoul: {
    name: "ghoul", health: 6, speed: 0.85, lungeSpeed: 3.2, lungeRange: 1.9, lungeTime: 0.6, recoverTime: 1.8, notice: 9,
    touchRange: 0.7, turnRate: 2.4, strideLength: 0.65, radius: 0.4, height: 1.7, lurkTime: [1.5, 3.5], deathTime: 2,
  },
  skeleton: {
    name: "skeleton", health: 4, speed: 1.25, lungeSpeed: 4.2, lungeRange: 1.7, lungeTime: 0.5, recoverTime: 1.5, notice: 8,
    touchRange: 0.65, turnRate: 3.6, strideLength: 0.7, radius: 0.35, height: 1.75, lurkTime: [1, 2.5], deathTime: 1.6,
  },
};

const CREATURE_MAX = 6; // how many at once

const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vscale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlength = (a) => Math.hypot(a[0], a[1], a[2]);
const vunit = (a) => { const n = vlength(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const vlerp = (a, b, t) => a + (b - a) * t;
const vlerp3 = (a, b, t) => [vlerp(a[0], b[0], t), vlerp(a[1], b[1], t), vlerp(a[2], b[2], t)];

// ---- limbs ----

// Two bones joined at a knee, from a hip to a foot. The knee is where two circles meet (one round the hip with the radius of the upper
// bone, one round the foot with the radius of the lower), pushed out to the side `bend` says. A foot that is out of reach is reached
// for as far as the leg goes, straight. Gives { knee, foot }.
function solveLeg(hip, foot, upper, lower, bend) {
  const toFoot = vsub(foot, hip);
  const far = vlength(toFoot) || 1e-6;
  const along = vscale(toFoot, 1 / far);
  const reach = Math.min(far, upper + lower - 1e-6);
  const nearest = Math.abs(upper - lower) + 1e-6;
  const distance = Math.max(reach, nearest);
  const a = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const side = vsub(bend, vscale(along, vdot(bend, along))); // the part of the bend direction at right angles to the leg
  const sideUnit = vlength(side) < 1e-6 ? [0, 1, 0] : vunit(side);
  const knee = vadd(vadd(hip, vscale(along, a)), vscale(sideUnit, h));
  return { knee, foot: vadd(hip, vscale(along, distance)) };
}

// Where a foot is in its step, `phase` from 0 to 1 round and round: planted (sliding back as the body goes over it) for the first part,
// then swinging forward and up. Gives [forward, up] from the middle of the step.
function footOffset(phase, stride, lift, planted = 0.6) {
  const p = ((phase % 1) + 1) % 1;
  if (p < planted) return [stride * (0.5 - p / planted), 0];
  const t = (p - planted) / (1 - planted);
  return [stride * (-0.5 + t), Math.sin(t * Math.PI) * lift];
}

// ---- poses: a creature as bones and blobs ----
// A bone is { a, b, r, color } (a rounded stick from a to b), and a blob is { p, r, color }. The colours are names: "flesh", "bone",
// "dark", "claw", "eye".

const makeBone = (a, b, r, color) => ({ a, b, r, color });
const makeBlob = (p, r, color) => ({ p, r, color });

// A leg of two bones from a hip to a foot, as two bones and a joint.
function buildLeg(hip, foot, upper, lower, bend, r, color, bones, blobs) {
  const solved = solveLeg(hip, foot, upper, lower, bend);
  bones.push(makeBone(hip, solved.knee, r, color), makeBone(solved.knee, solved.foot, r * 0.75, color));
  blobs.push(makeBlob(solved.knee, r * 1.15, color));
  return solved;
}

// The spider. `gait` counts steps (it goes up as the spider goes along), `time` is the clock (for the idle twitch), and `crouch` is how
// low it is on its legs, 0 to 1 (it crouches before it lunges).
function spiderPose({ gait = 0, time = 0, moving = 0, crouch = 0 } = {}) {
  const bones = [], blobs = [];
  const height = 0.27 - crouch * 0.12;
  const bob = Math.sin(gait * TAU * 2) * 0.012 * moving;
  const body = [0, height + bob, 0];
  blobs.push(makeBlob(vadd(body, [0, 0.02, -0.17]), 0.14, "dark")); // the abdomen
  blobs.push(makeBlob(vadd(body, [0, 0, 0.05]), 0.09, "dark")); // the thorax
  blobs.push(makeBlob(vadd(body, [0, -0.01, 0.17]), 0.06, "flesh")); // the head
  for (const side of [-1, 1]) {
    blobs.push(makeBlob(vadd(body, [side * 0.03, 0.03, 0.22]), 0.014, "eye"));
    blobs.push(makeBlob(vadd(body, [side * 0.015, 0.015, 0.23]), 0.01, "eye"));
    bones.push(makeBone(vadd(body, [side * 0.03, -0.04, 0.2]), vadd(body, [side * 0.035, -0.12, 0.25]), 0.012, "claw")); // the fangs
  }
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const row = i % 4;
    const phase = gait + (((row + (side > 0 ? 1 : 0)) % 2) * 0.5) + (moving > 0 ? 0 : 0);
    const spread = (row - 1.5) * 0.17;
    const hip = vadd(body, [side * 0.07, 0, 0.1 - row * 0.05]);
    const step = footOffset(phase, 0.16 * moving, 0.09 * moving);
    const twitch = (1 - moving) * Math.sin(time * 9 + i * 1.7) * 0.012;
    const rest = [side * (0.42 + crouch * 0.1), 0, spread + (row === 0 ? 0.1 : 0) - 0.05];
    const foot = vadd(rest, [side * twitch, step[1] + Math.abs(twitch), step[0] * 1 + twitch]);
    buildLeg(hip, foot, 0.27, 0.34, [side * 0.3, 1, 0], 0.017, "dark", bones, blobs);
  }
  return { bones, blobs };
}

// The ghoul: hunched, long in the arm, dragging its feet, swaying as it comes, and reaching when it is near. `reach` is 0 to 1.
function ghoulPose({ gait = 0, time = 0, moving = 0, reach = 0 } = {}) {
  const bones = [], blobs = [];
  const sway = Math.sin(gait * TAU) * 0.07 * moving + Math.sin(time * 1.3) * 0.015;
  const lean = 0.3 + 0.12 * moving + 0.15 * reach;
  const pelvis = [sway * 0.5, 0.92, 0];
  const chest = [sway, 1.42, lean];
  const neck = [sway * 1.2, 1.58, lean + 0.2];
  const head = [sway * 1.2 + Math.sin(time * 0.8) * 0.03, 1.55, lean + 0.32];
  bones.push(makeBone(pelvis, chest, 0.14, "flesh"), makeBone(chest, neck, 0.09, "flesh"));
  blobs.push(makeBlob(vadd(pelvis, [0, 0.05, 0]), 0.16, "flesh"), makeBlob(chest, 0.17, "flesh"), makeBlob(head, 0.12, "flesh"));
  blobs.push(makeBlob(vadd(head, [-0.045, 0.02, 0.1]), 0.022, "eye"), makeBlob(vadd(head, [0.045, 0.02, 0.1]), 0.022, "eye"));
  bones.push(makeBone(vadd(head, [0, -0.07, 0.06]), vadd(head, [0, -0.13, 0.1]), 0.045, "dark")); // the open jaw
  for (const side of [-1, 1]) {
    const hip = vadd(pelvis, [side * 0.12, 0, 0]);
    const step = footOffset(gait + (side > 0 ? 0.5 : 0), 0.4 * moving, 0.05 * moving);
    buildLeg(hip, [side * 0.14 + sway, 0.02 + step[1], step[0] + 0.05], 0.46, 0.46, [0, 0.4, 1], 0.07, "flesh", bones, blobs);
    const shoulder = vadd(chest, [side * 0.24, 0.05, 0.02]);
    const swing = Math.sin((gait + (side > 0 ? 0 : 0.5)) * TAU) * 0.3 * moving;
    const hang = [side * 0.28 + sway, 0.4, 0.3 + swing]; // the hand, hanging, near the knee
    const up = [side * 0.16 + sway, 1.45, lean + 0.75]; // the hand, reaching
    const hand = vlerp3(hang, up, reach);
    const arm = buildLeg(shoulder, hand, 0.42, 0.45, [side * 0.5, -0.3, -0.5], 0.05, "flesh", bones, blobs);
    for (const finger of [-1, 0, 1]) bones.push(makeBone(arm.foot, vadd(arm.foot, [finger * 0.03 + side * 0.01, -0.09 + reach * 0.06, 0.1 * reach + 0.02]), 0.012, "claw"));
  }
  return { bones, blobs };
}

// The skeleton: a spine, a skull and a rib cage, arms that swing against its legs, and a rattle that grows with its speed.
function skeletonPose({ gait = 0, time = 0, moving = 0, reach = 0 } = {}) {
  const bones = [], blobs = [];
  const rattle = (i, amount) => Math.sin(time * 47 + i * 5.3) * amount * (0.4 + moving);
  const sway = Math.sin(gait * TAU) * 0.03 * moving;
  const pelvis = [sway, 0.95, 0];
  const chest = [sway * 1.5, 1.45, 0.04 + 0.05 * moving];
  const spineBones = 5;
  for (let i = 0; i < spineBones; i++) blobs.push(makeBlob(vlerp3(pelvis, chest, i / (spineBones - 1)), 0.03, "bone"));
  bones.push(makeBone(pelvis, chest, 0.018, "bone"));
  bones.push(makeBone(vadd(pelvis, [-0.12, 0, 0]), vadd(pelvis, [0.12, 0, 0]), 0.025, "bone"));
  for (let i = 0; i < 4; i++) {
    const y = 1.24 + i * 0.075;
    const width = 0.13 + Math.sin((i / 3) * Math.PI) * 0.04;
    const at = vlerp3(pelvis, chest, (y - 0.95) / 0.5);
    for (const side of [-1, 1]) bones.push(makeBone(vadd(at, [0, 0, 0]), vadd(at, [side * width, -0.02, 0.05 + rattle(i, 0.004)]), 0.01, "bone"));
  }
  const skull = vadd(chest, [rattle(9, 0.006), 0.2, 0.03]);
  blobs.push(makeBlob(skull, 0.11, "bone"), makeBlob(vadd(skull, [0, -0.09, 0.04]), 0.06 + rattle(10, 0.004), "bone"));
  blobs.push(makeBlob(vadd(skull, [-0.04, 0.0, 0.09]), 0.03, "dark"), makeBlob(vadd(skull, [0.04, 0, 0.09]), 0.03, "dark"));
  blobs.push(makeBlob(vadd(skull, [-0.04, 0, 0.1]), 0.012, "eye"), makeBlob(vadd(skull, [0.04, 0, 0.1]), 0.012, "eye"));
  for (const side of [-1, 1]) {
    const hip = vadd(pelvis, [side * 0.12, 0, 0]);
    const step = footOffset(gait + (side > 0 ? 0.5 : 0), 0.5 * moving, 0.12 * moving);
    buildLeg(hip, [side * 0.12 + sway, step[1], step[0]], 0.46, 0.46, [0, 0.5, 1], 0.025, "bone", bones, blobs);
    const shoulder = vadd(chest, [side * 0.2, -0.03, 0]);
    const swing = Math.sin((gait + (side > 0 ? 0 : 0.5)) * TAU) * 0.25 * moving;
    const hang = [side * 0.24 + rattle(side + 3, 0.005), 0.78, swing];
    const up = [side * 0.12, 1.5, 0.7];
    buildLeg(shoulder, vlerp3(hang, up, reach), 0.32, 0.34, [side * 0.5, -0.4, -0.4], 0.02, "bone", bones, blobs);
  }
  return { bones, blobs };
}

const POSES = { spider: spiderPose, ghoul: ghoulPose, skeleton: skeletonPose };

// ---- the creature ----

class Creature {
  // `position` is where it is on the floor, [x, y, z]; `table` is the creature's own numbers (CREATURES.spider).
  constructor({ id, kind, position, table = CREATURES[kind], random = Math.random }) {
    this.id = id;
    this.kind = kind;
    this.table = table;
    this.position = position.slice();
    this.yaw = 0;
    this.health = table.health;
    this.state = "lurk";
    this.timer = table.lurkTime[0] + random() * (table.lurkTime[1] - table.lurkTime[0]); // seconds left in a state that has a time
    this.gait = 0; // steps taken
    this.clock = 0;
    this.moving = 0; // 0 to 1, smoothly: how much it is walking
    this.lastDistance = Infinity; // how far it was from the player at the last update
    this.lunge = null; // [dx, dz] of the dash it is in
    this.touches = 0; // how many times it has got to the player
    this.done = false;
    this.events = []; // what has happened and has not been told of yet: "lunge", "touch", "died" (whoever tells of them empties it)
  }

  // How far it is from a point, on the floor.
  distanceTo(point) {
    return Math.hypot(point[0] - this.position[0], point[2] - this.position[2]);
  }

  // Is it something a tool can hit: alive, and not yet gone.
  get alive() {
    return this.state !== "dying" && !this.done;
  }

  // A hit that takes `damage` off its health. It is dying when there is none left.
  hit(damage) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.state = "dying";
      this.timer = this.table.deathTime;
      this.events.push("died");
    }
    return true;
  }

  // Walks, at `speed`, towards a point (turning first, a little at a time).
  _walk(seconds, target, speed) {
    const wanted = Math.atan2(target[0] - this.position[0], target[2] - this.position[2]);
    this.yaw = turnToward(this.yaw, wanted, this.table.turnRate * seconds);
    const facing = Math.cos(wanted - this.yaw) > 0.5 ? 1 : 0; // it only goes when it faces the way it is going
    const step = speed * seconds * facing;
    this.position[0] += Math.sin(this.yaw) * step;
    this.position[2] += Math.cos(this.yaw) * step;
    this.gait += step / this.table.strideLength;
    return step > 0;
  }

  // Time going by. `player` is where the player is (`player.position`).
  update(seconds, player) {
    if (this.done) return;
    this.clock += seconds;
    const table = this.table;
    const distance = this.distanceTo(player.position);
    this.lastDistance = distance;
    let walking = false;

    if (this.state === "lurk") {
      this.timer -= seconds;
      if (this.timer <= 0 || distance < table.notice * 0.5) this.state = "stalk";
    } else if (this.state === "stalk") {
      walking = this._walk(seconds, player.position, table.speed);
      if (distance <= table.lungeRange) {
        this.state = "lunge";
        this.timer = table.lungeTime;
        this.lunge = [player.position[0] - this.position[0], player.position[2] - this.position[2]];
        this.events.push("lunge");
      }
    } else if (this.state === "lunge") {
      this.timer -= seconds;
      const length = Math.hypot(this.lunge[0], this.lunge[1]) || 1;
      const reachLeft = Math.max(0, distance - table.touchRange * 0.5);
      const step = Math.min(table.lungeSpeed * seconds, reachLeft);
      this.position[0] += (this.lunge[0] / length) * step;
      this.position[2] += (this.lunge[1] / length) * step;
      this.yaw = Math.atan2(this.lunge[0], this.lunge[1]);
      this.gait += step / table.strideLength;
      walking = true;
      if (this.distanceTo(player.position) <= table.touchRange) {
        this.touches += 1;
        this.events.push("touch");
        this.state = "recover";
        this.timer = table.recoverTime;
      } else if (this.timer <= 0) {
        this.state = "recover";
        this.timer = table.recoverTime;
      }
    } else if (this.state === "recover") {
      this.timer -= seconds;
      if (this.timer <= 0) this.state = "stalk";
    } else if (this.state === "dying") {
      this.timer -= seconds;
      if (this.timer <= 0) this.done = true;
    }
    this.moving = vlerp(this.moving, walking ? 1 : 0, Math.min(1, seconds * 8));
  }

  // The bones and blobs of it now, in its own space. The game puts them at `position` and turns them by `yaw`.
  pose() {
    const crouch = this.state === "lunge" ? 0 : this.state === "stalk" && this.lastDistance < 3 ? 0.5 : 0;
    const reach = this.state === "lunge" ? 1 : this.state === "recover" ? 0.4 : 0;
    const flat = this.state === "dying" ? Math.min(1, 1 - this.timer / this.table.deathTime) : 0;
    const made = POSES[this.kind]({ gait: this.gait, time: this.clock, moving: this.moving, reach, crouch });
    return flat > 0 ? collapsePose(made, flat) : made;
  }
}

// A creature that has been killed folds down to the floor: every point comes down towards the floor by `amount`, 0 to 1.
function collapsePose(pose, amount) {
  const down = (p) => [p[0], p[1] * (1 - amount * 0.9), p[2]];
  return { bones: pose.bones.map((b) => ({ ...b, a: down(b.a), b: down(b.b) })), blobs: pose.blobs.map((b) => ({ ...b, p: down(b.p) })) };
}


// The creatures there are: makes them, ages them, tells of every one that comes and goes and every thing they do.
class Menagerie {
  constructor(max = CREATURE_MAX, random = Math.random) {
    this.max = max;
    this.random = random;
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

  // A creature of a kind at a place. Nothing if there are too many already.
  spawn(kind, position) {
    if (!CREATURES[kind] || this.items.length >= this.max) return null;
    const creature = new Creature({ id: this.nextId++, kind, position, random: this.random });
    this.items.push(creature);
    this._tell("added", creature);
    return creature;
  }

  update(seconds, player) {
    for (const creature of this.items) {
      creature.update(seconds, player);
      for (const event of creature.events) this._tell(event, creature);
      creature.events = [];
    }
    for (const creature of this.items.filter((item) => item.done)) this._tell("removed", creature);
    this.items = this.items.filter((item) => !item.done);
  }

  // The nearest creature that is alive to a point, and how far.
  nearest(point) {
    let best = null;
    for (const creature of this.items) {
      if (!creature.alive) continue;
      const distance = creature.distanceTo(point);
      if (!best || distance < best.distance) best = { creature, distance };
    }
    return best;
  }

  // Sends them all away at once.
  clear() {
    for (const creature of this.items) creature.done = true;
    for (const creature of this.items) this._tell("removed", creature);
    this.items = [];
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
}
