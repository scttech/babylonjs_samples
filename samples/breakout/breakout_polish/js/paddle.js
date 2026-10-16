// Player-controlled paddle: state AND rendering, following the same
// scene-optional split as Ball (see ../js/ball.js) -- BABYLON is only
// touched inside attachTo(), so moveTo()'s clamping logic can be unit
// tested without a real engine. See ../tests/paddle.tests.js.
class Paddle {
  constructor({
    scene = null,
    x = 0,
    y = 0,
    halfWidth = 1.2,
    halfHeight = 0.18,
    color = "#4a90e2",
  } = {}) {
    this.x = x;
    this.y = y;
    this.halfWidth = halfWidth;
    this.halfHeight = halfHeight;

    this.scene = null;
    this.mesh = null;
    // The box's width in geometry -- setHalfWidth() rescales the mesh
    // rather than rebuilding it, by scaling relative to this baked-in size.
    this._meshHalfWidth = halfWidth;
    if (scene) {
      this.attachTo(scene, color);
    }
  }

  // Creates the box mesh (and its material) that visually represents this
  // paddle and adds it to `scene`. Only needed if `scene` wasn't already
  // passed to the constructor.
  attachTo(scene, color = "#4a90e2") {
    this.scene = scene;
    this._meshHalfWidth = this.halfWidth;
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      "paddle",
      { width: this.halfWidth * 2, height: this.halfHeight * 2, depth: this.halfHeight * 2 },
      scene
    );
    const material = new BABYLON.StandardMaterial("paddleMaterial", scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    this.mesh.material = material;
    this._syncMesh();
    return this;
  }

  // Removes and disposes this paddle's mesh (and its material), if it has one.
  dispose() {
    if (!this.mesh) return;
    this.mesh.dispose(false, true);
    this.scene = null;
    this.mesh = null;
  }

  // Moves the paddle to targetX, clamped so it stays fully inside
  // [-boundHalfWidth, boundHalfWidth].
  moveTo(targetX, boundHalfWidth) {
    const min = -boundHalfWidth + this.halfWidth;
    const max = boundHalfWidth - this.halfWidth;
    this.x = Math.min(Math.max(targetX, min), max);
    this._syncMesh();
  }

  // Changes the paddle's half-width (used by the wide-paddle power-up) and
  // rescales the mesh to match, so the visual paddle and its collision
  // hitbox -- moveTo()'s clamp and Ball.bounceOffPaddle()'s span check both
  // read this.halfWidth directly -- never drift apart. Scales rather than
  // rebuilding the box, relative to the half-width baked into the geometry
  // at attachTo() time.
  setHalfWidth(halfWidth) {
    this.halfWidth = halfWidth;
    if (this.mesh) {
      this.mesh.scaling.x = halfWidth / this._meshHalfWidth;
    }
  }

  // Snaps the paddle back to x = 0.
  reset() {
    this.x = 0;
    this._syncMesh();
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    // Same y-flip Ball._syncMesh applies: physics/collision math works in
    // y-grows-downward space, the mesh is the one place that flips it.
    this.mesh.position.y = -this.y;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Paddle;
} else {
  window.Paddle = Paddle;
}
