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
    hyperspaceCooldown = 1.5, // seconds before the ship can jump again
    hyperspaceFailChance = 0.1, // chance a jump goes wrong and destroys the ship
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
    this.hyperspaceCooldown = hyperspaceCooldown;
    this.hyperspaceFailChance = hyperspaceFailChance;
    this.hyperspaceTimer = 0; // seconds until the next jump is allowed
    this.thrusting = false;
    this.invulnerableTime = 0; // seconds of protection left
    this.visible = true; // false hides the ship entirely (e.g. on game over)

    this.scene = null;
    this.mesh = null;
    this.flame = null;
    this.model = null; // the loaded 3D model currently used as the hull, if any
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
    this.flame.setEnabled(false);

    this._syncMesh();
    return this;
  }

  // Gives the ship a loaded 3D model for a hull instead of the line art.
  // `model` is a node centered on the origin with its nose pointing up (see
  // loadModel in models.js), and `length` is how long it is from nose to tail,
  // in world units. A glowing cone under the tail is the exhaust flame.
  attachModel(scene, model, { length = this.radius * 2.4, flameColor = "#ffb347" } = {}) {
    this.scene = scene;
    this.mesh = new BABYLON.TransformNode("ship", scene);
    this.useModel(model); // the model follows the ship's position and rotation

    const flameLength = length * 0.6;
    this.flame = BABYLON.MeshBuilder.CreateCylinder(
      "shipFlame",
      { diameterTop: length * 0.28, diameterBottom: 0, height: flameLength, tessellation: 12 },
      scene
    );
    const material = new BABYLON.StandardMaterial("shipFlameMaterial", scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(flameColor);
    material.disableLighting = true; // glows at full brightness, whatever the lights are doing
    this.flame.material = material;
    this.flame.parent = this.mesh;
    // Just under the tail, overlapping it a little so there's no gap.
    this.flame.position.y = -(length / 2 + flameLength / 2) + length * 0.08;
    this.flame.setEnabled(false);

    this._syncMesh();
    return this;
  }

  // Swaps the ship's body for a different loaded model, keeping the same root
  // and exhaust flame. The old model is hidden and set free, not destroyed, so it
  // can be swapped back in later. Every model is expected to be the same length,
  // so the flame still sits under the tail.
  useModel(model) {
    if (this.model) {
      this.model.parent = null;
      this.model.setEnabled(false);
    }
    this.model = model;
    model.setEnabled(true);
    model.parent = this.mesh;
  }

  // Removes and disposes the hull and its flame child, if attached.
  dispose() {
    if (!this.mesh) return;
    this.mesh.dispose(); // recursive by default, so the flame child goes too
    this.scene = null;
    this.mesh = null;
    this.flame = null;
    this.model = null;
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

    const x = wrapCoordinate(this.x, halfWidth + this.radius);
    const y = wrapCoordinate(this.y, halfHeight + this.radius);
    const wrappedX = x !== this.x;
    const wrappedY = y !== this.y;
    this.x = x;
    this.y = y;
    this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
    this.hyperspaceTimer = Math.max(0, this.hyperspaceTimer - dt);

    this._syncMesh();
    this.thrusting = false; // must be re-asserted by thrust() every frame
    return { wrappedX, wrappedY };
  }

  // Where a bullet should leave the ship: the nose posiiton, plus the unit
  // vector the ship is pointing along
  muzzle() {
    const dirX = -Math.sin(this.angle);
    const dirY = Math.cos(this.angle);
    return { x: this.x + dirX * this.radius, y: this.y + dirY * this.radius, dirX, dirY };
  }

  // True when the ship is allowed to jump to hyperspace again.
  get hyperspaceReady() {
    return this.hyperspaceTimer <= 0;
  }

  // The emergency escape: vanish and reappear somewhere random on the screen,
  // stopped dead. It's a gamble -- the new spot might be on top of a rock, and
  // there's a small chance the jump itself fails. Returns true if the ship
  // survived, false if the jump went wrong. The caller decides what failing
  // means; the ship is only moved. `random` can be replaced in tests.
  hyperspace(bounds, random = Math.random) {
    this.x = (random() * 2 - 1) * bounds.halfWidth;
    this.y = (random() * 2 - 1) * bounds.halfHeight;
    this.vx = 0;
    this.vy = 0;
    this.hyperspaceTimer = this.hyperspaceCooldown;
    this._syncMesh();
    return random() >= this.hyperspaceFailChance;
  }

  // True while the ship is protected from rocks (just after respawning).
  get invulnerable() {
    return this.invulnerableTime > 0;
  }

  // Whether the ship should be drawn this instant. While protected it blinks
  // ten times a second, so the player can see it can't be hurt; a hidden ship
  // is never drawn.
  get drawn() {
    if (!this.visible) return false;
    if (!this.invulnerable) return true;
    return Math.floor(this.invulnerableTime * 10) % 2 === 0;
  }

  // Protects the ship from rocks for the given number of seconds.
  makeInvulnerable(seconds) {
    this.invulnerableTime = seconds;
    this._syncMesh();
  }

  // Back to the center at rest, and protected for a few seconds. This is what
  // happens after the ship loses a life.
  respawn(invulnerableSeconds = 3) {
    this.reset();
    this.makeInvulnerable(invulnerableSeconds);
  }

  // Shows or hides the ship entirely.
  setVisible(visible) {
    this.visible = visible;
    this._syncMesh();
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
    this.invulnerableTime = 0;
    this.visible = true;
    this.hyperspaceTimer = 0;
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
    const drawn = this.drawn;
    this.mesh.setEnabled(drawn);
    this.flame.setEnabled(drawn && this.thrusting);
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
