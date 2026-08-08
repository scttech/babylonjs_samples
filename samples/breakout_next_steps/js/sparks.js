// Spark bursts, now backed by Babylon's own BABYLON.ParticleSystem instead of
// a hand-rolled gravity/drag/lifetime simulation driving individual GUI
// controls. Each bounce spawns one one-shot particle system in world space
// (a sibling of the ball mesh, not a screen-space GUI overlay); Babylon's own
// particle engine handles all per-particle motion (gravity, fade), so this
// class only tracks each burst's own remaining lifetime (maxLifeTime plus a
// buffer for the manualEmitCount ramp-up) and disposes it once that elapses.
// Babylon's own `isAlive()`/`getActiveCount()` flags can't drive this instead:
// right after `start()`, they still read as "empty" for a frame or two while
// the engine's internal particle update catches up, so polling them risks
// disposing a fresh burst before it ever draws a particle.
//
// `BABYLON` is only touched when `scene` is supplied, same split as Ball:
// tests stub `BABYLON.ParticleSystem`/`BABYLON.Vector3`/`BABYLON.Color3` to
// check burst configuration and lifecycle without a real engine. See
// ../tests/sparks.tests.js.

const DEFAULT_SPARK_COLORS = ["#fff59d", "#ffca28", "#ff7043", "#ffffff"];

class SparkSystem {
  constructor({
    scene = null,
    gravity = 18, // world units/s^2, pulls sparks downward
    minEmitPower = 3, // world units/s
    maxEmitPower = 9, // world units/s
    minLifeTime = 0.25, // seconds
    maxLifeTime = 0.6, // seconds
    minSize = 0.05, // world units
    maxSize = 0.15, // world units
    colors = DEFAULT_SPARK_COLORS,
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.gravity = gravity;
    this.minEmitPower = minEmitPower;
    this.maxEmitPower = maxEmitPower;
    this.minLifeTime = minLifeTime;
    this.maxLifeTime = maxLifeTime;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.colors = colors;
    this.systems = [];
    this._random = random;
    this._texture = scene ? this._createTexture(scene) : null;
  }

  // Spawns a one-shot burst of particles at (x, y) flying outward around the
  // given (normalX, normalY) surface normal. A no-op unless a scene was
  // supplied, matching how Ball only renders when attached to one.
  spawn(x, y, normalX, normalY) {
    if (!this.scene) return;

    const count = 14 + Math.floor(this._random() * 8);
    const baseAngle = Math.atan2(normalY, normalX);
    const spread = Math.PI * 0.4; // +-72 degrees, so the burst reads as a fan around the normal
    const a1 = baseAngle - spread;
    const a2 = baseAngle + spread;

    const startColor = this._pickColor();
    const endColor = this._pickColor();

    const system = new BABYLON.ParticleSystem("sparks", 40, this.scene);
    system.particleTexture = this._texture;
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    system.emitter = new BABYLON.Vector3(x, y, 0);
    system.minEmitBox = BABYLON.Vector3.Zero();
    system.maxEmitBox = BABYLON.Vector3.Zero();
    system.direction1 = new BABYLON.Vector3(Math.cos(a1), Math.sin(a1), 0);
    system.direction2 = new BABYLON.Vector3(Math.cos(a2), Math.sin(a2), 0);
    system.minEmitPower = this.minEmitPower;
    system.maxEmitPower = this.maxEmitPower;
    system.gravity = new BABYLON.Vector3(0, -this.gravity, 0);
    system.minLifeTime = this.minLifeTime;
    system.maxLifeTime = this.maxLifeTime;
    system.minSize = this.minSize;
    system.maxSize = this.maxSize;
    system.color1 = this._toColor4(startColor);
    system.color2 = this._toColor4(endColor);
    system.colorDead = this._toColor4(endColor, 0);
    system.emitRate = count * 20; // high enough that manualEmitCount below empties in ~1 frame
    system.manualEmitCount = count;

    system.start();
    // ttl covers the ramp-up (emitting `count` particles at emitRate) plus the
    // longest a single particle can live, so the burst is never disposed
    // before its last spark actually fades out.
    const ttl = count / system.emitRate + this.maxLifeTime + 0.15;
    this.systems.push({ system, ttl });
  }

  // Ages every in-flight burst by dt seconds and disposes any whose ttl has
  // elapsed. Babylon's own particle engine handles everything else
  // (per-particle motion, gravity, fade) as part of scene rendering.
  update(dt) {
    for (let i = this.systems.length - 1; i >= 0; i--) {
      const entry = this.systems[i];
      entry.ttl -= dt;
      if (entry.ttl <= 0) {
        entry.system.dispose(false); // keep the shared spark texture alive
        this.systems.splice(i, 1);
      }
    }
  }

  // Removes and disposes every in-flight burst and the shared spark texture.
  dispose() {
    for (const entry of this.systems) {
      entry.system.dispose(false);
    }
    this.systems = [];
    if (this._texture) {
      this._texture.dispose();
      this._texture = null;
    }
  }

  _pickColor() {
    return this.colors[Math.floor(this._random() * this.colors.length)];
  }

  _toColor4(hex, alpha = 1) {
    return BABYLON.Color3.FromHexString(hex).toColor4(alpha);
  }

  // A small soft-glow dot, drawn procedurally so this sample stays
  // self-contained with no external sprite to fetch or license (same
  // reasoning as the synthesized bounce sound in main.js).
  _createTexture(scene) {
    const size = 32;
    const texture = new BABYLON.DynamicTexture("sparkTexture", size, scene, false);
    const ctx = texture.getContext();
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture.update(false);
    texture.hasAlpha = true;
    return texture;
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
