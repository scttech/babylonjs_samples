// Ball state AND rendering. A Ball owns the GUI control that represents it,
// so main.js just creates/updates Ball instances instead of hand-syncing a
// separate `circle` variable per ball -- this stays manageable once more
// balls are added.
//
// Physics still doesn't require a real Babylon engine/canvas: the `BABYLON`
// global is only touched inside attachTo(), which runs solely when a `ui`
// (AdvancedDynamicTexture) is supplied. Unit tests exercise the physics
// without a `ui`, or stub `BABYLON.GUI.Ellipse` to test attach/sync/dispose
// without a real engine. See ../tests/ball.tests.js.
class Ball {
  constructor({ ui = null, x = 0, y = 0, vx = 0, vy = 0, radius = 40, color = "white" } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.rotation = 0;

    this.ui = null;
    this.control = null;
    if (ui) {
      this.attachTo(ui, color);
    }
  }

  // Creates the GUI control that visually represents this ball and adds it
  // to `ui` (a BABYLON.GUI.AdvancedDynamicTexture). Only needed if `ui`
  // wasn't already passed to the constructor.
  attachTo(ui, color = "white") {
    this.ui = ui;
    this.control = new BABYLON.GUI.Ellipse();
    this.control.width = this.radius * 2 + "px";
    this.control.height = this.radius * 2 + "px";
    this.control.thickness = 0;
    this.control.background = color;
    this.ui.addControl(this.control);
    this._syncControl();
    return this;
  }

  // Removes and disposes this ball's GUI control, if it has one.
  dispose() {
    if (!this.control) return;
    this.ui.removeControl(this.control);
    this.control.dispose();
    this.ui = null;
    this.control = null;
  }

  // Advances position by dt seconds and bounces off the edges of a
  // halfWidth/halfHeight box centered on the origin, then syncs the GUI
  // control (if attached) to match. Returns an array of bounce events (zero,
  // one, or two -- a corner hit bounces both axes in the same frame), each
  // describing where and how hard the ball hit the wall.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;
    const events = [];

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x + this.radius > halfWidth) {
      this.x = halfWidth - this.radius;
      this.vx = -this.vx;
      events.push(this._bounceEvent(this.x + this.radius, this.y, -1, 0));
    } else if (this.x - this.radius < -halfWidth) {
      this.x = -halfWidth + this.radius;
      this.vx = -this.vx;
      events.push(this._bounceEvent(this.x - this.radius, this.y, 1, 0));
    }

    if (this.y + this.radius > halfHeight) {
      this.y = halfHeight - this.radius;
      this.vy = -this.vy;
      events.push(this._bounceEvent(this.x, this.y + this.radius, 0, -1));
    } else if (this.y - this.radius < -halfHeight) {
      this.y = -halfHeight + this.radius;
      this.vy = -this.vy;
      events.push(this._bounceEvent(this.x, this.y - this.radius, 0, 1));
    }

    // Roll the ball like a wheel: spin rate follows horizontal speed, as if
    // rolling along whichever horizontal surface (top/bottom) it last touched.
    this.rotation += (this.vx / this.radius) * dt;

    this._syncControl();

    return events;
  }

  _bounceEvent(x, y, normalX, normalY) {
    return { x, y, normalX, normalY, speed: Math.hypot(this.vx, this.vy) };
  }

  _syncControl() {
    if (!this.control) return;
    this.control.left = this.x;
    this.control.top = this.y;
    this.control.rotation = this.rotation;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Ball;
} else {
  window.Ball = Ball;
}
