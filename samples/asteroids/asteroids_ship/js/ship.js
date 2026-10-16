// Player-controlled ship: state AND rendering, following the same
// scene-optional split Ball and Paddle use in the earlier series -- BABYLON is
// only touched inside attachTo(), so the rotation/thrust/inertia/wrap math can
// be unit tested without a real engine. See ../tests/ship.tests.js.
//
// Unlike Ball/Paddle, this class works in plain y-UP world coordinates (no
// y-flip when syncing the mesh). Rotation makes a y-down convention easy to
// get backwards, and nothing here shares a coordinate space with GUI pixels.
// `angle` is in radians, 0 = pointing straight up, positive = counter-clockwise.
class Ship {
  constructor({
    scene = null,
    x = 0,
    y = 0,
    angle = 0,
    radius = 0.6,
    turnSpeed = 3.5, // rad/s while a turn key is held
    thrustAccel = 9, // world units/s^2 while thrusting
    maxSpeed = 10, // world units/s -- a cap so the ship can't accelerate forever
    drag = 0, // fraction of velocity lost per second; 0 = pure inertia
    color = "#ffffff",
  } = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.radius = radius;
    this.turnSpeed = turnSpeed;
    this.thrustAccel = thrustAccel;
    this.maxSpeed = maxSpeed;
    this.drag = drag;
    this.thrusting = false;

    this.scene = null;
    this.mesh = null;
    this.flame = null;
    if (scene) {
      this.attachTo(scene, color);
    }
  }

  // Creates the line-art hull (and a flame child shown while thrusting) and
  // adds them to `scene`. Only needed if `scene` wasn't passed to the constructor.
  attachTo(scene, color = "#ffffff") {
    this.scene = scene;
    const r = this.radius;

    this.mesh = BABYLON.MeshBuilder.CreateLines(
      "ship",
      {
        points: [
          new BABYLON.Vector3(0, r, 0), // nose
          new BABYLON.Vector3(-0.7 * r, -0.8 * r, 0),
          new BABYLON.Vector3(0, -0.4 * r, 0), // rear notch
          new BABYLON.Vector3(0.7 * r, -0.8 * r, 0),
          new BABYLON.Vector3(0, r, 0),
        ],
      },
      scene
    );
    this.mesh.color = BABYLON.Color3.FromHexString(color);

    this.flame = BABYLON.MeshBuilder.CreateLines(
      "shipFlame",
      {
        points: [
          new BABYLON.Vector3(-0.3 * r, -0.55 * r, 0),
          new BABYLON.Vector3(0, -1.3 * r, 0),
          new BABYLON.Vector3(0.3 * r, -0.55 * r, 0),
        ],
      },
      scene
    );
    this.flame.color = BABYLON.Color3.FromHexString("#ffb347");
    this.flame.parent = this.mesh; // inherits the ship's position and rotation
    this.flame.isVisible = false;

    this._syncMesh();
    return this;
  }

  // Removes and disposes the hull and its flame child, if attached.
  dispose() {
    if (!this.mesh) return;
    this.mesh.dispose(); // recursive by default, so the flame child goes too
    this.scene = null;
    this.mesh = null;
    this.flame = null;
  }

  // Turns the ship by dt seconds' worth of rotation. direction: -1 = clockwise
  // (right), +1 = counter-clockwise (left).
  rotate(direction, dt) {
    this.angle += direction * this.turnSpeed * dt;
  }

  // Accelerates along the ship's current heading for dt seconds. Only changes
  // velocity -- the ship keeps drifting on its old heading if it turns
  // afterwards, which is the whole feel of the game.
  thrust(dt) {
    this.thrusting = true;
    this.vx += -Math.sin(this.angle) * this.thrustAccel * dt;
    this.vy += Math.cos(this.angle) * this.thrustAccel * dt;
    this._clampSpeed();
  }

  // Integrates position by dt seconds, wraps around the edges of a
  // halfWidth/halfHeight box centered on the origin, then syncs the mesh.
  // Returns { wrappedX, wrappedY } so callers can react to a wrap. The ship
  // only wraps once it is fully off-screen (by `radius`), so it slides off one
  // edge completely before appearing on the opposite one.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;

    if (this.drag > 0) {
      const keep = Math.max(0, 1 - this.drag * dt);
      this.vx *= keep;
      this.vy *= keep;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const limitX = halfWidth + this.radius;
    const limitY = halfHeight + this.radius;
    let wrappedX = false;
    let wrappedY = false;

    if (this.x > limitX) {
      this.x = -limitX;
      wrappedX = true;
    } else if (this.x < -limitX) {
      this.x = limitX;
      wrappedX = true;
    }
    if (this.y > limitY) {
      this.y = -limitY;
      wrappedY = true;
    } else if (this.y < -limitY) {
      this.y = limitY;
      wrappedY = true;
    }

    this._syncMesh();
    this.thrusting = false; // must be re-asserted by thrust() every frame
    return { wrappedX, wrappedY };
  }

  // Current speed in world units/s.
  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  // Back to the center at rest, pointing up.
  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.thrusting = false;
    this._syncMesh();
  }

  _clampSpeed() {
    const speed = this.speed;
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
    this.mesh.rotation.z = this.angle;
    this.flame.isVisible = this.thrusting;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Ship;
} else {
  window.Ship = Ship;
}
