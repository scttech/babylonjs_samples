// Ball state AND rendering, extended from the Bouncing Ball with Unit Tests
// sample with a slingshot-style drag/release cycle: beginDrag() freezes the
// ball at its current position (its "anchor"), dragTo() follows the pointer
// clamped to a max pull distance, and release() launches the ball opposite
// the pull direction at a speed proportional to how far it was pulled.
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

    // Slingshot drag state. anchorX/anchorY is the position the ball
    // launches from and snaps back to on release; only meaningful while
    // dragging is true.
    this.dragging = false;
    this.anchorX = x;
    this.anchorY = y;

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

  // Starts a slingshot pull: records the current position as the anchor to
  // launch from/snap back to, and zeroes velocity so the ball holds still.
  // Callers should skip update() while dragging is true.
  beginDrag() {
    this.dragging = true;
    this.anchorX = this.x;
    this.anchorY = this.y;
    this.vx = 0;
    this.vy = 0;
  }

  // Follows the pointer at (px, py) while dragging, clamped to at most
  // maxDragDistance from the anchor. Returns the pull strength (0..1,
  // clamped distance / maxDragDistance) so callers can drive a strength-based
  // indicator without recomputing the clamp themselves.
  dragTo(px, py, maxDragDistance) {
    const dx = px - this.anchorX;
    const dy = py - this.anchorY;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, maxDragDistance);
    const scale = distance > 0 ? clamped / distance : 0;

    this.x = this.anchorX + dx * scale;
    this.y = this.anchorY + dy * scale;
    this._syncControl();

    return maxDragDistance > 0 ? clamped / maxDragDistance : 0;
  }

  // Ends a drag: launches the ball from the anchor, opposite the pull
  // direction, at a speed proportional to how far it was pulled (0 at the
  // anchor, maxSpeed at maxDragDistance). A release with no pull leaves the
  // ball at rest on the anchor.
  release(maxDragDistance, maxSpeed) {
    const dx = this.x - this.anchorX;
    const dy = this.y - this.anchorY;
    const distance = Math.hypot(dx, dy);

    this.x = this.anchorX;
    this.y = this.anchorY;

    if (distance > 0 && maxDragDistance > 0) {
      const strength = Math.min(distance / maxDragDistance, 1);
      const speed = strength * maxSpeed;
      this.vx = (-dx / distance) * speed;
      this.vy = (-dy / distance) * speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.dragging = false;
    this._syncControl();
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
