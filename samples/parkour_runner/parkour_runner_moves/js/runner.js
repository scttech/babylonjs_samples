// The runner: which of three lanes it is in, how far along the street it is, how
// fast it runs, and what it is doing right now: running, jumping, sliding or
// rolling. Everything here is plain numbers (no Babylon.js), so the movement can
// be tested on its own; main.js moves the character to wherever this says. See
// ../tests/runner.tests.js.
//
// A lane is -1 (left), 0 (middle) or 1 (right), and x is the runner's sideways
// position in the street. The street runs along +z, as in world.js, and y is up.

const LANE_WIDTH = 2.2; // world units between the middle of one lane and the next
const MAX_LANE = 1; // lanes go from -MAX_LANE to MAX_LANE
const LANE_CHANGE_RATE = 9; // how quickly the runner slides into a new lane; bigger is snappier
const RUN_SPEED = 8; // world units per second

// What the runner can be doing. Only one at a time.
const MOVES = { run: "run", jump: "jump", slide: "slide", roll: "roll" };

const GRAVITY = 32; // how fast a jump slows, then falls, in units per second per second
const JUMP_SPEED = 9.8; // how fast the runner leaves the ground: a jump about 1.5 units high and 0.6 seconds long
const DIVE_SPEED = 14; // how fast the runner is pushed down by diving in the air
const SLIDE_TIME = 0.9; // seconds
const ROLL_TIME = 0.55; // seconds

// How tall the runner is for the purposes of hitting things. Sliding and rolling
// make the runner low, so he can go under things that would hit him standing up.
const STANDING_HEIGHT = 1.8;
const LOW_HEIGHT = 0.7;


// The sideways position of the middle of a lane.
function laneX(lane) {
  return lane * LANE_WIDTH;
}

// Moves `current` toward `target`: each second it closes a share of what's left
// that depends on `rate`. Unlike adding a fixed fraction every frame, the result
// after one second is the same at any frame rate, because 1 - e^(-rate * dt)
// depends on elapsed *time*. It never overshoots, and it slows as it arrives.
function approach(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

class Runner {
  constructor({ lane = 0, z = 0, speed = RUN_SPEED, laneRate = LANE_CHANGE_RATE, endZ = Infinity } = {}) {
    this.startLane = lane; // where reset() puts it back
    this.startZ = z;
    this.lane = lane; // the lane it is heading for
    this.x = laneX(lane); // where it is across the street; eases toward its lane
    this.vx = 0; // how fast it is sliding sideways, in units per second
    this.z = z; // how far along the street it is
    this.speed = speed;
    this.laneRate = laneRate;
    this.endZ = endZ; // it stops here
    this.running = true;
    this.y = 0; // how high above the ground; 0 unless it is jumping
    this.vy = 0; // how fast it is rising (positive) or falling (negative)
    this.move = MOVES.run; // what it is doing
    this.moveTime = 0; // how long it has been doing it, in seconds
    this.diving = false; // true if it dived in the air, so it rolls when it lands
  }

  // Heads for the lane next door: direction -1 is left and 1 is right. There is
  // no lane past the edge of the street, so asking for one does nothing.
  moveLane(direction) {
    this.lane = Math.max(-MAX_LANE, Math.min(MAX_LANE, this.lane + direction));
  }

  // Jumps, if it is on the ground and not rolling. Jumping out of a slide is
  // allowed. Does nothing in the air, so there is no jumping twice.
  jump() {
    if (this.move !== MOVES.run && this.move !== MOVES.slide) return;
    this.vy = JUMP_SPEED;
    this._begin(MOVES.jump);
  }

  // Slides, if it is running. In the air it does something else: it dives,
  // dropping fast, and will roll when it lands. While sliding or rolling already,
  // it does nothing.
  slide() {
    if (this.move === MOVES.run) {
      this._begin(MOVES.slide);
    } else if (this.move === MOVES.jump && !this.diving) {
      this.vy = -DIVE_SPEED;
      this.diving = true;
    }
  }

  // Starts a new move, and the clock for it.
  _begin(move) {
    this.move = move;
    this.moveTime = 0;
  }

  // How far the runner is turned toward where it is sliding, in radians: 0 when
  // running straight, and leaning into the move while it changes lanes. It is
  // the angle between "forward" and where the runner is actually going.
  get heading() {
    return Math.atan2(this.vx, this.speed);
  }

  // How tall the runner is right now, for hitting things: low while sliding or
  // rolling, standing the rest of the time.
  get bodyHeight() {
    return this.move === MOVES.slide || this.move === MOVES.roll ? LOW_HEIGHT : STANDING_HEIGHT;
  }

  // How many seconds are left of a slide or a roll, and 0 for any other move.
  get timeLeft() {
    if (this.move === MOVES.slide) return Math.max(0, SLIDE_TIME - this.moveTime);
    if (this.move === MOVES.roll) return Math.max(0, ROLL_TIME - this.moveTime);
    return 0;
  }

  // Moves for dt seconds: slides toward the chosen lane, goes up and down if it is
  // in the air, finishes a slide or a roll that has run its time, and, while
  // running, goes forward. The runner stops at the end of the street.
  update(dt) {
    const before = this.x;
    this.x = approach(this.x, laneX(this.lane), this.laneRate, dt);
    this.vx = dt > 0 ? (this.x - before) / dt : 0;

    this.moveTime += dt;
    if (this.move === MOVES.jump) {
      // The exact distance gravity gives over dt, not an approximation, so a jump
      // is the same height and length at any frame rate.
      this.y += this.vy * dt - 0.5 * GRAVITY * dt * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) this._land();
    } else if (this.move === MOVES.slide && this.moveTime >= SLIDE_TIME) {
      this._begin(MOVES.run);
    } else if (this.move === MOVES.roll && this.moveTime >= ROLL_TIME) {
      this._begin(MOVES.run);
    }

    if (!this.running) return;
    this.z = Math.min(this.endZ, this.z + this.speed * dt);
    if (this.z >= this.endZ) this.running = false;
  }

  // Back on the ground: a roll if it dived, otherwise just running again.
  _land() {
    this.y = 0;
    this.vy = 0;
    this._begin(this.diving ? MOVES.roll : MOVES.run);
    this.diving = false;
  }

  // Back to the start: the starting lane and place, running again.
  reset() {
    this.lane = this.startLane;
    this.x = laneX(this.startLane);
    this.vx = 0;
    this.z = this.startZ;
    this.running = true;
    this.y = 0;
    this.vy = 0;
    this.diving = false;
    this._begin(MOVES.run);
  }


}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, laneX, approach, Runner };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, laneX, approach, Runner });
}

