// The walker: how far something has walked along a route. It knows nothing of models or of the
// scene, only of distance, speed and time, and that is what makes it easy to test. An enemy has one, and an
// effect changes its `speedScale` (a slow, a stun) or throws it back along the route. See ../tests/walker.tests.js.

class Walker {
  constructor(route, speed, distance = 0) {
    this.route = route;
    this.speed = speed; // world units a second
    this.speedScale = 1; // a way to slow it down (or speed it up) for a while: 0.5 is half as fast
    this.distance = distance;
    this.slide = 0; // how much further it is still to be thrown back: a push is a slide, and not a jump
    this.slideRate = 0; // how fast, in world units a second
  }

  // Walks for `dt` seconds. It stops at the end of the route and doesn't go further.
  update(dt) {
    this.distance = Math.min(this.route.total, this.distance + this.speed * this.speedScale * dt);
    if (this.slide > 0) {
      const back = Math.min(this.slide, this.slideRate * dt);
      this.slide -= back;
      this.distance = Math.max(0, this.distance - back);
    }
  }

  // Throws it back along the route, by `distance`, sliding back over `seconds` (at once, if there are none). A second push while it is
  // sliding adds its distance to what is left, and the whole of it is slid in `seconds` from then. It can't be thrown back past the start.
  pushBack(distance, seconds = 0) {
    if (seconds <= 0) {
      this.distance = Math.max(0, this.distance - distance);
      return;
    }
    this.slide += distance;
    this.slideRate = this.slide / seconds;
  }

  // How far along it is, from 0 at the start to 1 at the end.
  get progress() {
    return this.route.total > 0 ? this.distance / this.route.total : 1;
  }

  // Whether it has got to the end.
  get done() {
    return this.distance >= this.route.total;
  }

  // Where it is, and which way it faces: { x, z, yaw }.
  position() {
    return pointAlong(this.route, this.distance);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Walker };
} else {
  window.Walker = Walker;
}
