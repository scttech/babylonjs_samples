// Ball state AND rendering, adapted from the Bouncing Ball HUD sample to
// render as a real lit mesh in world space instead of a flat BABYLON.GUI
// control. Every physics/drag method (update, beginDrag, dragTo, release,
// reset) is untouched -- it was already unit-agnostic, so it works the same
// whether x/y mean screen pixels or world units. Only attachTo()/dispose()/
// the sync step (renamed _syncMesh) change, since they're the only parts
// that know how the ball is actually drawn.
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

    // Slingshot drag state. anchorX/anchorY is the position the ball
    // launches from and snaps back to on release; only meaningful while
    // dragging is true.
    this.dragging = false;
    this.anchorX = x;
    this.anchorY = y;

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
    this._syncMesh();

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
    this._syncMesh();
  }

  // Snaps the ball back to (x, y) at rest -- zero velocity and rotation --
  // canceling any in-progress drag. Used to give the ball a clean restart.
  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.dragging = false;
    this._syncMesh();
  }

  _bounceEvent(x, y, normalX, normalY) {
    return { x, y, normalX, normalY, speed: Math.hypot(this.vx, this.vy) };
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    // Babylon's world Y axis points up; every other part of this sample
    // (physics, dragging, spark spawn points) works in the same y-grows-
    // downward space the earlier GUI-based samples used, so the mesh is the
    // one place that needs to flip the sign.
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
