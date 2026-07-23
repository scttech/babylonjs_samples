// A grid of destructible bricks. Bricks are plain records
// ({x, y, halfWidth, halfHeight, points, alive, mesh}), not their own class
// -- like SparkSystem's particle bursts (see ../js/sparks.js), they're
// simple enough that a full scene-optional attach/dispose class per brick
// would just be overhead. BrickGrid owns their layout, collision
// resolution, and mesh lifecycle instead; `BABYLON` is only touched when
// `scene` is supplied, matching every other class in this sample. See
// ../tests/bricks.tests.js.

const DEFAULT_ROW_COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db"];
const DEFAULT_POINTS_PER_ROW = [50, 40, 30, 20, 10]; // top row worth the most

class BrickGrid {
  constructor({
    scene = null,
    rows = 5,
    cols = 8,
    halfWidth = 0.55, // per-brick half-width
    halfHeight = 0.25, // per-brick half-height
    gap = 0.12,
    top = -5, // y of the top row's center
    colors = DEFAULT_ROW_COLORS,
    pointsPerRow = DEFAULT_POINTS_PER_ROW,
  } = {}) {
    this.scene = scene;
    this.rows = rows;
    this.cols = cols;
    this.halfWidth = halfWidth;
    this.halfHeight = halfHeight;
    this.gap = gap;
    this.top = top;
    this.colors = colors;
    this.pointsPerRow = pointsPerRow;
    this.bricks = [];
    this._build();
  }

  // Checks the ball against every alive brick and resolves at most one hit
  // per call -- the standard simplification for simple breakout clones. A
  // fast-moving ball can technically overlap two bricks in the same frame,
  // but resolving just the first keeps the collision math simple, and the
  // next frame catches whatever's left. Destroys the hit brick (marks it
  // dead and disposes its mesh) and returns { event, points }, or null if
  // the ball isn't touching any brick.
  checkCollision(ball) {
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const event = ball.bounceOffBrick(brick);
      if (!event) continue;

      brick.alive = false;
      this._disposeBrickMesh(brick);
      return { event, points: brick.points };
    }
    return null;
  }

  // True once every brick has been destroyed.
  isCleared() {
    return this.bricks.every((brick) => !brick.alive);
  }

  // Respawns the full grid, alive and freshly meshed -- used on reset to
  // give the board a clean restart, same as Ball/Paddle's reset().
  reset() {
    this._build();
  }

  // Disposes every brick's mesh, if any, and clears the grid.
  dispose() {
    for (const brick of this.bricks) {
      this._disposeBrickMesh(brick);
    }
    this.bricks = [];
  }

  // (Re)lays out every brick in a centered rows x cols grid, row `top`
  // downward. Shared by the constructor and reset().
  _build() {
    this.dispose();

    const rowHeight = this.halfHeight * 2 + this.gap;
    const colWidth = this.halfWidth * 2 + this.gap;
    const totalWidth = this.cols * colWidth - this.gap;
    const startX = -totalWidth / 2 + this.halfWidth;

    for (let row = 0; row < this.rows; row++) {
      const y = this.top + row * rowHeight;
      const color = this.colors[row % this.colors.length];
      const points = this.pointsPerRow[row % this.pointsPerRow.length];

      for (let col = 0; col < this.cols; col++) {
        const x = startX + col * colWidth;
        const brick = {
          x,
          y,
          halfWidth: this.halfWidth,
          halfHeight: this.halfHeight,
          points,
          alive: true,
          mesh: null,
        };
        if (this.scene) this._attachBrick(brick, color);
        this.bricks.push(brick);
      }
    }
  }

  _attachBrick(brick, color) {
    brick.mesh = BABYLON.MeshBuilder.CreateBox(
      "brick",
      { width: brick.halfWidth * 2, height: brick.halfHeight * 2, depth: brick.halfHeight * 2 },
      this.scene
    );
    const material = new BABYLON.StandardMaterial("brickMaterial", this.scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    brick.mesh.material = material;
    brick.mesh.position.x = brick.x;
    // Same y-flip every other mesh in this sample applies: physics/collision
    // math works in y-grows-downward space, the mesh is the one place that
    // flips it.
    brick.mesh.position.y = -brick.y;
  }

  _disposeBrickMesh(brick) {
    if (!brick.mesh) return;
    brick.mesh.dispose(false, true);
    brick.mesh = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = BrickGrid;
} else {
  window.BrickGrid = BrickGrid;
}
