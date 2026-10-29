QUnit.module("Controller on the ground", () => {
  const north = { x: 0, z: 1 };
  const flat = () => new World({ ground: () => 0 });

  QUnit.test("starts standing on the ground, still", (assert) => {
    const body = new Controller({ world: flat() });
    assert.true(body.grounded);
    assert.deepEqual([body.y, body.speed, body.vy], [0, 0, 0]);
  });

  QUnit.test("starts on the highest thing at its place, unless it is told a height", (assert) => {
    const roof = { minX: -5, maxX: 5, minY: 0, maxY: 20, minZ: -5, maxZ: 5 };
    assert.strictEqual(new Controller({ world: new World({ boxes: [roof] }) }).y, 20);
    assert.strictEqual(new Controller({ world: new World({ boxes: [roof] }), y: 3 }).y, 3);
  });

  QUnit.test("gets up to speed gradually, and not past it, and sprints faster", (assert) => {
    const body = new Controller({ world: flat() });
    body.update(north, false, 0.05);
    assert.true(body.speed > 0 && body.speed < body.options.jogSpeed);
    for (let i = 0; i < 100; i++) body.update(north, false, 0.05);
    assert.strictEqual(body.speed, body.options.jogSpeed);
    for (let i = 0; i < 100; i++) body.update(north, true, 0.05);
    assert.strictEqual(body.speed, body.options.sprintSpeed);
  });

  QUnit.test("stops when the keys are let go", (assert) => {
    const body = new Controller({ world: flat() });
    for (let i = 0; i < 100; i++) body.update(north, false, 0.05);
    for (let i = 0; i < 100; i++) body.update(null, false, 0.05);
    assert.strictEqual(body.speed, 0);
  });

  QUnit.test("turns to face the way it goes, and goes the way it faces", (assert) => {
    const body = new Controller({ world: flat() });
    for (let i = 0; i < 200; i++) body.update({ x: 1, z: 0 }, false, 0.02);
    assert.true(Math.abs(body.heading - Math.PI / 2) < 1e-9);
    assert.true(body.x > 5);
  });

  QUnit.test("can't walk into a wall", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 10, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    for (let i = 0; i < 300; i++) body.update(north, true, 0.02);
    assert.true(body.z <= wall.minZ - body.options.radius + 1e-9);
    assert.true(body.z > 2);
  });

  QUnit.test("can't leave the world", (assert) => {
    const body = new Controller({ world: flat(), bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } });
    for (let i = 0; i < 300; i++) body.update(north, true, 0.02);
    assert.strictEqual(body.z, 10);
  });

  QUnit.test("its numbers can be changed without changing the defaults", (assert) => {
    const before = BODY.gravity;
    const a = new Controller({ world: flat() });
    const b = new Controller({ world: flat() });
    a.options.gravity = 99;
    assert.strictEqual(b.options.gravity, before);
    assert.strictEqual(BODY.gravity, before);
  });
});

QUnit.module("Controller steps", () => {
  const north = { x: 0, z: 1 };
  const walk = (body, frames, direction = north) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, 1 / 60);
  };

  QUnit.test("it walks up a low step, and stands on it", (assert) => {
    const step = { minX: -5, maxX: 5, minY: 0, maxY: 0.3, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [step] }) });
    walk(body, 75); // far enough to be on it, and not so far as to be off the other side
    assert.true(body.grounded);
    assert.true(Math.abs(body.y - 0.3) < 1e-3);
    assert.true(body.z > 3);
  });

  QUnit.test("a step higher than the step height is a wall", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 0.6, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    walk(body, 240);
    assert.true(body.y < 0.01);
    assert.true(body.z <= 3 - body.options.radius + 1e-6);
  });

  QUnit.test("the step height can be changed", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 0.6, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }), options: { stepHeight: 0.8 } });
    walk(body, 75);
    assert.true(Math.abs(body.y - 0.6) < 1e-3);
  });

  QUnit.test("it walks down a small drop without falling", (assert) => {
    const world = new World({ ground: (x, z) => (z > 3 ? -0.2 : 0) });
    const body = new Controller({ world });
    let fell = false;
    for (let i = 0; i < 240; i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.false(fell);
    assert.true(Math.abs(body.y + 0.2) < 1e-3);
  });

  QUnit.test("its feet follow a step quickly, but not at once", (assert) => {
    const body = new Controller({ world: new World({ ground: () => 1 }), y: 0.8 });
    body.update(null, false, 0.01);
    assert.true(body.y > 0.8 && body.y < 1);
  });
});

