// Spark particle system: physics (gravity, drag, lifetime) plus the GUI
// controls that draw each particle, mirroring the split in Ball.js. A Ball's
// bounce events feed spawn(), and update(dt) advances/culls particles each
// frame.
//
// `BABYLON` is only touched when `ui` is supplied, same as Ball. Randomness
// goes through an injectable `random` function (defaults to Math.random) so
// spawn behavior can be tested deterministically without a real engine. See
// ../tests/sparks.tests.js.

const DEFAULT_SPARK_COLORS = ["#fff59d", "#ffca28", "#ff7043", "#ffffff"];

class SparkSystem {
  constructor({
    ui = null,
    gravity = 500, // px/s^2, pulls sparks downward
    drag = 0.985, // per-frame velocity damping
    colors = DEFAULT_SPARK_COLORS,
    random = Math.random,
  } = {}) {
    this.ui = ui;
    this.gravity = gravity;
    this.drag = drag;
    this.colors = colors;
    this.sparks = [];
    this._random = random;
  }

  // Spawns a burst of sparks at (x, y) flying outward around the given
  // (normalX, normalY) surface normal.
  spawn(x, y, normalX, normalY) {
    const count = 14 + Math.floor(this._random() * 8);
    const baseAngle = Math.atan2(normalY, normalX);

    for (let i = 0; i < count; i++) {
      const spread = (this._random() - 0.5) * Math.PI * 0.8; // ~±72°
      const angle = baseAngle + spread;
      const speed = 140 + this._random() * 260;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.25 + this._random() * 0.35;
      const color = this.colors[Math.floor(this._random() * this.colors.length)];

      const spark = { x, y, vx, vy, life, maxLife: life, control: null };
      if (this.ui) {
        spark.control = this._createControl(color);
      }
      this.sparks.push(spark);
      this._syncControl(spark);
    }
  }

  // Advances every spark by dt seconds (gravity + drag), and removes (and
  // disposes) any whose lifetime has expired.
  update(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.vy += this.gravity * dt;
      spark.vx *= this.drag;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.life -= dt;

      if (spark.life <= 0) {
        this._disposeSpark(spark);
        this.sparks.splice(i, 1);
        continue;
      }

      this._syncControl(spark);
    }
  }

  // Removes and disposes every current spark.
  dispose() {
    for (const spark of this.sparks) {
      this._disposeSpark(spark);
    }
    this.sparks = [];
  }

  _createControl(color) {
    const control = new BABYLON.GUI.Rectangle();
    control.width = "5px";
    control.height = "2px";
    control.thickness = 0;
    control.background = color;
    this.ui.addControl(control);
    return control;
  }

  _syncControl(spark) {
    if (!spark.control) return;
    spark.control.left = spark.x;
    spark.control.top = spark.y;
    spark.control.alpha = spark.life / spark.maxLife;
    spark.control.rotation = Math.atan2(spark.vy, spark.vx);
  }

  _disposeSpark(spark) {
    if (!spark.control) return;
    this.ui.removeControl(spark.control);
    spark.control.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = SparkSystem;
} else {
  window.SparkSystem = SparkSystem;
}
