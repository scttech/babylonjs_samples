// Movers: the parts of a level that move on their own. A platform shuttles to and fro across a gap,
// and a piston pops up out of the floor and drops back. A mover is described in the level's data, and
// where it is at any moment is plain numbers worked out from the time, so it is easy to test. Only
// then are they built in a scene, as physics bodies that move but are never pushed. See ../tests/movers.tests.js.

const PLATFORM_THICKNESS = 0.6; // how thick a moving platform is, like the floor slabs
const PISTON_DEPTH = 2; // how tall a piston's box is: most of it is under the floor, and only its top shows
const PISTON_REST = 0.03; // how far above the floor a piston's top is when it is down. Level with it, the two
// would be in the very same place, and the screen would flicker as the graphics card chose between them

// How far through its movement a mover is, from 0 (the way it starts) to 1 (the other end), at `u`
// through its cycle, where `u` goes from 0 to 1 and then starts again.
//   platform: eases away from one end, and eases into the other, and back again, with no pause
//   piston:   waits, shoots up, stays up, and sinks back, the way a piston does
function moverWave(kind, u) {
  if (kind === "piston") {
    if (u < 0.5) return 0; // waiting
    if (u < 0.55) return (u - 0.5) / 0.05; // up in a snap
    if (u < 0.8) return 1; // held up
    return 1 - (u - 0.8) / 0.2; // and down, more gently
  }
  return (1 - Math.cos(2 * Math.PI * u)) / 2;
}

// How far through its cycle a mover is at `time` seconds, from 0 up to but not including 1. Each
// mover has a `period` (how long a cycle takes) and an optional `phase` (how far through it starts,
// so that two pistons needn't all pop up together).
function moverCycle(mover, time) {
  const u = (time / mover.period + (mover.phase || 0)) % 1;
  return u < 0 ? u + 1 : u;
}

// How big a mover's box is, in world units.
function moverSize(mover) {
  return { x: mover.size.x, y: mover.kind === "piston" ? PISTON_DEPTH : PLATFORM_THICKNESS, z: mover.size.z };
}

// Where the middle of a mover's box is at `time` seconds. The top of a platform is at its `height`
// (in steps of the grid), so it is level with the floor at each end. The top of a piston is a hair above
// its `height` (PISTON_REST) when it is down, and `rise` units higher than that when it is up.
function moverCenter(mover, time) {
  const wave = moverWave(mover.kind, moverCycle(mover, time));
  const top = mover.height * HEIGHT_STEP;
  if (mover.kind === "piston") {
    return { x: mover.at.col * CELL, y: top - PISTON_DEPTH / 2 + PISTON_REST + wave * mover.rise, z: mover.at.row * CELL };
  }
  const col = mover.from.col + (mover.to.col - mover.from.col) * wave;
  const row = mover.from.row + (mover.to.row - mover.from.row) * wave;
  return { x: col * CELL, y: top - PLATFORM_THICKNESS / 2, z: row * CELL };
}

// How fast a mover is going at `time`, along the floor, in units a second: how far it moved in the last
// `dt` seconds, over `dt`. (A piston moves straight up and down, so along the floor it is still.)
function moverVelocity(mover, time, dt = 1 / 60) {
  const before = moverCenter(mover, time - dt);
  const now = moverCenter(mover, time);
  return { x: (now.x - before.x) / dt, z: (now.z - before.z) / dt };
}

// Makes every mover of a level in a scene. Each is a box that is a physics body of the kind that is
// moved by the game and not by anything else (ANIMATED): it pushes the marble, and carries it by
// friction, but nothing pushes it. Returns `update(time)`, which puts them where they are at that
// time (call it every frame), and `dispose()`, which takes them away again.
function buildMovers(scene, grid) {
  const steel = new BABYLON.StandardMaterial("mover-steel", scene);
  steel.diffuseColor = BABYLON.Color3.FromHexString("#4b5367"); // the logo's steel
  steel.specularColor = new BABYLON.Color3(0.25, 0.27, 0.32);
  const stripes = makeStripeTexture(scene);
  stripes.uScale = 2;
  stripes.vScale = 2;
  const hazard = new BABYLON.StandardMaterial("mover-hazard", scene);
  hazard.diffuseTexture = stripes; // a piston is striped all over, as a warning

  const built = grid.movers.map((mover, index) => {
    const size = moverSize(mover);
    const mesh = BABYLON.MeshBuilder.CreateBox(`${mover.kind}-${index}`, { width: size.x, height: size.y, depth: size.z }, scene);
    const at = moverCenter(mover, 0);
    mesh.position.set(at.x, at.y, at.z);
    mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    mesh.material = mover.kind === "piston" ? hazard : steel;
    mesh.receiveShadows = true;
    const aggregate = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.BOX, { mass: 0, ...SURFACES.deck }, scene);
    aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    return { mover, mesh, aggregate };
  });

  return {
    meshes: built.map((entry) => entry.mesh),
    // A marble standing on a platform goes where the platform goes. Call it every frame, after `update`.
    // (Left to the physics, a rolling marble is left behind by a floor that moves under it, and rolls off the
    // back, because it is rolling and not sliding. The marble is told what the platform is doing, and
    // gives in to it, and can still be steered across it.)
    carry(marble, time, dt) {
      // A ray finds a mesh where its world matrix says it is, and that is only brought up to date when a
      // frame is drawn (and a test draws none), so bring the movers' up to date first.
      for (const { mesh } of built) mesh.computeWorldMatrix(true);
      const under = marble.ground;
      const entry = built.find((e) => e.mesh === under);
      if (entry && entry.mover.kind === "platform") marble.carry(moverVelocity(entry.mover, time, dt), dt);
    },
    update(time) {
      for (const { mover, aggregate } of built) {
        const at = moverCenter(mover, time);
        aggregate.body.setTargetTransform(new BABYLON.Vector3(at.x, at.y, at.z), BABYLON.Quaternion.Identity());
      }
    },
    dispose() {
      for (const { mesh, aggregate } of built) {
        aggregate.dispose();
        mesh.dispose();
      }
      stripes.dispose();
      steel.dispose();
      hazard.dispose();
    },
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity, buildMovers };
} else {
  Object.assign(window, { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity, buildMovers });
}
