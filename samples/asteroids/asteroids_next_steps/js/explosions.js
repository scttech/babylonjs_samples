// Particle bursts for things that blow up: rocks, the UFO, the ship, and the
// flash when the ship jumps through hyperspace. Each burst is a one-shot
// BABYLON.ParticleSystem; Babylon's own particle engine moves and fades every
// particle, so this class only has to start a burst in the right place and
// throw it away once it has finished.
//
// The same idea as SparkSystem in the Breakout series, minus gravity (this is
// space) and aimed in every direction instead of in a fan. `BABYLON` is only
// touched when `scene` is supplied, so tests stub it out. See
// ../tests/explosions.tests.js.
class Explosions {
  constructor({
    scene = null,
    colors = ["#ffffff", "#ffb347"], // the two colors a burst's particles are tinted between
    maxParticles = 120, // the most a single burst may use
    minLifeTime = 0.4, // seconds
    maxLifeTime = 0.9,
  } = {}) {
    this.scene = scene;
    this.colors = colors;
    this.maxParticles = maxParticles;
    this.minLifeTime = minLifeTime;
    this.maxLifeTime = maxLifeTime;
    this.systems = [];
    this._texture = scene ? this._createTexture(scene) : null;
  }

  // Starts a burst at (x, y). `scale` sizes it: 1 is a medium rock, 0.5 a tiny
  // flash, 2 the ship. Bigger bursts have more particles that fly a little
  // faster. `colors` can override the pair of tint colors for this burst only.
  // Does nothing unless a scene was supplied.
  spawn(x, y, scale = 1, colors = this.colors) {
    if (!this.scene) return;

    const count = Math.min(Math.round(16 * scale), this.maxParticles);
    const power = Math.sqrt(scale);

    const system = new BABYLON.ParticleSystem("explosion", this.maxParticles, this.scene);
    system.particleTexture = this._texture;
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    system.emitter = new BABYLON.Vector3(x, y, 0);
    system.minEmitBox = BABYLON.Vector3.Zero();
    system.maxEmitBox = BABYLON.Vector3.Zero();
    // Two opposite corners of a box of directions: Babylon picks a random
    // direction between them for each particle, so the burst goes everywhere.
    system.direction1 = new BABYLON.Vector3(-1, -1, 0);
    system.direction2 = new BABYLON.Vector3(1, 1, 0);
    system.minEmitPower = 2 * power;
    system.maxEmitPower = 6 * power;
    system.minLifeTime = this.minLifeTime;
    system.maxLifeTime = this.maxLifeTime;
    system.minSize = 0.06;
    system.maxSize = 0.18;
    system.color1 = this._toColor4(colors[0]);
    system.color2 = this._toColor4(colors[1]);
    system.colorDead = this._toColor4(colors[1], 0); // fades to transparent
    system.emitRate = count * 20; // high enough that manualEmitCount empties in ~1 frame
    system.manualEmitCount = count;

    system.start();
    // ttl covers the ramp-up (emitting `count` particles at emitRate) plus the
    // longest a single particle can live, so the burst is never disposed
    // before its last particle has faded out.
    const ttl = count / system.emitRate + this.maxLifeTime + 0.15;
    this.systems.push({ system, ttl });
  }

  // Ages every burst by dt seconds and disposes any that have finished. Babylon
  // does everything else as part of rendering.
  update(dt) {
    for (let i = this.systems.length - 1; i >= 0; i--) {
      const entry = this.systems[i];
      entry.ttl -= dt;
      if (entry.ttl <= 0) {
        entry.system.dispose(false); // keep the shared texture alive
        this.systems.splice(i, 1);
      }
    }
  }

    // Removes every burst and the shared texture.
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

    _toColor4(hex, alpha = 1) {
    return BABYLON.Color3.FromHexString(hex).toColor4(alpha);
  }

  // A small soft-glow dot, drawn procedurally so this sample stays
  // self-contained with no sprite file to fetch or license (the same
  // reasoning as the synthesized sounds).
  _createTexture(scene) {
    const size = 32;
    const texture = new BABYLON.DynamicTexture("explosionTexture", size, scene, false);
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
  module.exports = Explosions;
} else {
  window.Explosions = Explosions;
}
