// A scout walks the length of the street so you can look at the world before
// anyone runs through it: it is just a position along the street (z) that
// moves forward and back, never past either end. main.js points the camera at it.
class Scout {
  constructor({ z = 0, min = -Infinity, max = Infinity, speed = 10 } = {}) {
    this.start = z; // where reset() puts it back
    this.z = z;
    this.min = min; // the nearest and farthest it may go
    this.max = max;
    this.speed = speed; // world units per second
  }

  // Moves for dt seconds: direction 1 is forward (+z), -1 is back, 0 stands still.
  move(direction, dt) {
    this.z = Math.min(this.max, Math.max(this.min, this.z + direction * this.speed * dt));
  }

  reset() {
    this.z = this.start;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Scout;
} else {
  window.Scout = Scout;
}
