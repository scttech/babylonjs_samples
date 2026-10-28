// Particles: sparks where the marble is bumped, a glitter at a checkpoint, a firework at the goal, a puff when the
// slime wins, and a trail of glow behind a marble that is going fast. Each kind is a Babylon.js ParticleSystem that is
// made once and fired by hand whenever it is needed, so nothing is made while the game runs. What each kind looks like
// is plain data in PARTICLE_PRESETS. See ../tests/particles.tests.js.

// How each kind looks. Sizes are in world units (the marble is 1 across), times in seconds, `power` is the speed
// particles are thrown out at, and `gravity` pulls them up (+) or down (-). `additive` makes overlapping particles
// add their light, which suits sparks; a puff is drawn as it is. A burst makes `count` at once. The one kind that
// isn't a burst, the trail, makes `rate` a second while the marble is at full speed (see trailRate).
const PARTICLE_PRESETS = {
  spark: {
    capacity: 120,
    count: 24,
    colors: ["#ffd23a", "#ef5e07"],
    size: [0.08, 0.22],
    life: [0.25, 0.6],
    power: [3, 8],
    gravity: -14,
    spread: [-1, 0.4, -1, 1, 1.6, 1], // the directions they go in, from (x, y, z) to (x, y, z)
    additive: true,
  },
  glitter: {
    capacity: 100,
    count: 20,
    colors: ["#fff6a8", "#f6bf0e"],
    size: [0.1, 0.28],
    life: [0.6, 1.1],
    power: [0.8, 2.5],
    gravity: 2,
    spread: [-1, 1, -1, 1, 2, 1],
    additive: true,
  },
  firework: {
    capacity: 300,
    count: 90,
    colors: ["#248de3", "#f6bf0e"],
    size: [0.12, 0.34],
    life: [0.8, 1.5],
    power: [4, 10],
    gravity: -6,
    spread: [-1, 0.6, -1, 1, 2, 1],
    additive: true,
  },
  puff: {
    capacity: 100,
    count: 30,
    colors: ["#6fd13a", "#3d8a1f"],
    size: [0.4, 0.9],
    life: [0.5, 1.1],
    power: [1, 3],
    gravity: 1.5,
    spread: [-1, 0.2, -1, 1, 1, 1],
    additive: false,
  },
  trail: {
    capacity: 200,
    rate: 40,
    colors: ["#a2adc0", "#248de3"],
    size: [0.05, 0.11],
    life: [0.3, 0.6],
    power: [0.1, 0.4],
    gravity: 0,
    spread: [-0.3, 0.2, -0.3, 0.3, 0.6, 0.3],
    additive: true,
  },
};

// A trail is made while the marble is going fast, and more of it the faster it goes: none under a quarter of its top
// speed (a marble rolling gently leaves nothing), the full `rate` at the top. `speed` and `topSpeed` are in units a second.
const TRAIL_MIN_SHARE = 0.25;

function trailRate(speed, topSpeed, rate = PARTICLE_PRESETS.trail.rate) {
  const share = Math.min(1, speed / topSpeed);
  if (share < TRAIL_MIN_SHARE) return 0;
  return Math.round(rate * ((share - TRAIL_MIN_SHARE) / (1 - TRAIL_MIN_SHARE)));
}

// A soft round dot, drawn into a texture: white in the middle, fading to nothing at the edge. The particles are
// tinted by their colors, so one picture does for every kind.
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
    this.amount = 1; // how much of everything to make: 1 is the presets, 2 is twice as many
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) this.systems[name] = this._make(name, preset);
  }

  // Makes one kind: a particle system that makes nothing by itself (emitRate 0) and is started once, then told
  // how many to make each time there is a burst (or, for the trail, how many a second).
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
    // A burst is made by hand (manualEmitCount, counted back to 0 once they are made). The trail is the one kind
    // made by the second, and that is what -1 means: go by emitRate.
    system.manualEmitCount = preset.rate ? -1 : 0;
    this.speeds[name] = system.updateSpeed;
    system.start();
    return system;
  }

  // Fires one burst of the named kind at a point in the world, as many as the preset says (times `amount`, but never
  // more than the system can hold).
  burst(name, x, y, z) {
    const system = this.systems[name];
    if (!system) throw new Error(`There is no kind of burst called "${name}"`);
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    const preset = PARTICLE_PRESETS[name];
    system.manualEmitCount = Math.min(preset.capacity, Math.round(preset.count * this.amount));
  }

  // The trail: where the marble is, and how many to make a second (0 is none). Call it every frame.
  trail(x, y, z, rate) {
    const system = this.systems.trail;
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    system.emitRate = Math.round(rate * this.amount);
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
  module.exports = { PARTICLE_PRESETS, TRAIL_MIN_SHARE, trailRate, makeSoftTexture, ParticleBursts };
} else {
  Object.assign(window, { PARTICLE_PRESETS, TRAIL_MIN_SHARE, trailRate, makeSoftTexture, ParticleBursts });
}
