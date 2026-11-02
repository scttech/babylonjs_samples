// The brain of a tower: what it is doing and what it will do next. It turns to face its target, and
// waits for its cooldown, and starts an attack; at each moment of the attack when the hand is out
// furthest (one, or one for each punch of a combo) it *fires*; and when the attack is over it goes back to waiting. It says what happens as
// a list of events, which the model and the effects listen to, so that the brain itself needs no
// model, and a test can run a minute of it in a moment. See ../tests/brain.tests.js.

const BRAIN = {
  turnRate: 7, // the fastest a tower turns, in radians a second
  aligned: 0.35, // how near to facing its target it has to be to start an attack, in radians
  rest: Math.PI, // the way it faces when it has had nothing to shoot at: toward the front of the board
};

// An angle that goes round: the same angle, put in the range from just over minus a half turn to a half turn.
function wrapAngle(angle) {
  let a = (angle + Math.PI) % (2 * Math.PI);
  if (a <= 0) a += 2 * Math.PI;
  return a - Math.PI;
}

// How far to turn, and which way, to get from one angle to another by the short way round: from
// a hair under a half turn one way to a half turn the other way.
function angleDifference(from, to) {
  return wrapAngle(to - from);
}

// Turns from `current` towards `desired` by at most `maxStep`, the short way round.
function turnToward(current, desired, maxStep) {
  const difference = angleDifference(current, desired);
  if (Math.abs(difference) <= maxStep) return wrapAngle(desired);
  return wrapAngle(current + Math.sign(difference) * maxStep);
}

// The way to face to look from one place at another, the same turn about the vertical axis that a model
// facing along z is given to face along (dx, dz).
function facing(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

// How long an attack lasts, in seconds, once it is played at its speed, and how long after it starts the hand is out for
// its hits, the first, and the others by their number.
function attackDuration(attack) {
  return attack.seconds / attack.speed;
}

function hitTime(attack, index = 0) {
  return attack.hits[index].at * attackDuration(attack);
}

class TowerBrain {
  // `spec` is the row of a bender in the BENDERS table. `at` is where the tower stands: { x, z }.
  constructor(spec, at, mode = "first") {
    this.spec = spec;
    this.x = at.x;
    this.z = at.z;
    this.mode = mode;
    this.yaw = BRAIN.rest;
    this.state = "idle"; // "idle" or "attacking"
    this.target = null; // who it is looking at while idle
    this.lock = null; // who it is shooting at while it attacks: { enemy, x, z }
    this.sinceStart = Infinity; // time since the last attack began, so the first one needn't wait
    this.attackTime = 0; // how far into an attack it is
    this.fired = 0; // how many of this attack's hits have fired
  }

  // The way the tower has to face to shoot at something: toward it, less the way that its attack points.
  yawFor(place) {
    return facing(this, place) - this.spec.attack.aim;
  }

  turn(dt, place) {
    this.yaw = turnToward(this.yaw, this.yawFor(place), BRAIN.turnRate * dt);
  }

  // Lets `dt` seconds go by, given the enemies there are. It says what happened, as a list of events:
  // { type: "start", enemy }, { type: "fire", enemy, x, z, hit, damage } and { type: "end" }. `hit` is which of the
  // attack's hits it is, counting from 0, and `damage` is the harm that hit does.
  update(dt, enemies) {
    const events = [];
    this.sinceStart += dt;

    if (this.state === "attacking") {
      // It keeps its eye on who it is shooting at, as long as they are about, and then where they were.
      if (enemies.includes(this.lock.enemy)) {
        this.lock.x = this.lock.enemy.x;
        this.lock.z = this.lock.enemy.z;
      }
      this.turn(dt, this.lock);
      this.attackTime += dt;
      // Every hit whose time has come fires, in order (a long step can bring more than one).
      while (this.fired < this.spec.attack.hits.length && this.attackTime >= hitTime(this.spec.attack, this.fired)) {
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z, hit: this.fired, damage: this.spec.damage });
        this.fired++;
      }
      if (this.attackTime >= attackDuration(this.spec.attack)) {
        this.state = "idle";
        events.push({ type: "end" });
      }
      return events;
    }

    this.target = pickTarget(this, this.spec.range, enemies, this.mode);
    if (this.target) {
      this.turn(dt, this.target);
      const ready = this.sinceStart >= this.spec.cooldown;
      const facingIt = Math.abs(angleDifference(this.yaw, this.yawFor(this.target))) <= BRAIN.aligned;
      if (ready && facingIt) {
        this.state = "attacking";
        this.sinceStart = 0;
        this.attackTime = 0;
        this.fired = 0;
        this.lock = { enemy: this.target, x: this.target.x, z: this.target.z };
        events.push({ type: "start", enemy: this.target });
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRAIN, wrapAngle, angleDifference, turnToward, facing, attackDuration, hitTime, TowerBrain };
} else {
  Object.assign(window, { BRAIN, wrapAngle, angleDifference, turnToward, facing, attackDuration, hitTime, TowerBrain });
}