QUnit.module("Controller falls", () => {
  const roof = { minX: -5, maxX: 5, minY: 0, maxY: 20, minZ: -5, maxZ: 5 };
  const north = { x: 0, z: 1 };

  QUnit.test("a runner in the air falls, faster and faster, and lands on the ground", (assert) => {
    const body = new Controller({ world: new World({ ground: () => 0 }) });
    body.placeAt(0, 10, 0);
    const speeds = [];
    for (let i = 0; i < 300 && !body.grounded; i++) {
      body.update(null, false, 1 / 60);
      speeds.push(body.vy);
    }
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
    assert.strictEqual(body.vy, 0);
    assert.true(speeds[10] < speeds[1]);
  });

  QUnit.test("it takes as long to fall as gravity says: about the square root of twice the height over gravity", (assert) => {
    const body = new Controller({ world: new World(), options: { terminalSpeed: 1000 } });
    body.placeAt(0, 4.5, 0);
    let time = 0;
    while (!body.grounded && time < 5) {
      body.update(null, false, 1 / 120);
      time += 1 / 120;
    }
    assert.true(Math.abs(time - Math.sqrt((2 * 4.5) / body.options.gravity)) < 0.03);
  });

  QUnit.test("a fall can't get faster than the terminal speed", (assert) => {
    const body = new Controller({ world: new World() });
    body.placeAt(0, 500, 0);
    for (let i = 0; i < 600; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.vy, -body.options.terminalSpeed);
  });

  QUnit.test("gravity can be turned off, and then it floats", (assert) => {
    const body = new Controller({ world: new World(), options: { gravity: 0 } });
    body.placeAt(0, 5, 0);
    for (let i = 0; i < 120; i++) body.update(null, false, 1 / 60);
    assert.false(body.grounded);
    assert.strictEqual(body.y, 5);
  });

  QUnit.test("a fall onto a roof lands on the roof, and not on the ground under it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 30, 0);
    for (let i = 0; i < 300 && !body.grounded; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.y, 20);
  });

  QUnit.test("a fast fall doesn't go through a thin box", (assert) => {
    const thin = { minX: -5, maxX: 5, minY: 9.9, maxY: 10, minZ: -5, maxZ: 5 };
    const body = new Controller({ world: new World({ boxes: [thin] }), options: { gravity: 3000, terminalSpeed: 200 } });
    body.placeAt(0, 12, 0);
    for (let i = 0; i < 100 && !body.grounded; i++) body.update(null, false, 0.05);
    assert.strictEqual(body.y, 10);
  });

  QUnit.test("running off the edge of a roof is a fall, to the ground", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, 0);
    let fell = false;
    for (let i = 0; i < 1000 && !(fell && body.grounded); i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.true(fell);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
    assert.true(body.z > 5);
  });

  QUnit.test("on a roof it isn't stopped by the building it stands on", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, -4);
    for (let i = 0; i < 20; i++) body.update(north, false, 1 / 60);
    assert.true(body.z > -4);
    assert.true(body.grounded || body.y <= 20);
  });

  QUnit.test("runs along a roof without falling while there is roof under it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, -4);
    body.update(null, false, 1 / 60); // lands
    let fell = false;
    for (let i = 0; i < 30; i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.false(fell);
    assert.strictEqual(body.y > 19.99, true);
  });

  QUnit.test("the edge holds a heel: it falls only when the middle of the body is past the reach", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, 5.1);
    body.update(null, false, 1 / 60);
    assert.true(body.grounded);
    body.placeAt(0, 20, 5.4);
    body.update(null, false, 1 / 60);
    assert.true(body.y < 20);
  });

  QUnit.test("a runner can fall past the side of a building without going through it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(-5.7, 15, 0);
    for (let i = 0; i < 400 && !body.grounded; i++) body.update({ x: 1, z: 0 }, false, 1 / 60);
    assert.true(body.x <= -5.45 + 1e-6);
    assert.strictEqual(body.y, 0);
  });
});

