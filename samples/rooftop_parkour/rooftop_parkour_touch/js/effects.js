// Effects: a puff of dust where the runner lands hard or kicks off a wall. How much dust is plain arithmetic of how hard the landing was (`dustFor`), in a table,
// and `Dust` is the particle system that draws it: one system for the whole game, that a burst is added to wherever it is needed. See ../tests/effects.tests.js.

const DUST = {
  minImpact: 5, // m/s of fall (about 1.3 metres) below which there is no dust
  hardImpact: 20, // and the fall at which there is the most
  count: [5, 28], // puffs, at the least and at the most
  size: [0.5, 1.1], // metres across (at the least and the most), as a puff swells
  rise: 0.7, // m/s that the puffs drift up
  spread: 2.4, // m/s that they go out sideways at the most
  life: [0.4, 0.9], // seconds a puff lasts
  kick: { count: 7, size: 0.7 }, // a kick off a wall is a small burst, always
  color: [0.78, 0.74, 0.66],
  maxParticles: 160,
};

// The dust for a landing at `impact` m/s: { count, size, spread } or null for none. It grows from the least to the most as the impact goes from `minImpact` to `hardImpact`.
function dustFor(impact, table = DUST) {
  if (!(impact >= table.minImpact)) return null;
  const t = Math.min(1, (impact - table.minImpact) / (table.hardImpact - table.minImpact));
  const mix = ([low, high]) => low + (high - low) * t;
  return { count: Math.round(mix(table.count)), size: mix(table.size), spread: table.spread * (0.4 + 0.6 * t) };
}

// A soft round puff, as a texture: white in the middle and clear at the edge, drawn once.
function puffTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("puff", { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  texture.hasAlpha = true;
  return texture;
}

class Dust {
  constructor(scene, table = DUST) {
    this.table = table;
    const system = new BABYLON.ParticleSystem("dust", table.maxParticles, scene);
    system.particleTexture = puffTexture(scene);
    system.emitter = new BABYLON.Vector3(0, -100, 0);
    system.emitRate = 0; // nothing flows by itself: a burst is asked for
    system.manualEmitCount = 0;
    system.minLifeTime = table.life[0];
    system.maxLifeTime = table.life[1];
    system.minSize = table.size[0];
    system.maxSize = table.size[1];
    system.color1 = new BABYLON.Color4(...table.color, 0.55);
    system.color2 = new BABYLON.Color4(...table.color, 0.4);
    system.colorDead = new BABYLON.Color4(...table.color, 0);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    system.gravity = new BABYLON.Vector3(0, 0.1, 0);
    system.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
    system.maxEmitBox = new BABYLON.Vector3(0.2, 0.05, 0.2);
    system.direction1 = new BABYLON.Vector3(-1, table.rise, -1);
    system.direction2 = new BABYLON.Vector3(1, table.rise, 1);
    system.minEmitPower = 0.4;
    system.maxEmitPower = 1;
    system.updateSpeed = 1 / 60;
    system.start();
    this.system = system;
    this.bursts = 0;
  }

  // A burst at a point (the runner's feet): `shape` is what dustFor gave ({ count, size, spread }). It says how many puffs it made.
  burst(x, y, z, shape) {
    if (!shape || shape.count <= 0) return 0;
    const system = this.system;
    system.emitter.set(x, y, z);
    system.maxSize = shape.size;
    system.minEmitPower = shape.spread * 0.3;
    system.maxEmitPower = shape.spread;
    system.manualEmitCount = Math.max(0, system.manualEmitCount) + shape.count;
    this.bursts++;
    return shape.count;
  }

  dispose() {
    this.system.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DUST, dustFor, puffTexture, Dust };
} else {
  Object.assign(window, { DUST, dustFor, puffTexture, Dust });
}
