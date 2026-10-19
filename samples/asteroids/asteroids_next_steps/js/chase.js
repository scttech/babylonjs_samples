// A chase camera: instead of looking straight down at the whole arena, it sits
// behind the ship and a little above it, looking ahead, and turns as the ship
// turns. The arena is a flat plane at z = 0, so "above" means toward the viewer
// (negative z).
//
// This file is only the math -- where the camera should be, and how it eases
// toward that spot -- so it can be tested without a camera or a screen.
// main.js applies the result to the real Babylon.js camera. See
// ../tests/chase.tests.js.

// Where a camera following `ship` should sit and look. The ship points along
// (-sin(angle), cos(angle)), so the camera goes `distance` behind it and
// `height` above the plane, and looks at a point `lookAhead` in front of it.
function chaseView(ship, { distance, height, lookAhead }) {
  const forwardX = -Math.sin(ship.angle);
  const forwardY = Math.cos(ship.angle);
  return {
    position: { x: ship.x - forwardX * distance, y: ship.y - forwardY * distance, z: -height },
    target: { x: ship.x + forwardX * lookAhead, y: ship.y + forwardY * lookAhead, z: 0 },
  };
}

// Moves `current` toward `target` by a fraction that depends on how much time
// passed, so the camera eases in rather than snapping. Because the fraction is
// worked out as 1 - e^(-rate * dt), two half-steps land in exactly the same
// place as one whole step: the easing looks the same at any frame rate.
function approach(current, target, dt, rate = 5) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

class ChaseCamera {
  constructor({ distance = 7, height = 3.5, lookAhead = 5, rate = 5 } = {}) {
    this.distance = distance;
    this.height = height;
    this.lookAhead = lookAhead;
    this.rate = rate;
    this.position = { x: 0, y: -distance, z: -height };
    this.target = { x: 0, y: lookAhead, z: 0 };
  }

  // Jumps straight to the ideal spot for `ship`, with no easing. Use it when
  // the view is switched on, and when the ship wraps to the other side of the
  // screen (easing there would swing the camera across the whole arena).
  snapTo(ship) {
    const view = chaseView(ship, this);
    this.position = view.position;
    this.target = view.target;
  }

  // Eases the camera toward the ideal spot for `ship` over `dt` seconds.
  update(ship, dt) {
    const view = chaseView(ship, this);
    for (const axis of ["x", "y", "z"]) {
      this.position[axis] = approach(this.position[axis], view.position[axis], dt, this.rate);
      this.target[axis] = approach(this.target[axis], view.target[axis], dt, this.rate);
    }
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ChaseCamera, chaseView, approach };
} else {
  window.ChaseCamera = ChaseCamera;
  window.chaseView = chaseView;
  window.approach = approach;
}