QUnit.module("Controller landing", () => {
  const world = new World();
  const fallFrom = (height, options = {}) => {
    const body = new Controller({ world, options });
    body.placeAt(0, height, 0);
    let frames = 0;
    while (!body.grounded && frames++ < 1000) body.update(null, false, 1 / 60);
    return body;
  };

  QUnit.test("a landing reports how fast the fall was", (assert) => {
    const body = fallFrom(10);
    assert.true(Math.abs(body.impact - Math.sqrt(2 * body.options.gravity * 10)) < 1.5);
  });

  QUnit.test("a hard landing holds the runner for a moment, and then lets go", (assert) => {
    const body = fallFrom(10);
    assert.true(body.landing > 0);
    for (let i = 0; i < 60; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("a small drop is not felt", (assert) => {
    const body = fallFrom(0.3);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("how hard a landing has to be to be felt can be changed", (assert) => {
    assert.true(fallFrom(0.3, { hardLanding: 1 }).landing > 0);
  });
});

QUnit.module("Controller reset and placeAt", () => {
  QUnit.test("reset puts it back where it began, standing, still", (assert) => {
    const body = new Controller({ x: 2, z: -9, heading: 0.5, world: new World({ ground: () => -0.15 }) });
    body.placeAt(30, 40, 50);
    for (let i = 0; i < 100; i++) body.update({ x: 1, z: 0 }, true, 1 / 60);
    body.reset();
    assert.deepEqual([body.x, body.z, body.y, body.heading, body.speed, body.vy, body.grounded], [2, -9, -0.15, 0.5, 0, 0, true]);
  });

  QUnit.test("placeAt puts it somewhere, in the air and still, and it falls from there", (assert) => {
    const body = new Controller({ world: new World() });
    body.placeAt(3, 7, 4);
    assert.deepEqual([body.x, body.y, body.z, body.speed, body.grounded], [3, 7, 4, 0, false]);
  });
});

QUnit.module("Controller in the district", () => {
  const world = new World({ boxes: [...buildingBoxes(), ...ledgeBoxes(), ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
  const bounds = districtBounds();

  QUnit.test("it can stand on every roof, and the roof is as high as the building", (assert) => {
    const problems = [];
    for (const box of buildingBoxes()) {
      const spot = roofSpot(box);
      const body = new Controller({ world, bounds });
      body.placeAt(spot.x, spot.y + 0.05, spot.z);
      for (let i = 0; i < 10; i++) body.update(null, false, 1 / 60);
      if (!body.grounded || Math.abs(body.y - box.maxY) > 1e-6) problems.push(box.name);
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("walking across a roof to its edge, the feet go up onto the raised edge and do not sink into it", (assert) => {
    const problems = [];
    for (const placement of buildingPlacements().filter((placed) => placed.rim > 0)) {
      const body = new Controller({ world, bounds });
      const spot = roofSpot({ ...footprint(placement), maxY: placement.roof });
      body.placeAt(spot.x, spot.y + 0.05, spot.z);
      for (let i = 0; i < 30; i++) body.update(null, false, 1 / 60);
      let highest = body.y;
      for (let i = 0; i < 400; i++) {
        body.update({ x: 1, z: 0 }, false, 1 / 60);
        highest = Math.max(highest, body.y);
        if (!body.grounded) break;
      }
      if (Math.abs(highest - (placement.roof + placement.rim)) > 0.02) problems.push(placement.name + " landed " + landed + " wanted " + (placement.roof - placement.ledge) + " y " + body.y);
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("beside the upper roof of a building in two levels, what is under the feet is the ledge, and not the air or the ground", (assert) => {
    const roofs = buildingBoxes();
    const problems = [];
    buildingPlacements().forEach((placement, i) => {
      if (!placement.ledge) return;
      const roof = roofs[i];
      const z = (roof.minZ + roof.maxZ) / 2;
      const beside = world.supportAt(roof.maxX + 0.6, z, BODY.supportReach, Infinity);
      const on = world.supportAt(roof.maxX - 3, z, BODY.supportReach, Infinity);
      if (Math.abs(beside - (placement.roof - placement.ledge)) > 1e-9 || Math.abs(on - placement.roof) > 1e-9) problems.push(placement.name);
    });
    assert.deepEqual(problems, []);
  });

  QUnit.test("it starts on the road at the junction", (assert) => {
    const body = new Controller({ x: 0, z: -9, world, bounds });
    assert.strictEqual(body.y, -ROAD_DEPTH);
  });

  QUnit.test("from a roof, walking off the edge ends on the ground, wherever it goes", (assert) => {
    const problems = [];
    for (const box of buildingBoxes()) {
      for (const direction of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
        const body = new Controller({ world, bounds });
        const spot = roofSpot(box);
        body.placeAt(spot.x, spot.y + 0.05, spot.z);
        for (let i = 0; i < 1500 && !(body.y < 1 && body.grounded); i++) body.update(direction, true, 1 / 60);
        if (!(body.y < 1 && body.grounded)) problems.push(`${box.name} ${direction.x},${direction.z}`);
      }
    }
    assert.deepEqual(problems, []);
  });
});
