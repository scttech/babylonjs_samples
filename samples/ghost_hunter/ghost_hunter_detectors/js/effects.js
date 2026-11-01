// Effects made in code: no pictures to load. A soft round puff is drawn on a canvas once, and every bit of mist and every wisp of a
// ghost's trail is that puff, made large or small, light or faint, by a particle system. The numbers are in a table, so that they can be
// tuned in the developer panel and read by the tests. See ../tests/effects.tests.js.

const EFFECTS = {
  mist: {
    rate: 9, // puffs a second
    life: [3.5, 6], // seconds a puff lasts: the shortest and the longest
    size: [0.8, 1.6], // metres across
    alpha: 0.11, // how thick a puff is at its thickest (mist is mostly nothing)
    radius: 0.9, // how far from the place it spreads
    height: 0.2, // how deep a layer it is
    rise: 0.04, // metres a second it creeps upwards
    color: [0.55, 0.8, 0.9],
  },
  trail: {
    rate: 26,
    life: [0.7, 1.5],
    size: [0.1, 0.26],
    alpha: 0.55,
    color: [0.3, 0.9, 1],
  },
};

// A soft round puff, white in the middle and clear at the edge, as a texture drawn on a canvas.
function softTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("soft-puff", { width: size, height: size }, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const middle = size / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

const color4 = (rgb, alpha) => new BABYLON.Color4(rgb[0], rgb[1], rgb[2], alpha);

// A low layer of mist on the floor at a point, creeping up and spreading, thickest in the middle of its life.
function createMist(scene, point, texture, table = EFFECTS.mist) {
  const system = new BABYLON.ParticleSystem("mist", 120, scene);
  system.particleTexture = texture;
  system.emitter = new BABYLON.Vector3(point[0], point[1], point[2]);
  system.minEmitBox = new BABYLON.Vector3(-table.radius, 0, -table.radius);
  system.maxEmitBox = new BABYLON.Vector3(table.radius, table.height, table.radius);
  system.direction1 = new BABYLON.Vector3(-0.05, table.rise, -0.05);
  system.direction2 = new BABYLON.Vector3(0.05, table.rise * 1.5, 0.05);
  system.minLifeTime = table.life[0];
  system.maxLifeTime = table.life[1];
  system.minSize = table.size[0];
  system.maxSize = table.size[1];
  system.emitRate = table.rate;
  system.color1 = color4(table.color, table.alpha);
  system.color2 = color4(table.color, table.alpha * 0.6);
  system.colorDead = color4(table.color, 0);
  system.minAngularSpeed = -0.2;
  system.maxAngularSpeed = 0.2;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  system.start();
  return system;
}

// A trail of cold wisps behind a mesh (the body of a ghost). The puffs are left where they are made, so a ghost that moves draws a trail.
function createTrail(scene, mesh, texture, table = EFFECTS.trail) {
  const system = new BABYLON.ParticleSystem("trail", 200, scene);
  system.particleTexture = texture;
  system.emitter = mesh;
  system.minEmitBox = new BABYLON.Vector3(-0.22, 0.1, -0.22);
  system.maxEmitBox = new BABYLON.Vector3(0.22, 1.1, 0.22);
  system.direction1 = new BABYLON.Vector3(-0.05, -0.1, -0.05);
  system.direction2 = new BABYLON.Vector3(0.05, 0.05, 0.05);
  system.minLifeTime = table.life[0];
  system.maxLifeTime = table.life[1];
  system.minSize = table.size[0];
  system.maxSize = table.size[1];
  system.emitRate = table.rate;
  system.color1 = color4(table.color, table.alpha);
  system.color2 = color4(table.color, table.alpha * 0.5);
  system.colorDead = color4(table.color, 0);
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  system.start();
  return system;
}

// Lets an effect go: it stops making puffs, and is taken away when the last of them has faded.
function releaseEffect(system) {
  system.stop();
  system.disposeOnStop = true;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EFFECTS, softTexture, createMist, createTrail, releaseEffect };
} else {
  Object.assign(window, { EFFECTS, softTexture, createMist, createTrail, releaseEffect });
}
