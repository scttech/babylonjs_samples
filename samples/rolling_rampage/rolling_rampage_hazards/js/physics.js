// The physics world: loading Havok, and the numbers that decide how things feel.
// Havok is a physics engine written in WebAssembly. It moves every body in the world
// (the marble, the floors) under gravity, and works out the collisions between them. We
// only say what is in the world, and how bouncy and how grippy each thing is. See
// ../tests/physics.tests.js.

// Gravity, in units a second a second. Earth's is 9.8, but a world this small feels like a
// slow-motion film at that, so a marble in this game falls faster.
const GRAVITY = -24;

// How each kind of surface behaves. `friction` is how much it grips what rolls on it
// (0 is ice) and `restitution` how much it bounces what lands on it (0 is clay, 1 is rubber).
const SURFACES = {
  steel: { friction: 0.45, restitution: 0.25 }, // the marble
  deck: { friction: 0.6, restitution: 0.1 }, // the floors
};

// Havok is loaded from a script (see index.html), and the loading is slow, so it is done
// once and the same instance is shared by every world in the page.
let havokLoading = null;
function loadHavok() {
  if (!havokLoading) havokLoading = HavokPhysics();
  return havokLoading;
}

// Turns physics on in a scene, with gravity pulling down. Returns the physics plugin.
async function loadPhysics(scene) {
  const havok = await loadHavok();
  const plugin = new BABYLON.HavokPlugin(true, havok);
  scene.enablePhysics(new BABYLON.Vector3(0, GRAVITY, 0), plugin);
  return plugin;
}

// Moves the physics on by `seconds`, in steps of a sixtieth of a second, by hand. The game
// never needs it, because the physics moves with every frame that is drawn. But a test has no
// frames, and this lets it say "now let a second go by" and look at where everything ended up,
// and the answer is the same every time.
function stepPhysics(scene, seconds, step = 1 / 60) {
  const engine = scene.getPhysicsEngine();
  for (let t = 0; t < seconds - 1e-9; t += step) engine._step(step);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GRAVITY, SURFACES, loadHavok, loadPhysics, stepPhysics };
} else {
  Object.assign(window, { GRAVITY, SURFACES, loadHavok, loadPhysics, stepPhysics });
}
