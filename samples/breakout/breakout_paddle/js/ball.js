// Ball state AND rendering, carried over from Bouncing Ball Particles &
// Friction unchanged except for one addition: bounceOffPaddle(), which
// handles the new paddle collision this sample introduces. update()'s
// wall-bounce logic, restitution/rest handling, and mesh sync are untouched.
//
// Physics still doesn't require a real Babylon engine/scene: `BABYLON` is
// only touched inside attachTo(), which runs solely when a `scene` is
// supplied. Unit tests exercise the physics without a `scene`, or stub
// `BABYLON.MeshBuilder`/`BABYLON.StandardMaterial` to test attach/sync/
// dispose without a real engine. See ../tests/ball.tests.js.
class Ball {
  constructor({
    scene = null,
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    radius = 0.6,
    color = "#ffffff",
    restitution = 0.82, // fraction of speed kept on each wall bounce, so energy bleeds off over time
    restThreshold = 0.05, // speed below which the ball is considered settled and snapped to a full stop
  } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.rotation = 0;
    this.restitution = restitution;
    this.restThreshold = restThreshold;

    this.scene = null;
    this.mesh = null;
    if (scene) {
      this.attachTo(scene, color);
    }
  }

  // Creates the sphere mesh (and its material) that visually represents
  // this ball and adds it to `scene`. Only needed if `scene` wasn't already
  // passed to the constructor.
  attachTo(scene, color = "#ffffff") {
    this.scene = scene;
    this.mesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: this.radius * 2, segments: 32 }, scene);
    const material = new BABYLON.StandardMaterial("ballMaterial", scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    this.mesh.material = material;
    this._syncMesh();
    return this;
  }

  // Removes and disposes this ball's mesh (and its material), if it has one.
  dispose() {
    if (!this.mesh) return;
    this.mesh.dispose(false, true);
    this.scene = null;
    this.mesh = null;
  }

  // Advances position by dt seconds and bounces off the edges of a
  // halfWidth/halfHeight box centered on the origin, then syncs the mesh
  // (if attached) to match. Returns an array of bounce events (zero, one, or
  // two -- a corner hit bounces both axes in the same frame), each
  // describing where and how hard the ball hit the wall.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;
    const events = [];

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x + this.radius > halfWidth) {
      this.x = halfWidth - this.radius;
      this.vx = -this.vx * this.restitution;
      events.push(this._bounceEvent(this.x + this.radius, this.y, -1, 0));
    } else if (this.x - this.radius < -halfWidth) {
      this.x = -halfWidth + this.radius;
      this.vx = -this.vx * this.restitution;
      events.push(this._bounceEvent(this.x - this.radius, this.y, 1, 0));
    }

    if (this.y + this.radius > halfHeight) {
      this.y = halfHeight - this.radius;
      this.vy = -this.vy * this.restitution;
      events.push(this._bounceEvent(this.x, this.y + this.radius, 0, -1));
    } else if (this.y - this.radius < -halfHeight) {
      this.y = -halfHeight + this.radius;
      this.vy = -this.vy * this.restitution;
      events.push(this._bounceEvent(this.x, this.y - this.radius, 0, 1));
    }

    // Each bounce above already bled off speed via restitution; once total
    // speed decays below restThreshold, snap fully to rest instead of letting
    // it bounce on forever at an imperceptible (but nonzero) speed.
    if (events.length > 0 && Math.hypot(this.vx, this.vy) < this.restThreshold) {
      this.vx = 0;
      this.vy = 0;
    }

    // Roll the ball like a wheel: spin rate follows horizontal speed, as if
    // rolling along whichever horizontal surface (top/bottom) it last touched.
    this.rotation += (this.vx / this.radius) * dt;

    this._syncMesh();

    return events;
  }

  // Checks for a collision against the paddle's top edge and, if hit,
  // deflects the ball off it. Only reflects when the ball is moving toward
  // the paddle (vy > 0) so it can't double-bounce on the same overlap while
  // still touching it after being deflected. Steers vx by how far off-center
  // the hit landed (classic Breakout paddle English) and rescales the
  // resulting (vx, vy) back to the pre-bounce speed, so a paddle hit -- like
  // a wall hit -- never changes the ball's total energy. Returns a bounce
  // event in the same shape as a wall bounce (or null if there's no hit), so
  // callers can feed both through the same spark/sound/HUD path.
  bounceOffPaddle(paddle) {
    if (this.vy <= 0) return null;

    const paddleTop = paddle.y - paddle.halfHeight;
    const withinReach = this.y + this.radius >= paddleTop && this.y - this.radius <= paddle.y + paddle.halfHeight;
    const withinSpan = this.x + this.radius >= paddle.x - paddle.halfWidth && this.x - this.radius <= paddle.x + paddle.halfWidth;
    if (!withinReach || !withinSpan) return null;

    const speed = Math.hypot(this.vx, this.vy);
    this.y = paddleTop - this.radius;

    // -1 (left edge) .. +1 (right edge), how far off-center the hit landed.
    const offset = Math.min(Math.max((this.x - paddle.x) / paddle.halfWidth, -1), 1);
    const steer = 0.9; // radians of extra launch angle at a full edge hit
    const angle = -Math.PI / 2 + offset * steer; // straight up, tilted by offset

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this._syncMesh();

    return this._bounceEvent(this.x, paddleTop, 0, -1);
  }

  // Snaps the ball back to (x, y) with the given velocity. Used to give the
  // ball a clean restart/relaunch.
  reset(x = 0, y = 0, vx = 0, vy = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rotation = 0;
    this._syncMesh();
  }

  _bounceEvent(x, y, normalX, normalY) {
    return { x, y, normalX, normalY, speed: Math.hypot(this.vx, this.vy) };
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    // Babylon's world Y axis points up; every other part of this sample
    // (physics, paddle collision, spark spawn points) works in the same
    // y-grows-downward space the earlier GUI-based samples used, so the mesh
    // is the one place that needs to flip the sign.
    this.mesh.position.y = -this.y;
    this.mesh.rotation.z = -this.rotation;
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
