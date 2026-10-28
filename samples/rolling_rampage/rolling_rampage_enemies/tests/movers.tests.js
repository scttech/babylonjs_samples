// Movers the tests can hold in their hand: a platform and a piston, with round numbers.
const PLATFORM = { kind: "platform", from: { col: 2, row: 3 }, to: { col: 6, row: 3 }, height: 4, size: { x: 4, z: 6 }, period: 10 };
const PISTON = { kind: "piston", at: { col: 5, row: 5 }, height: 4, size: { x: 2, z: 2 }, rise: 1.2, period: 4 };

QUnit.module("moverWave", () => {
  const near = (assert, actual, expected, message) => assert.true(Math.abs(actual - expected) < 1e-9, `${message}: ${actual}`);

  QUnit.test("a platform starts at one end, is at the other half way through, and is back at the end of the cycle", (assert) => {
    near(assert, moverWave("platform", 0), 0, "start");
    near(assert, moverWave("platform", 0.5), 1, "half way");
    near(assert, moverWave("platform", 1), 0, "back");
    near(assert, moverWave("platform", 0.25), 0.5, "a quarter of the way through is half way across");
  });

  QUnit.test("a platform goes there and back the same way", (assert) => {
    for (const u of [0.1, 0.2, 0.3, 0.4]) near(assert, moverWave("platform", u), moverWave("platform", 1 - u), `${u}`);
  });

  QUnit.test("a platform eases: slowest at the ends", (assert) => {
    const nearEnd = moverWave("platform", 0.02) - moverWave("platform", 0);
    const middle = moverWave("platform", 0.27) - moverWave("platform", 0.25);

    assert.true(nearEnd < middle / 5, "hardly moving at the end, and moving in the middle");
  });

  QUnit.test("a piston waits down for half its cycle", (assert) => {
    for (const u of [0, 0.2, 0.49]) near(assert, moverWave("piston", u), 0, `${u}`);
  });

  QUnit.test("a piston shoots up in a snap, stays up, and sinks back more slowly", (assert) => {
    near(assert, moverWave("piston", 0.525), 0.5, "half way up after 0.025 of the cycle");
    near(assert, moverWave("piston", 0.55), 1, "all the way up");
    near(assert, moverWave("piston", 0.7), 1, "and held");
    near(assert, moverWave("piston", 0.9), 0.5, "half way down at 0.9");
    near(assert, moverWave("piston", 1 - 1e-12), 0, "and down again by the end");
  });

  QUnit.test("every wave stays between 0 and 1", (assert) => {
    for (const kind of ["platform", "piston"]) {
      for (let u = 0; u < 1; u += 0.01) assert.true(moverWave(kind, u) >= -1e-9 && moverWave(kind, u) <= 1 + 1e-9, `${kind} ${u}`);
    }
  });
});

QUnit.module("moverVelocity", () => {
  QUnit.test("a platform is still at the start of its way, and is going toward the other end after", (assert) => {
    const start = moverVelocity(PLATFORM, 0.001);
    const later = moverVelocity(PLATFORM, 2.5);

    assert.true(Math.abs(start.x) < 0.05, `${start.x}`);
    assert.true(later.x > 1, `${later.x}`);
    assert.true(Math.abs(later.z) < 1e-9, "and straight along it");
  });

  QUnit.test("it is the slope of the position: how far it moved, over how long", (assert) => {
    const dt = 1 / 60;
    const v = moverVelocity(PLATFORM, 3, dt);

    assert.true(Math.abs(v.x * dt - (moverCenter(PLATFORM, 3).x - moverCenter(PLATFORM, 3 - dt).x)) < 1e-9);
  });

  QUnit.test("a platform comes back the other way in the second half of its cycle", (assert) => {
    assert.true(moverVelocity(PLATFORM, 2.5).x > 0);
    assert.true(moverVelocity(PLATFORM, 7.5).x < 0);
  });

  QUnit.test("a piston goes up and down, and not along the floor", (assert) => {
    for (const time of [1.9, 2.1, 3.3]) assert.deepEqual(moverVelocity(PISTON, time), { x: 0, z: 0 });
  });
});

