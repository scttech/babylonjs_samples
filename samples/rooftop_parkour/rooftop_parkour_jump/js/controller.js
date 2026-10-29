// The character controller: a runner's body that is moved by code and not by a physics engine. Each frame it is told which way the keys
// ask it to go, and it works out where it ends up: running along the ground at a speed it builds up to, turning to face the way it goes,
// stepping up a curb and down again, stopped by walls, standing on the roof of a building, jumping, and, when there is nothing under its
// feet, falling. Everything is plain arithmetic on a World (see collision.js), so a jump from this speed onto that roof is a thing a test
// can say. See ../tests/controller.tests.js.

// The body, and the world's pull on it. Metres and seconds.
const BODY = {
  height: 1.8, // how tall the runner is, for walls above their head
  stepHeight: 0.4, // the highest step they can go up without jumping: a curb, a low wall, a stair
  supportReach: 0.25, // how far past the edge of something the middle of the runner can be, and still stand on it
  snapDown: 0.35, // the biggest drop the feet follow without falling: a step down is walked, a bigger drop is a fall
  gravity: 30, // how much faster a fall gets each second: more than the real 9.8, as a game wants
  terminalSpeed: 50, // the fastest a fall gets
  hardLanding: 7, // how fast a fall has to be, on landing, for a runner who is standing still to feel it (about 0.8 metres of fall)
  landTime: 0.4, // how long a hard landing lasts, in seconds, before the runner is free to run again
  jumpSpeed: 9, // how fast a jump goes up, as it leaves the ground: it takes it about a metre and a third up
  jumpCutSpeed: 3, // a jump that is let go of on the way up is slowed to this: a tap is a hop, and holding the key is the whole jump
  coyoteTime: 0.12, // how long after running off an edge a jump still works, in seconds
  jumpBuffer: 0.12, // how long a jump that was asked for too early is remembered, in seconds, to happen as soon as it can
  rollImpact: 11, // how fast a fall has to be, on landing, for a runner who is going somewhere to roll out of it (about 2 metres of fall)
  rollMinSpeed: 2, // how fast they have to be going to roll, or to run through a landing: slower than that and it is a hard landing
  rollSpeed: 6, // how fast a roll goes
  rollTime: 0.45, // how long a roll lasts, in seconds: the tumble of the roll clip, and not the slow getting up after it
};

// How high a jump goes, and how far it goes along level ground, for a runner going a given speed. Plain arithmetic on the numbers of BODY:
// the way up takes `jumpSpeed / gravity` seconds and so does the way down.
function jumpHeight(options = BODY) {
  return (options.jumpSpeed * options.jumpSpeed) / (2 * options.gravity);
}
function jumpDistance(speed, options = BODY) {
  return speed * ((2 * options.jumpSpeed) / options.gravity);
}

class Controller {
  // `world` is a World. `bounds` is the edge of the world: { minX, maxX, minZ, maxZ }. The runner starts on whatever is at (x, z), the highest
  // thing there if `y` isn't given.
  constructor({ x = 0, y = null, z = 0, heading = 0, world, bounds = null, options = {} } = {}) {
    this.world = world;
    this.bounds = bounds;
    this.options = { ...SCOUT, ...BODY, ...options };
    this.x = x;
    this.z = z;
    this.y = y === null ? world.supportAt(x, z, this.options.supportReach, Infinity) : y;
    this.heading = heading; // the way the body faces, as a yaw
    this.speed = 0; // how fast it is going along the ground
    this.vy = 0; // how fast it is going up (negative is down)
    this.grounded = true;
    this.landing = 0; // seconds left of a hard landing
    this.rolling = 0; // seconds left of a roll
    this.impact = 0; // how fast the last fall was, when it landed
    this.airTime = 0; // how long the feet have been off the ground
    this.jumping = false; // whether the body is in the air because it jumped (and so can be slowed by letting go of the key)
    this.jumpHeld = false; // whether the key was down the last frame, to know the moment it goes down
    this.jumpWanted = 0; // seconds left that a jump is wanted, from when the key went down
    this.start = { x, z, heading, y: this.y };
  }

