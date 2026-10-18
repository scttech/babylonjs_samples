// The flying saucer: it crosses the screen, weaves up and down, and shoots at
// the ship. There is only ever one, so this is a single object that is
// "active" while it's on screen and waits to spawn again while it isn't.
//
// Two sizes, as in the arcade game. The big one is slow and sloppy; the small
// one is fast, worth far more, and aims well enough to lead a moving target.
//
// This class decides WHERE the UFO is and WHEN and AT WHAT it shoots. It does
// not own the bullets: update() returns a shot, and main.js fires it from a
// BulletSystem. `BABYLON` is only touched when `scene` is supplied, and all
// randomness goes through an injectable `random`, as in Ship, BulletSystem, and
// RockField. See ../tests/ufo.tests.js.

const UFO_SIZES = {
  large: { radius: 0.9, points: 200, speed: 3, fireInterval: 1.6, spread: 0.6, leadsTarget: false },
  small: { radius: 0.5, points: 1000, speed: 4.5, fireInterval: 1.1, spread: 0.12, leadsTarget: true },
};

class Ufo {
  constructor({
    scene = null,
    minSpawnDelay = 12, // seconds from the start (or from the last UFO) to the next one
    maxSpawnDelay = 25,
    bulletSpeed = 7, // how fast the UFO's bullets travel; the small UFO needs it to lead a target
    color = "#ff6b6b",
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.minSpawnDelay = minSpawnDelay;
    this.maxSpawnDelay = maxSpawnDelay;
    this.bulletSpeed = bulletSpeed;
    this.color = color;
    this._random = random;

    this.active = false;
    this.size = null;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 0;
    this.direction = 1; // +1 flying right, -1 flying left
    this.fireTimer = 0;
    this.weaveTimer = 0;
    this.spawnTimer = this._randomSpawnDelay();
    this.mesh = null;
  }

  // Which size to send next. The big one is common early; the longer the
  // player has survived (the higher the score), the more often the dangerous
  // small one shows up, up to a 3-in-4 chance.
  pickSize(score) {
    const smallChance = Math.min(score / 20000, 0.75);
    return this._random() < smallChance ? "small" : "large";
  }

  // Starts a UFO of the given size ("large" or "small") entering from a random
  // side of the screen at a random height.
  spawn(size, bounds) {
    const config = UFO_SIZES[size];
    const { halfWidth, halfHeight } = bounds;

    this.active = true;
    this.size = size;
    this.radius = config.radius;
    this.direction = this._random() < 0.5 ? 1 : -1;
    this.x = -this.direction * (halfWidth + this.radius); // just off the side it enters from
    this.y = (this._random() * 2 - 1) * halfHeight * 0.8;
    this.vx = this.direction * config.speed;
    this.vy = 0;
    this.fireTimer = config.fireInterval;
    this.weaveTimer = this._randomWeaveTime();

    if (this.scene) this._attach();
  }

    // Advances the UFO by dt seconds and returns a shot to fire, or null.
  //
  // While there's no UFO this counts down to the next spawn (choosing a size
  // from `score`). While there is one it flies, weaves, leaves when it reaches
  // the far side, and fires at `target` -- anything with x, y, vx and vy, such
  // as the ship -- every fireInterval seconds. Pass null as the target when
  // there is nothing to shoot at.
  update(dt, bounds, target = null, score = 0) {
    if (!this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn(this.pickSize(score), bounds);
      return null;
    }

    const { halfWidth, halfHeight } = bounds;

    // Every so often, pick a new up/down drift: up, level, or down.
    this.weaveTimer -= dt;
    if (this.weaveTimer <= 0) {
      this.vy = (Math.floor(this._random() * 3) - 1) * UFO_SIZES[this.size].speed * 0.6;
      this.weaveTimer = this._randomWeaveTime();
    }

    this.x += this.vx * dt;
    this.y = wrapCoordinate(this.y + this.vy * dt, halfHeight + this.radius);
    this._syncMesh();

    // Gone off the far side: it doesn't wrap, it leaves.
    if (this.direction * this.x > halfWidth + this.radius) {
      this._leave();
      return null;
    }

    this.fireTimer -= dt;
    if (this.fireTimer > 0 || !target) return null;
    this.fireTimer = UFO_SIZES[this.size].fireInterval;
    return this._aimAt(target);
  }

    // Shot down or rammed: removes the UFO, starts the wait for the next one,
  // and returns the points it was worth (0 if there was no UFO).
  destroy() {
    if (!this.active) return 0;
    const points = UFO_SIZES[this.size].points;
    this._leave();
    return points;
  }

  // Removes the UFO without scoring, and starts the wait over (e.g. on reset).
  reset() {
    this._leave();
  }

    // Where to shoot, as { x, y, dirX, dirY }: from the UFO toward the target.
  // The small UFO leads a moving target; the large one just aims at where it
  // is. Either way the direction is then turned by a random error, wide for
  // the large UFO and narrow for the small one.
  _aimAt(target) {
    const config = UFO_SIZES[this.size];
    const ideal = config.leadsTarget
      ? interceptDirection(this.x, this.y, target.x, target.y, target.vx, target.vy, this.bulletSpeed)
      : directionTo(this.x, this.y, target.x, target.y);

    const error = (this._random() * 2 - 1) * config.spread;
    const aim = rotateDirection(ideal, error);
    return { x: this.x, y: this.y, dirX: aim.x, dirY: aim.y };
  }

  _leave() {
    this.active = false;
    this.size = null;
    this.spawnTimer = this._randomSpawnDelay();
    this._disposeMesh();
  }

  _randomSpawnDelay() {
    return this.minSpawnDelay + this._random() * (this.maxSpawnDelay - this.minSpawnDelay);
  }

  _randomWeaveTime() {
    return 1 + this._random() * 1.5; // between 1 and 2.5 seconds
  }

    // A saucer drawn as two separate line strokes: the hull (a flat diamond
  // with a line through the middle) and the dome on top. CreateLineSystem
  // draws several disconnected polylines as one mesh.
  _attach() {
    const r = this.radius;
    const v = (x, y) => new BABYLON.Vector3(x * r, y * r, 0);

    this.mesh = BABYLON.MeshBuilder.CreateLineSystem(
      "ufo",
      {
        lines: [
          [v(-1, 0), v(-0.55, -0.35), v(0.55, -0.35), v(1, 0), v(0.55, 0.3), v(-0.55, 0.3), v(-1, 0), v(1, 0)],
          [v(-0.35, 0.3), v(-0.2, 0.6), v(0.2, 0.6), v(0.35, 0.3)],
        ],
      },
      this.scene
    );
    this.mesh.color = BABYLON.Color3.FromHexString(this.color);
    this._syncMesh();
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
  }

  _disposeMesh() {
    if (!this.mesh) return;
    this.mesh.dispose();
    this.mesh = null;
  }

}

// The size table, for callers (and tests) that need to read it without
// duplicating the numbers this class already owns.
Ufo.SIZES = UFO_SIZES;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Ufo;
} else {
  window.Ufo = Ufo;
}