QUnit.module("moverCycle", () => {
  QUnit.test("is how far through a cycle a mover is, from 0 up to 1", (assert) => {
    assert.strictEqual(moverCycle(PLATFORM, 0), 0);
    assert.strictEqual(moverCycle(PLATFORM, 2.5), 0.25);
    assert.strictEqual(moverCycle(PLATFORM, 10), 0, "a whole cycle is back at the start");
    assert.true(Math.abs(moverCycle(PLATFORM, 12.5) - 0.25) < 1e-9, "and it goes round again");
  });

  QUnit.test("a phase makes it start part of the way through", (assert) => {
    assert.strictEqual(moverCycle({ ...PISTON, phase: 0.25 }, 0), 0.25);
    assert.true(Math.abs(moverCycle({ ...PISTON, phase: 0.75 }, 2) - 0.25) < 1e-9, "wrapping round");
  });

  QUnit.test("it is always in range, even for a time before the start", (assert) => {
    const u = moverCycle(PLATFORM, -2.5);

    assert.true(u >= 0 && u < 1);
    assert.true(Math.abs(u - 0.75) < 1e-9);
  });
});

QUnit.module("moverCenter and moverSize", () => {
  QUnit.test("a platform is at its first end at the start, and its second end half a cycle later, and in line", (assert) => {
    const start = moverCenter(PLATFORM, 0);
    const far = moverCenter(PLATFORM, 5);

    assert.strictEqual(start.x, 2 * CELL);
    assert.true(Math.abs(far.x - 6 * CELL) < 1e-9);
    assert.strictEqual(start.z, 3 * CELL);
    assert.true(Math.abs(far.z - 3 * CELL) < 1e-9);
  });

  QUnit.test("the top of a platform is at its height, whatever its thickness, and it doesn't rise or fall", (assert) => {
    for (const time of [0, 1.3, 5, 8.8]) {
      const centre = moverCenter(PLATFORM, time);

      assert.true(Math.abs(centre.y + moverSize(PLATFORM).y / 2 - 4 * HEIGHT_STEP) < 1e-9, `${time}`);
    }
  });

  QUnit.test("a piston stays where it is, and its top is just above the floor until it rises, and then a rise higher", (assert) => {
    const down = moverCenter(PISTON, 0);
    const up = moverCenter(PISTON, 2.4); // 0.6 of the cycle

    assert.strictEqual(down.x, 5 * CELL);
    assert.strictEqual(up.x, 5 * CELL);
    assert.strictEqual(down.z, 5 * CELL);
    assert.true(Math.abs(down.y + PISTON_DEPTH / 2 - (4 * HEIGHT_STEP + PISTON_REST)) < 1e-9, "down: its top is a hair above the floor");
    assert.true(PISTON_REST > 0 && PISTON_REST < 0.1, "and only a hair, so a marble rolls over it");
    assert.true(Math.abs(up.y + PISTON_DEPTH / 2 - (4 * HEIGHT_STEP + PISTON_REST + 1.2)) < 1e-9, "up: its top is a rise higher");
  });

  QUnit.test("sizes: a platform is thin, a piston is deep, and both are as wide as they say", (assert) => {
    assert.deepEqual(moverSize(PLATFORM), { x: 4, y: PLATFORM_THICKNESS, z: 6 });
    assert.deepEqual(moverSize(PISTON), { x: 2, y: PISTON_DEPTH, z: 2 });
  });
});

