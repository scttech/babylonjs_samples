// Bursts of particles: sparkles where a coin was picked up, and dust where the runner
// crashed. Each kind is a Babylon.js ParticleSystem that is made once and fired by hand
// whenever it is needed, so nothing is made while the game runs. What each kind looks like
// is plain data in PARTICLE_PRESETS. See ../tests/particles.tests.js.

// How each kind looks. Sizes are in world units (the runner is 1.83 high), times in
// seconds, `power` is the speed particles are thrown out at, and `gravity` pulls them
// up (+) or down (-). `additive` makes overlapping particles add their light, which
// suits sparkles; dust is drawn as it is.
const PARTICLE_PRESETS = {
  sparkle: {
    capacity: 150,
    count: 8, // how many in one burst
    colors: ["#fff6a8", "#ffd23a"],
    size: [0.05, 0.13],
    life: [0.25, 0.45],
    power: [1.5, 3.5],
    gravity: -7,
    spread: [-1, 1, -1, 1, 2, 1], // the directions they go in, from (x, y, z) to (x, y, z)
    additive: true,
  },
  dust: {
    capacity: 150,
    count: 32,
    colors: ["#b8a58a", "#8a7a68"],
    size: [0.5, 1.2],
    life: [0.5, 1.1],
    power: [1, 3],
    gravity: 1.5,
    spread: [-1, 0.2, -1, 1, 1, 1],
    additive: false,
  },
};

// A soft round dot, drawn into a texture: white in the middle, fading to nothing at the
// edge. The particles are tinted by their colors, so one picture does for both kinds.
function makeSoftTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("particle", size, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const middle = size / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

class ParticleBursts {
  constructor(scene) {
    this.scene = scene;
    this.texture = makeSoftTexture(scene);
    this.systems = {};
    this.speeds = {}; // the normal updateSpeed of each, to go back to after a pause
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) this.systems[name] = this._make(name, preset);
  }

  // Makes one kind: a particle system that makes nothing by itself (emitRate 0) and is
  // started once, then told how many to make each time there is a burst.
  _make(name, preset) {
    const system = new BABYLON.ParticleSystem(name, preset.capacity, this.scene);
    system.particleTexture = this.texture;
    system.emitter = new BABYLON.Vector3(0, 0, 0);
    system.color1 = BABYLON.Color4.FromHexString(`${preset.colors[0]}FF`);
    system.color2 = BABYLON.Color4.FromHexString(`${preset.colors[1]}FF`);
    system.colorDead = BABYLON.Color4.FromHexString(`${preset.colors[1]}00`); // fades out as it dies
    [system.minSize, system.maxSize] = preset.size;
    [system.minLifeTime, system.maxLifeTime] = preset.life;
    [system.minEmitPower, system.maxEmitPower] = preset.power;
    system.gravity = new BABYLON.Vector3(0, preset.gravity, 0);
    const [x1, y1, z1, x2, y2, z2] = preset.spread;
    system.direction1 = new BABYLON.Vector3(x1, y1, z1);
    system.direction2 = new BABYLON.Vector3(x2, y2, z2);
    system.blendMode = preset.additive ? BABYLON.ParticleSystem.BLENDMODE_ONEONE : BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    system.emitRate = 0;
    system.manualEmitCount = 0;
    this.speeds[name] = system.updateSpeed;
    system.start();
    return system;
  }

  // Fires one burst of the named kind at a point in the world.
  burst(name, x, y, z) {
    const system = this.systems[name];
    if (!system) throw new Error(`There is no kind of burst called "${name}"`);
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    system.manualEmitCount = PARTICLE_PRESETS[name].count;
  }

  // Holds every particle where it is (a pause), or lets them go on.
  setFrozen(frozen) {
    for (const [name, system] of Object.entries(this.systems)) system.updateSpeed = frozen ? 0 : this.speeds[name];
  }

  dispose() {
    for (const system of Object.values(this.systems)) system.dispose();
    this.texture.dispose();
    this.systems = {};
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PARTICLE_PRESETS, makeSoftTexture, ParticleBursts };
} else {
  Object.assign(window, { PARTICLE_PRESETS, makeSoftTexture, ParticleBursts });
}
