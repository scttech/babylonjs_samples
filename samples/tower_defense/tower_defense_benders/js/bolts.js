// Bolts: what a bender throws. For now it is a glowing ball that flies to the enemy it was thrown at,
// following it as it walks, and is gone when it gets there. (The effect of each nation, and what the
// hit does to the enemy, come in later tutorials: this is only so that you can see that the tower
// shot at the right enemy at the right moment.) See ../tests/bolts.tests.js.

const BOLT = {
  speed: 9, // world units a second
  size: 0.28, // how wide the ball is
  hit: 0.25, // how near to its target it has to be to have hit it
};

// One step towards a place: from `from`, `distance` of the way to `to`, but no further. It says where it
// got to, and whether that is where it was going: { x, y, z, arrived }.
function stepToward(from, to, distance) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length <= distance || length === 0) return { x: to.x, y: to.y, z: to.z, arrived: true };
  const k = distance / length;
  return { x: from.x + dx * k, y: from.y + dy * k, z: from.z + dz * k, arrived: false };
}

class Bolt {
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color.
  constructor(scene, from, enemy, color) {
    this.enemy = enemy;
    this.at = { x: from.x, y: from.y, z: from.z };
    this.arrived = false;

    this.mesh = BABYLON.MeshBuilder.CreateSphere("bolt", { diameter: BOLT.size, segments: 8 }, scene);
    const material = new BABYLON.StandardMaterial("bolt", scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.disableLighting = true;
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.mesh.position.set(from.x, from.y, from.z);
  }

  get done() {
    return this.arrived;
  }

  // Flies for `dt` seconds towards where the enemy is now, and about the middle of it.
  update(dt) {
    const goal = { x: this.enemy.x, y: this.enemy.aimHeight, z: this.enemy.z };
    const step = stepToward(this.at, goal, BOLT.speed * dt);
    this.at = { x: step.x, y: step.y, z: step.z };
    this.arrived = step.arrived || Math.hypot(goal.x - step.x, goal.y - step.y, goal.z - step.z) <= BOLT.hit;
    this.mesh.position.set(step.x, step.y, step.z);
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOLT, stepToward, Bolt };
} else {
  Object.assign(window, { BOLT, stepToward, Bolt });
}