QUnit.module("the movers of every level", () => {
  const grids = LEVELS.map((level) => parseLevel(level));

  QUnit.test("each is a platform or a piston, with a size and a period", (assert) => {
    for (const grid of grids) {
      for (const mover of grid.movers) {
        assert.true(["platform", "piston"].includes(mover.kind), `${grid.name}: ${mover.kind}`);
        assert.true(mover.size.x > 0 && mover.size.z > 0, `${grid.name}: has a size`);
        assert.true(mover.period > 0, `${grid.name}: has a period`);
        if (mover.phase !== undefined) assert.true(mover.phase >= 0 && mover.phase < 1, `${grid.name}: phase`);
      }
    }
  });

  QUnit.test("a platform meets the floor at each end, so a marble can roll on and off", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
        const top = mover.height * HEIGHT_STEP;
        const dx = (mover.to.col - mover.from.col) * CELL;
        const dz = (mover.to.row - mover.from.row) * CELL;
        const length = Math.hypot(dx, dz);
        const along = { x: dx / length, z: dz / length };
        const half = (Math.abs(along.x) * mover.size.x + Math.abs(along.z) * mover.size.z) / 2; // how far it reaches along its way
        for (const [end, sign] of [[mover.from, -1], [mover.to, 1]]) {
          const x = end.col * CELL + sign * along.x * (half + 0.3); // a little past the platform, on the far side from the other end
          const z = end.row * CELL + sign * along.z * (half + 0.3);
          const floor = heightAt(grid, x, z);
          if (floor === null || Math.abs(floor - top) > 1e-9) problems.push(`${grid.name}: floor past the end at ${x}, ${z} is ${floor}, not ${top}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a platform's way is clear: there is no floor for it to cross, only a gap", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
        const middle = { x: ((mover.from.col + mover.to.col) / 2) * CELL, z: ((mover.from.row + mover.to.row) / 2) * CELL };
        if (heightAt(grid, middle.x, middle.z) !== null) problems.push(`${grid.name}: floor in the middle of the platform's way`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a piston stands on flat floor, all across its box", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "piston")) {
        const top = mover.height * HEIGHT_STEP;
        const x = mover.at.col * CELL;
        const z = mover.at.row * CELL;
        for (const [dx, dz] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const floor = heightAt(grid, x + (dx * mover.size.x) / 2, z + (dz * mover.size.z) / 2);
          if (floor === null || Math.abs(floor - top) > 1e-9) problems.push(`${grid.name}: floor under a piston at ${dx}, ${dz} is ${floor}, not ${top}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no mover is on a zone or on the start", (assert) => {
    for (const grid of grids) {
      const start = levelStart(grid);
      for (const mover of grid.movers) {
        const centre = moverCenter(mover, 0);
        const reach = Math.max(mover.size.x, mover.size.z) / 2 + 1;
        assert.true(Math.hypot(centre.x - start.x, centre.z - start.z) > reach, `${grid.name}: ${mover.kind} is clear of the start`);
        for (const zone of levelZones(grid)) {
          const at = zonePosition(grid, zone);
          assert.true(Math.hypot(centre.x - at.x, centre.z - at.z) > reach + zoneRadius(zone), `${grid.name}: ${mover.kind} is clear of ${zone.kind} ${zone.index}`);
        }
      }
    }
  });
});

// Building movers needs a scene and physics. These use a NullEngine, which draws nothing, and put
// the movers where they are by hand, step by step, as the game does every frame.
QUnit.module("buildMovers", (hooks) => {
  let engine;
  let scene;
  let level;
  let movers;
  let time;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    level = buildLevel(scene, LEVELS[2]);
    movers = buildMovers(scene, level.grid);
    time = 0;
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Lets `seconds` go by, putting the movers where they are, and carrying a marble if it is on one,
  // every sixtieth of a second, as the game does every frame.
  const run = (seconds, marble = null) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      time += 1 / 60;
      movers.update(time);
      if (marble) movers.carry(marble, time, 1 / 60);
      stepPhysics(scene, 1 / 60);
    }
  };

  QUnit.test("makes a mesh for every mover, named for its kind and place in the list, where it starts", (assert) => {
    assert.deepEqual(movers.meshes.map((m) => m.name), ["platform-0", "piston-1"]);
    level.grid.movers.forEach((mover, i) => {
      const at = moverCenter(mover, 0);
      assert.true(Math.abs(movers.meshes[i].position.x - at.x) < 1e-9, `${mover.kind} x`);
      assert.true(Math.abs(movers.meshes[i].position.y - at.y) < 1e-9, `${mover.kind} y`);
    });
  });

  QUnit.test("each has a physics body that the game moves and nothing pushes", (assert) => {
    for (const mesh of movers.meshes) {
      assert.true(Boolean(mesh.physicsBody), `${mesh.name} has a body`);
      assert.strictEqual(mesh.physicsBody.getMotionType(), BABYLON.PhysicsMotionType.ANIMATED);
    }
  });

  QUnit.test("update puts them where they are at that time", (assert) => {
    const platform = level.grid.movers[0];
    const halfWay = platform.period / 2;

    for (let t = 1 / 60; t <= halfWay + 1e-9; t += 1 / 60) {
      movers.update(t);
      stepPhysics(scene, 1 / 60);
    }

    const at = moverCenter(platform, halfWay);
    assert.true(Math.abs(movers.meshes[0].position.x - at.x) < 0.1, `${movers.meshes[0].position.x} for ${at.x}`);
  });

  QUnit.test("a marble on a platform is carried along with it, not left behind", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    run(4, marble);

    const platformNow = moverCenter(platform, time);
    assert.true(platformNow.x > at.x + 3, "the platform has gone a good way");
    assert.true(Math.abs(marble.position.x - platformNow.x) < 0.6, `the marble went from ${at.x} to ${marble.position.x}, with the platform at ${platformNow.x}`);
    assert.true(marble.grounded, "and is still on it");
  });

  QUnit.test("without being carried, the same marble is left behind: that is why it is carried", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    run(4);

    assert.true(marble.position.x < moverCenter(platform, time).x - 1.5, `it is at ${marble.position.x}`);
  });

  QUnit.test("a marble crossing a platform can still be steered across it", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x - 1, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    for (let i = 0; i < 90; i++) {
      time += 1 / 60;
      movers.update(time);
      movers.carry(marble, time, 1 / 60);
      marble.push({ x: 1, y: 0, z: 0 }); // pushing along the way the platform goes
      stepPhysics(scene, 1 / 60);
    }

    assert.true(marble.position.x > at.x + 1, `it went from ${at.x - 1} to ${marble.position.x}`);
  });

  QUnit.test("a piston coming up throws a marble standing on it into the air", (assert) => {
    const piston = level.grid.movers[1];
    const at = moverCenter(piston, 0);
    const floor = piston.height * HEIGHT_STEP;
    const marble = new Marble(scene, { start: { x: at.x, y: floor + MARBLE_RADIUS + 0.05, z: at.z } });

    let highest = marble.position.y;
    for (let i = 0; i < Math.round(3 * 60); i++) {
      time += 1 / 60;
      movers.update(time);
      stepPhysics(scene, 1 / 60);
      highest = Math.max(highest, marble.position.y);
    }

    assert.true(highest > floor + MARBLE_RADIUS + piston.rise * 0.8, `it reached ${highest}`);
  });

  QUnit.test("and a marble that isn't on the piston isn't disturbed by it", (assert) => {
    const piston = level.grid.movers[1];
    const at = moverCenter(piston, 0);
    const floor = piston.height * HEIGHT_STEP;
    const marble = new Marble(scene, { start: { x: at.x - 4, y: floor + MARBLE_RADIUS + 0.05, z: at.z } });

    run(3);

    assert.true(Math.abs(marble.position.y - (floor + MARBLE_RADIUS)) < 0.05, `${marble.position.y}`);
  });

  QUnit.test("disposing takes them away", (assert) => {
    movers.dispose();

    assert.strictEqual(scene.getMeshByName("platform-0"), null);
    assert.strictEqual(scene.getMeshByName("piston-1"), null);
  });
});