  // Moves on by `dt` seconds. `direction` is where the keys ask to go (or null), `sprint` whether they ask to go fast, and `jump` whether the
  // jump key is down.
  update(direction, sprint, dt, jump = false) {
    const o = this.options;
    this.landing = Math.max(0, this.landing - dt);
    this.rolling = Math.max(0, this.rolling - dt);
    this.jumpWanted = Math.max(0, this.jumpWanted - dt);
    if (jump && !this.jumpHeld) this.jumpWanted = o.jumpBuffer;
    this.jumpHeld = jump;

    // Along the ground: build up to the speed asked for (or slow to a stop), face the way it goes, and go the way it faces. A runner who is
    // in the air keeps the way they were going: they can't speed up or stop in mid air, but they can still steer a little. A runner who is
    // rolling goes the way they were going, at the speed of the roll, and can't steer.
    const rolling = this.rolling > 0;
    const wanted = rolling ? o.rollSpeed : direction ? (sprint ? o.sprintSpeed : o.jogSpeed) : 0;
    const control = this.grounded ? 1 : 0.35;
    const change = o.acceleration * control * dt;
    this.speed = Math.abs(wanted - this.speed) <= change ? wanted : this.speed + Math.sign(wanted - this.speed) * change;
    if (direction && !rolling) this.heading = turnToward(this.heading, Math.atan2(direction.x, direction.z), o.turnRate * dt);
    const moved = this.world.push(
      this.x + Math.sin(this.heading) * this.speed * dt,
      this.z + Math.cos(this.heading) * this.speed * dt,
      o.radius,
      this.y,
      o.height,
      o.stepHeight
    );
    this.x = moved.x;
    this.z = moved.z;
    if (this.bounds) {
      this.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.x));
      this.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.z));
    }

    // Up and down.
    if (this.grounded) this._walk(dt);
    if (!this.grounded) this.airTime += dt;
    this._jump();
    if (!this.grounded) this._fall(dt);
  }

  // A jump, if one is wanted and the body can: on the ground, or only just off it (the coyote time, for a runner who has just run off an
  // edge), and not in the middle of a roll. (A hard landing is only a picture: the runner is free to jump out of it.) A jump that is let go of
  // on the way up is cut short.
  _jump() {
    const o = this.options;
    const footing = this.grounded || (!this.jumping && this.airTime <= o.coyoteTime);
    if (this.jumpWanted > 0 && this.rolling === 0 && footing) {
      this.grounded = false;
      this.jumping = true;
      this.vy = o.jumpSpeed;
      this.jumpWanted = 0;
      this.airTime = o.coyoteTime + 1; // a runner in the air has no footing, and a jump that has begun can't be begun again
    }
    if (this.jumping && !this.jumpHeld && this.vy > o.jumpCutSpeed) this.vy = o.jumpCutSpeed;
  }

  // On the ground: the feet follow whatever is under them, a share of the way each frame (so that a curb is a quick step and not a jump). A
  // drop of more than snapDown is not followed: there is nothing under the feet, and the runner begins to fall.
  _walk(dt) {
    const o = this.options;
    const support = this.world.supportAt(this.x, this.z, o.supportReach, this.y + o.stepHeight);
    if (support < this.y - o.snapDown) {
      this.grounded = false;
      this.vy = 0;
      this.airTime = 0;
      return;
    }
    this.y += (support - this.y) * (1 - Math.exp(-o.stepRate * dt));
  }

  // In the air: gravity speeds the fall, and the feet are moved down. If they have gone through something that was under them, they stand on it:
  // the highest thing under where they were (and a step above, so that a runner who falls with the edge of a curb at their feet is put on it).
  // A runner who is going somewhere comes out of a long fall with a roll, and runs through a lesser one: only a runner who is standing (or
  // nearly) has a hard landing, which holds them for a moment.
  _fall(dt) {
    const o = this.options;
    const before = this.y;
    this.vy = Math.max(-o.terminalSpeed, this.vy - o.gravity * dt);
    this.y += this.vy * dt;
    if (this.vy > 0) return; // going up: nothing can be landed on
    this.jumping = false; // the top of the jump is past
    const support = this.world.supportAt(this.x, this.z, o.supportReach, before + o.stepHeight);
    if (this.y <= support) {
      this.impact = -this.vy;
      this.y = support;
      this.vy = 0;
      this.grounded = true;
      this.airTime = 0;
      if (this.impact >= o.rollImpact && this.speed >= o.rollMinSpeed) this.rolling = o.rollTime;
      else if (this.impact >= o.hardLanding && this.speed < o.rollMinSpeed) this.landing = o.landTime;
    }
  }

  // Back to where it began.
  reset() {
    Object.assign(this, this.start, { speed: 0, vy: 0, grounded: true, landing: 0, rolling: 0, impact: 0, airTime: 0, jumping: false, jumpWanted: 0 });
  }

  // Puts it somewhere else, standing still, in the air: it falls from there (or lands, if there is something right under it).
  placeAt(x, y, z) {
    Object.assign(this, { x, y, z, speed: 0, vy: 0, grounded: false, landing: 0, rolling: 0, airTime: this.options.coyoteTime + 1, jumping: false, jumpWanted: 0 });
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BODY, jumpHeight, jumpDistance, Controller };
} else {
  Object.assign(window, { BODY, jumpHeight, jumpDistance, Controller });
}
