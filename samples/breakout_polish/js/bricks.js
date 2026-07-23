// A grid of destructible bricks laid out from a level *pattern* instead of
// a uniform rows x cols rectangle -- see ../js/main.js's LEVELS array and
// parseLevel(). A pattern is a 2D array of durability values, one per grid
// cell: 0 means no brick there at all (so a level's shape doesn't have to
// be a solid rectangle), and N > 0 means a brick that survives N hits.
//
// Bricks are plain records ({x, y, halfWidth, halfHeight, hits, alive,
// mesh}), not their own class -- like SparkSystem's particle bursts (see
// ../js/sparks.js), they're simple enough that a full scene-optional
// attach/dispose class per brick would just be overhead. BrickGrid owns
// their layout, collision resolution, and mesh lifecycle instead; `BABYLON`
// is only touched when `scene` is supplied, matching every other class in
// this series. See ../tests/bricks.tests.js.

// Color keyed by a brick's *remaining* hit count, not its starting
// durability -- so a brick that started tough and a brick that started
// fragile look identical once they're both down to, say, 1 hit left. That
// makes remaining hits readable at a glance regardless of a brick's history.
const DEFAULT_COLORS_BY_HITS = {
  1: "#2ecc71", // green: one more hit destroys it
  2: "#f1c40f", // yellow
  3: "#e67e22", // orange
  4: "#e74c3c", // red: toughest bricks this series uses
};

class BrickGrid {
  constructor({
    scene = null,
    pattern = [],
    halfWidth = 0.55, // per-brick half-width
    halfHeight = 0.25, // per-brick half-height
    gap = 0.12,
    top = -5, // y of row 0's center
    colorsByHits = DEFAULT_COLORS_BY_HITS,
    pointsPerHit = 10,
  } = {}) {
    this.scene = scene;
    this.halfWidth = halfWidth;
    this.halfHeight = halfHeight;
    this.gap = gap;
    this.top = top;
    this.colorsByHits = colorsByHits;
    this.pointsPerHit = pointsPerHit;
    this.pattern = pattern;
    this.bricks = [];
    this._build();
  }

  // Tears down the current bricks and lays out a new pattern -- used both
  // to advance to the next level and to restart at level 0 on Reset.
  load(pattern) {
    this.pattern = pattern;
    this._build();
  }

  // Checks the ball against every alive brick and resolves at most one hit
  // per call -- the standard simplification for simple breakout clones. A
  // fast-moving ball can technically overlap two bricks in the same frame,
  // but resolving just the first keeps the collision math simple, and the
  // next frame catches whatever's left. A hit brick loses one hit point;
  // once it reaches 0 it's destroyed (marked dead, mesh disposed), otherwise
  // its mesh is recolored to reflect its remaining hits. Returns
  // { event, points, destroyed, x, y } -- x/y are the brick's position, so a
  // caller can decide whether to spawn something (this sample spawns a
  // power-up there sometimes; see PowerUpManager in ../js/powerups.js) --
  // or null if the ball isn't touching any brick.
  checkCollision(ball) {
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const event = ball.bounceOffBrick(brick);
      if (!event) continue;

      brick.hits -= 1;
      const destroyed = brick.hits <= 0;
      if (destroyed) {
        brick.alive = false;
        this._disposeBrickMesh(brick);
      } else if (brick.mesh) {
        brick.mesh.material.diffuseColor = BABYLON.Color3.FromHexString(this._colorFor(brick.hits));
      }
      return { event, points: this.pointsPerHit, destroyed, x: brick.x, y: brick.y };
    }
    return null;
  }

  // True once every brick in the current pattern has been destroyed.
  isCleared() {
    return this.bricks.every((brick) => !brick.alive);
  }

  // Disposes every brick's mesh, if any, and clears the grid.
  dispose() {
    for (const brick of this.bricks) {
      this._disposeBrickMesh(brick);
    }
    this.bricks = [];
  }

  // (Re)lays out every brick in `this.pattern`, a centered grid, `top`
  // downward. Cells with a durability of 0 or less produce no brick at all,
  // so a pattern's silhouette doesn't have to be a solid rectangle. Shared
  // by the constructor and load().
  _build() {
    this.dispose();

    const cols = this.pattern.reduce((max, row) => Math.max(max, row.length), 0);
    const rowHeight = this.halfHeight * 2 + this.gap;
    const colWidth = this.halfWidth * 2 + this.gap;
    const totalWidth = cols * colWidth - this.gap;
    const startX = -totalWidth / 2 + this.halfWidth;

    for (let row = 0; row < this.pattern.length; row++) {
      const y = this.top + row * rowHeight;
      for (let col = 0; col < this.pattern[row].length; col++) {
        const durability = this.pattern[row][col];
        if (durability <= 0) continue;

        const x = startX + col * colWidth;
        const brick = {
          x,
          y,
          halfWidth: this.halfWidth,
          halfHeight: this.halfHeight,
          hits: durability,
          alive: true,
          mesh: null,
        };
        if (this.scene) this._attachBrick(brick, this._colorFor(durability));
        this.bricks.push(brick);
      }
    }
  }

  _colorFor(hits) {
    return this.colorsByHits[hits] || this.colorsByHits[Object.keys(this.colorsByHits).length];
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
