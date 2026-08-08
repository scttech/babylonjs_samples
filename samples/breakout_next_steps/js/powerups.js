// Falling power-up pickups. An item is a plain record ({x, y, type, mesh}),
// not its own class -- same reasoning as BrickGrid's bricks (see
// ../js/bricks.js): simple enough that a full scene-optional attach/dispose
// class per item would just be overhead. PowerUpManager owns spawning,
// falling, catching, and mesh lifecycle; `BABYLON` is only touched when
// `scene` is supplied, matching every other class in this series. See
// ../tests/powerups.tests.js.
//
// What each type actually *does* on catch (widen the paddle, add a life,
// split into extra balls) is main.js's job, not this file's -- this class
// only tracks what's falling and reports which type got caught.

const POWERUP_COLORS = {
  wide: "#3498db", // widens the paddle
  life: "#e91e63", // +1 life
  multi: "#2ecc71", // splits into extra balls
};

class PowerUpManager {
  constructor({ scene = null, fallSpeed = 2.5, radius = 0.18 } = {}) {
    this.scene = scene;
    this.fallSpeed = fallSpeed;
    this.radius = radius;
    this.items = [];
  }

  // Starts a new item of `type` falling from (x, y). A no-op for unknown
  // types, so a bad random pick elsewhere fails silently rather than
  // spawning an uncolored/uncatchable item.
  spawn(x, y, type) {
    if (!POWERUP_COLORS[type]) return;
    const item = { x, y, type, mesh: null };
    if (this.scene) this._attach(item);
    this.items.push(item);
  }

  // Advances every item by fallSpeed * dt and removes (disposes) any that
  // fall past the bottom of `bounds` uncaught.
  update(dt, bounds) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += this.fallSpeed * dt;
      if (item.mesh) item.mesh.position.y = -item.y;

      if (item.y - this.radius > bounds.halfHeight) {
        this._disposeItem(item);
        this.items.splice(i, 1);
      }
    }
  }

  // Checks every falling item against the paddle's box and, on the first
  // overlap, removes (catches) that item and returns its type. Returns null
  // if nothing overlaps.
  checkCollision(paddle) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const withinReach = item.y + this.radius >= paddle.y - paddle.halfHeight && item.y - this.radius <= paddle.y + paddle.halfHeight;
      const withinSpan = item.x + this.radius >= paddle.x - paddle.halfWidth && item.x - this.radius <= paddle.x + paddle.halfWidth;
      if (!withinReach || !withinSpan) continue;

      const type = item.type;
      this._disposeItem(item);
      this.items.splice(i, 1);
      return type;
    }
    return null;
  }

  // Removes and disposes every in-flight item.
  dispose() {
    for (const item of this.items) {
      this._disposeItem(item);
    }
    this.items = [];
  }

  _attach(item) {
    item.mesh = BABYLON.MeshBuilder.CreateSphere("powerup", { diameter: this.radius * 2, segments: 12 }, this.scene);
    const material = new BABYLON.StandardMaterial("powerupMaterial", this.scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(POWERUP_COLORS[item.type]);
    item.mesh.material = material;
    item.mesh.position.x = item.x;
    // Same y-flip every other mesh in this sample applies: physics/collision
    // math works in y-grows-downward space, the mesh is the one place that
    // flips it.
    item.mesh.position.y = -item.y;
  }

  _disposeItem(item) {
    if (!item.mesh) return;
    item.mesh.dispose(false, true);
    item.mesh = null;
  }
}

// The set of valid types, for callers (main.js) to pick a random one from
// without duplicating the list this class already owns.
PowerUpManager.TYPES = Object.keys(POWERUP_COLORS);

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = PowerUpManager;
} else {
  window.PowerUpManager = PowerUpManager;
}
