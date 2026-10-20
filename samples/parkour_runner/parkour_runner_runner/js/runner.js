// The runner: which of three lanes it is in, how far along the street it is, and
// how fast it runs. Everything here is plain numbers (no Babylon.js), so the
// movement can be tested on its own; main.js moves the character to wherever
// this says. See ../tests/runner.tests.js.
//
// A lane is -1 (left), 0 (middle) or 1 (right), and x is the runner's sideways
// position in the street. The street runs along +z, as in world.js.

const LANE_WIDTH = 2.2; // world units between the middle of one lane and the next
const MAX_LANE = 1; // lanes go from -MAX_LANE to MAX_LANE
const LANE_CHANGE_RATE = 9; // how quickly the runner slides into a new lane; bigger is snappier
const RUN_SPEED = 8; // world units per second

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
  }

  // Heads for the lane next door: direction -1 is left and 1 is right. There is
  // no lane past the edge of the street, so asking for one does nothing.
  moveLane(direction) {
    this.lane = Math.max(-MAX_LANE, Math.min(MAX_LANE, this.lane + direction));
  }

  // How far the runner is turned toward where it is sliding, in radians: 0 when
  // running straight, and leaning into the move while it changes lanes. It is
  // the angle between "forward" and where the runner is actually going.
  get heading() {
    return Math.atan2(this.vx, this.speed);
  }

  // Moves for dt seconds: slides toward the chosen lane and, while running,
  // forward. The runner stops at the end of the street.
  update(dt) {
    const before = this.x;
    this.x = approach(this.x, laneX(this.lane), this.laneRate, dt);
    this.vx = dt > 0 ? (this.x - before) / dt : 0;

    if (!this.running) return;
    this.z = Math.min(this.endZ, this.z + this.speed * dt);
    if (this.z >= this.endZ) this.running = false;
  }

  // Back to the start: the starting lane and place, running again.
  reset() {
    this.lane = this.startLane;
    this.x = laneX(this.startLane);
    this.vx = 0;
    this.z = this.startZ;
    this.running = true;
  }


}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach, Runner };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach, Runner });
}
