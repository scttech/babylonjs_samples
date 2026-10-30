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

QUnit.module("jumpHeight and jumpDistance", () => {
  QUnit.test("a jump goes as high as the speed it leaves at, and gravity, say", (assert) => {
    assert.strictEqual(jumpHeight({ jumpSpeed: 6, gravity: 20 }), 0.9);
    assert.true(Math.abs(jumpHeight(BODY) - 1.35) < 1e-9);
  });

  QUnit.test("a jump goes as far as the time it is in the air, at the speed of the runner", (assert) => {
    assert.strictEqual(jumpDistance(5, { jumpSpeed: 6, gravity: 20 }), 3);
    assert.true(jumpDistance(7.5) > jumpDistance(4.5));
    assert.strictEqual(jumpDistance(0), 0);
  });
});

QUnit.module("Controller jumping", () => {
  const dt = 1 / 60;
  const flat = () => new World({ ground: () => 0 });
  const run = (body, frames, direction = null, sprint = false, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(direction, sprint, dt, jump);
  };

  QUnit.test("a jump that is made agrees with the formula for its height", (assert) => {
    const fine = 1 / 120; // a finer step, for the arithmetic to come close to the formula
    const body = new Controller({ world: flat() });
    let highest = 0;
    for (let i = 0; i < 200; i++) {
      body.update(null, false, fine, true);
      highest = Math.max(highest, body.y);
    }
    assert.true(Math.abs(highest - jumpHeight(BODY)) < 0.1, String(highest));
  });

  QUnit.test("a jump that is made agrees with the formula for its distance", (assert) => {
    const fine = 1 / 120;
    for (const sprint of [false, true]) {
      const body = new Controller({ world: flat() });
      for (let i = 0; i < 200; i++) body.update({ x: 0, z: 1 }, sprint, fine);
      const from = body.z;
      body.update({ x: 0, z: 1 }, sprint, fine, true);
      for (let i = 0; i < 400 && !body.grounded; i++) body.update({ x: 0, z: 1 }, sprint, fine, true);
      const speed = sprint ? SCOUT.sprintSpeed : SCOUT.jogSpeed;
      assert.true(Math.abs(body.z - from - jumpDistance(speed)) < 0.2, `${sprint}: ${body.z - from}`);
    }
  });

  QUnit.test("the jump key leaves the ground, going up", (assert) => {
    const body = new Controller({ world: flat() });
    body.update(null, false, dt, true);
    assert.false(body.grounded);
    assert.true(body.jumping);
    assert.true(body.vy > 0 && body.y > 0);
  });

  QUnit.test("without the key, it stays on the ground", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 30);
    assert.true(body.grounded);
    assert.false(body.jumping);
  });

  QUnit.test("a jump held to the top goes the whole height, and comes down to the ground", (assert) => {
    const body = new Controller({ world: flat() });
    let highest = 0;
    for (let i = 0; i < 90; i++) {
      body.update(null, false, dt, i < 30);
      highest = Math.max(highest, body.y);
    }
    assert.true(highest > jumpHeight(BODY) - 0.2 && highest < jumpHeight(BODY) + 0.1, String(highest));
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
  });

  QUnit.test("a tap is a hop: letting go on the way up cuts the jump short", (assert) => {
    const hop = new Controller({ world: flat() });
    const jump = new Controller({ world: flat() });
    let hopReached = 0;
    let jumpReached = 0;
    for (let i = 0; i < 60; i++) {
      hop.update(null, false, dt, i === 0);
      jump.update(null, false, dt, i < 30);
      hopReached = Math.max(hopReached, hop.y);
      jumpReached = Math.max(jumpReached, jump.y);
    }
    assert.true(hopReached > 0.1 && hopReached < jumpReached / 2, `${hopReached} ${jumpReached}`);
  });

  QUnit.test("a key held down jumps once: it has to go up and down again to jump again", (assert) => {
    const body = new Controller({ world: flat() });
    let takeoffs = 0;
    let was = true;
    for (let i = 0; i < 240; i++) {
      body.update(null, false, dt, true);
      if (was && !body.grounded) takeoffs++;
      was = body.grounded;
    }
    assert.strictEqual(takeoffs, 1);
  });

  QUnit.test("there is no jumping in the air", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 20, null, false, true);
    run(body, 5, null, false, false);
    const vy = body.vy;
    body.update(null, false, dt, true);
    assert.true(body.vy < vy, "pressing again is not a second jump");
  });

  QUnit.test("a jump lands in a hard landing for a runner who is standing, and runs on for one who is running", (assert) => {
    // Jumps for 30 frames, and says what the body is the frame it lands.
    const landsHolding = (direction) => {
      const body = new Controller({ world: flat() });
      run(body, 60, direction);
      let wasInTheAir = false;
      for (let i = 0; i < 90; i++) {
        body.update(direction, false, dt, i < 30);
        if (wasInTheAir && body.grounded) return body.landing;
        wasInTheAir = !body.grounded;
      }
      return -1;
    };
    assert.true(landsHolding(null) > 0);
    assert.strictEqual(landsHolding({ x: 0, z: 1 }), 0);
  });

  QUnit.test("a jump goes on in the way the runner was going", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 100, { x: 0, z: 1 }, true);
    const from = body.z;
    run(body, 20, { x: 0, z: 1 }, true, true);
    assert.true(body.z - from > 2);
    assert.false(body.grounded);
  });

  QUnit.test("it cannot jump in the middle of a roll, but can out of a hard landing, which is only a picture", (assert) => {
    const rolling = new Controller({ world: flat() });
    rolling.rolling = 0.5;
    rolling.update(null, false, dt, true);
    assert.true(rolling.grounded);
    const landing = new Controller({ world: flat() });
    landing.landing = 0.3;
    landing.update(null, false, dt, true);
    assert.false(landing.grounded);
  });

  QUnit.test("a runner who jumps at a wall does not go through it", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 30, minZ: 3, maxZ: 4 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    for (let i = 0; i < 200; i++) body.update({ x: 0, z: 1 }, true, dt, i % 60 < 30);
    assert.true(body.z <= 3 - body.options.radius + 1e-6);
  });

  QUnit.test("reset and placeAt put a jump away", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 10, null, false, true);
    body.reset();
    assert.deepEqual([body.grounded, body.jumping, body.vy], [true, false, 0]);
    run(body, 10, null, false, true);
    body.placeAt(1, 5, 1);
    assert.deepEqual([body.grounded, body.jumping, body.rolling], [false, false, 0]);
  });

  QUnit.test("the numbers of the jump can be changed: a stronger jump goes higher", (assert) => {
    const high = new Controller({ world: flat(), options: { jumpSpeed: 14 } });
    let highest = 0;
    for (let i = 0; i < 90; i++) {
      high.update(null, false, dt, i < 40);
      highest = Math.max(highest, high.y);
    }
    assert.true(highest > 2.5);
  });
});

QUnit.module("Controller coyote time and jump buffer", () => {
  const dt = 1 / 60;
  const roof = { minX: -50, maxX: 0, minY: 0, maxY: 5, minZ: -50, maxZ: 50 };
  const east = { x: 1, z: 0 };
  const onRoof = (options = {}) => new Controller({ x: -10, z: 0, heading: Math.PI / 2, world: new World({ boxes: [roof] }), options });

  // Runs off the edge of the roof, and then `late` frames after the feet left it, presses jump. Whether that jumped.
  const jumpsAfterTheEdge = (late, options) => {
    const body = onRoof(options);
    for (let i = 0; i < 600 && body.grounded; i++) body.update(east, true, dt);
    for (let i = 0; i < late; i++) body.update(east, true, dt);
    body.update(east, true, dt, true);
    return body.jumping;
  };

  QUnit.test("a jump a moment after running off an edge still works (the coyote time)", (assert) => {
    assert.true(jumpsAfterTheEdge(0));
    assert.true(jumpsAfterTheEdge(3));
  });

  QUnit.test("a jump too long after it does not", (assert) => {
    assert.false(jumpsAfterTheEdge(12));
  });

  QUnit.test("with no coyote time, a jump after the edge does not work", (assert) => {
    assert.false(jumpsAfterTheEdge(2, { coyoteTime: 0 }));
  });

  QUnit.test("a longer coyote time is a longer wait", (assert) => {
    assert.false(jumpsAfterTheEdge(12));
    assert.true(jumpsAfterTheEdge(12, { coyoteTime: 0.3 }));
  });

  QUnit.test("a runner who has jumped has no coyote time left to jump again with", (assert) => {
    const body = onRoof();
    for (let i = 0; i < 600 && body.x < -0.3; i++) body.update(east, true, dt);
    body.update(east, true, dt, true);
    assert.true(body.jumping);
    for (let i = 0; i < 20; i++) body.update(east, true, dt);
    const vy = body.vy;
    body.update(east, true, dt, true);
    assert.true(body.vy <= vy);
  });

  // Drops from a metre up (about a quarter of a second, fifteen frames), and presses jump after `wait` frames. Whether that jumped by the
  // time it had landed and a few frames more.
  const jumpsAfterTheDrop = (wait, options) => {
    const body = new Controller({ world: new World({ ground: () => 0 }), options });
    body.placeAt(0, 1, 0);
    let jumped = false;
    for (let i = 0; i < 40; i++) {
      body.update(null, false, dt, i === wait);
      if (body.jumping) jumped = true;
    }
    return jumped;
  };

  QUnit.test("a jump pressed a moment before landing happens as it lands (the jump buffer)", (assert) => {
    assert.true(jumpsAfterTheDrop(10));
    assert.true(jumpsAfterTheDrop(12));
  });

  QUnit.test("a jump pressed too long before landing is forgotten", (assert) => {
    assert.false(jumpsAfterTheDrop(0));
    assert.false(jumpsAfterTheDrop(2));
  });

  QUnit.test("with no jump buffer, a jump that is early is lost", (assert) => {
    assert.false(jumpsAfterTheDrop(12, { jumpBuffer: 0 }));
  });

  QUnit.test("a longer jump buffer remembers a jump pressed earlier", (assert) => {
    assert.false(jumpsAfterTheDrop(2));
    assert.true(jumpsAfterTheDrop(2, { jumpBuffer: 0.4 }));
  });
});

QUnit.module("Controller rolling", () => {
  const dt = 1 / 60;
  const east = { x: 1, z: 0 };

  // Runs off a roof `height` metres up (or, if not `running`, is put in the air above the edge of one), and returns the body just after it
  // has landed.
  const landed = (height, running) => {
    const world = new World({ boxes: [{ minX: -50, maxX: 0, minY: 0, maxY: height, minZ: -50, maxZ: 50 }] });
    const body = new Controller({ x: -10, z: 0, heading: Math.PI / 2, world });
    if (running) for (let i = 0; i < 600 && body.grounded; i++) body.update(east, false, dt);
    else body.placeAt(5, height, 0);
    for (let i = 0; i < 600 && !(body.grounded && body.impact > 0); i++) body.update(running ? east : null, false, dt);
    return body;
  };

  QUnit.test("a runner who falls a long way, going somewhere, rolls out of it", (assert) => {
    const body = landed(5, true);
    assert.true(body.impact >= BODY.rollImpact);
    assert.true(body.rolling > 0);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("a runner who falls the same way standing still has a hard landing", (assert) => {
    const body = landed(5, false);
    assert.true(body.impact >= BODY.rollImpact);
    assert.strictEqual(body.rolling, 0);
    assert.true(body.landing > 0);
  });

  QUnit.test("a runner who falls a short way, going somewhere, does not roll, and runs through the landing", (assert) => {
    const short = landed(1.2, true);
    assert.true(short.impact >= BODY.hardLanding && short.impact < BODY.rollImpact);
    assert.strictEqual(short.rolling, 0);
    assert.strictEqual(short.landing, 0);
  });

  QUnit.test("a runner who falls a short way standing still has a hard landing, and a very short fall is not felt", (assert) => {
    const short = landed(1.2, false);
    assert.strictEqual(short.rolling, 0);
    assert.true(short.landing > 0);
    const tiny = landed(0.6, false);
    assert.strictEqual(tiny.landing, 0);
  });

  QUnit.test("a roll goes at the speed of a roll, and the way the runner was going", (assert) => {
    const body = landed(5, true);
    const z = body.z;
    for (let i = 0; i < 10; i++) body.update(east, false, dt);
    assert.strictEqual(body.speed, BODY.rollSpeed);
    assert.true(Math.abs(body.z - z) < 1e-6);
  });

  QUnit.test("a roll cannot be steered", (assert) => {
    const body = landed(5, true);
    const heading = body.heading;
    for (let i = 0; i < 10; i++) body.update({ x: -1, z: 0 }, false, dt);
    assert.strictEqual(body.heading, heading);
  });

  QUnit.test("a roll cannot be jumped out of, until it is over", (assert) => {
    const body = landed(5, true);
    body.update(east, false, dt, true);
    assert.true(body.grounded);
    assert.false(body.jumping);
  });

  QUnit.test("a roll is over after its time, and the runner is free again", (assert) => {
    const body = landed(5, true);
    for (let i = 0; i < Math.ceil((BODY.rollTime + 0.1) / dt); i++) body.update(null, false, dt);
    assert.strictEqual(body.rolling, 0);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.strictEqual(body.speed, 0);
  });
});

QUnit.module("Jumping across a gap", () => {
  const dt = 1 / 60;
  const east = { x: 1, z: 0 };

  // Two roofs of the same height with `gap` metres between them. A runner takes a run up along the first, and jumps just before its edge, as a
  // player would. Whether they end on the second.
  const crosses = (gap, sprint, options) => {
    const first = { minX: -60, maxX: 0, minY: 0, maxY: 10, minZ: -10, maxZ: 10 };
    const second = { minX: gap, maxX: gap + 60, minY: 0, maxY: 10, minZ: -10, maxZ: 10 };
    const body = new Controller({ x: -40, z: 0, heading: Math.PI / 2, world: new World({ boxes: [first, second] }), options });
    for (let i = 0; i < 1500; i++) {
      body.update(east, sprint, dt, body.x > -0.3);
      if (body.x > gap && body.grounded && Math.abs(body.y - 10) < 0.01) return true;
      if (body.y < 5) return false;
    }
    return false;
  };

  QUnit.test("a short gap can be jumped jogging, and a longer one can't", (assert) => {
    assert.true(crosses(1.5, false));
    assert.false(crosses(4, false));
  });

  QUnit.test("a longer gap can be jumped sprinting", (assert) => {
    assert.true(crosses(3.5, true));
    assert.false(crosses(6, true));
  });

  QUnit.test("the gaps that can be jumped follow jumpDistance: a little under it, and not much over it", (assert) => {
    for (const sprint of [false, true]) {
      const reach = jumpDistance(sprint ? SCOUT.sprintSpeed : SCOUT.jogSpeed);
      assert.true(crosses(reach - 0.8, sprint), `${sprint} inside`);
      assert.false(crosses(reach + 1, sprint), `${sprint} outside`);
    }
  });

  QUnit.test("a bigger jump speed crosses a bigger gap", (assert) => {
    assert.false(crosses(5.5, true));
    assert.true(crosses(5.5, true, { jumpSpeed: 11 }));
  });
});

QUnit.module("The numbers of a ledge", () => {
  QUnit.test("the hands catch a ledge above the waist, and not above their reach", (assert) => {
    assert.true(BODY.handLow > 0 && BODY.handLow < BODY.handReach);
  });

  QUnit.test("a body hangs by its hands: its feet are under the ledge by no more than the hands reach", (assert) => {
    assert.true(BODY.hangDrop > 0 && BODY.hangDrop <= BODY.handReach);
  });

  QUnit.test("every ledge of a building in two levels can be caught by a jump from the roof below it", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      if (building.ledge) assert.true(building.ledge < jumpHeight(BODY) + BODY.handReach - BODY.handLow, building.file);
    }
  });

  QUnit.test("the times are real: a climb takes a fraction of a second, and a ledge that was let go of is caught again after a moment", (assert) => {
    assert.true(BODY.climbTime > 0.2 && BODY.climbTime < 1.5);
    assert.true(BODY.grabCooldown > 0 && BODY.grabCooldown < 1);
  });
});

QUnit.module("Controller hanging from a ledge", () => {
  const dt = 1 / 60;
  const south = { x: 0, z: -1 }; // away from the wall
  const north = { x: 0, z: 1 }; // toward it
  const climber = (box = WALL, options = {}) => new Controller({ x: 5, z: -0.5, heading: 0, world: new World({ boxes: [box] }), ledges: ledgesOf([box]), options });
  // Stands at the wall and jumps at it, until it has hold of something or it has come down.
  const jumpedAt = (body) => {
    for (let i = 0; i < 60 && !body.hang; i++) body.update(null, false, dt, i < 20);
    return body;
  };
  const run = (body, frames, direction = null) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, dt);
  };

  QUnit.test("a body that jumps at a wall with a ledge in reach catches it, and hangs from it by the hands", (assert) => {
    const body = jumpedAt(climber());
    assert.notStrictEqual(body.hang, null);
    assert.false(body.grounded);
    assert.strictEqual(body.vy, 0);
    assert.true(Math.abs(body.y - (3 - BODY.hangDrop)) < 1e-9);
    assert.strictEqual(body.hang.climb, null);
  });

  QUnit.test("it hangs there: gravity does not pull it off, and it faces the wall", (assert) => {
    const body = jumpedAt(climber());
    const { x, y, z } = body;
    run(body, 120);
    assert.deepEqual([body.x, body.y, body.z], [x, y, z]);
    assert.strictEqual(body.heading, 0);
    assert.notStrictEqual(body.hang, null);
  });

  QUnit.test("on the ground, it does not catch a ledge, even one it could reach", (assert) => {
    const low = { ...WALL, maxY: 2 };
    const body = climber(low);
    run(body, 60);
    assert.strictEqual(body.hang, null);
    assert.true(body.grounded);
  });

  QUnit.test("it does not catch a ledge that is too high, or one it is not facing", (assert) => {
    assert.strictEqual(jumpedAt(climber({ ...WALL, maxY: 6 })).hang, null);
    const away = climber();
    away.heading = Math.PI;
    assert.strictEqual(jumpedAt(away).hang, null);
  });

  QUnit.test("a higher jump reaches a higher ledge", (assert) => {
    assert.strictEqual(jumpedAt(climber({ ...WALL, maxY: 4.2 })).hang, null);
    assert.notStrictEqual(jumpedAt(climber({ ...WALL, maxY: 4.2 }, { jumpSpeed: 12 })).hang, null);
  });

  QUnit.test("it does not catch a ledge until the jump is near its top", (assert) => {
    const body = climber();
    body.update(null, false, dt, true);
    assert.strictEqual(body.hang, null, "just off the ground, going up fast");
    assert.true(body.vy > BODY.grabMaxRise);
  });

  QUnit.test("letting go (the key away from the wall) drops it, and the ledge is not caught again at once", (assert) => {
    const body = jumpedAt(climber());
    body.update(south, false, dt);
    assert.strictEqual(body.hang, null);
    assert.false(body.grounded);
    run(body, 10);
    assert.strictEqual(body.hang, null, "still in reach of the ledge, but it has only just let go");
    run(body, 120);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
  });

  QUnit.test("reset and placeAt let go of a ledge", (assert) => {
    const body = jumpedAt(climber());
    body.placeAt(1, 5, 1);
    assert.strictEqual(body.hang, null);
    const again = jumpedAt(climber());
    again.reset();
    assert.deepEqual([again.hang, again.grounded], [null, true]);
  });
});

QUnit.module("Controller shimmying and climbing", () => {
  const dt = 1 / 60;
  const west = { x: -1, z: 0 };
  const east = { x: 1, z: 0 };
  const north = { x: 0, z: 1 };
  const hanging = (box = WALL, boxes = []) => {
    const body = new Controller({ x: 5, z: -0.5, heading: 0, world: new World({ boxes: [box, ...boxes] }), ledges: ledgesOf([box]) });
    for (let i = 0; i < 60 && !body.hang; i++) body.update(null, false, dt, i < 20);
    return body;
  };
  const run = (body, frames, direction = null, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, dt, jump);
  };

  QUnit.test("a key along the ledge shimmies along it, at the speed of a shimmy, and not off the wall", (assert) => {
    const body = hanging();
    const { y, z } = body;
    run(body, 60, west);
    assert.true(Math.abs(body.x - (5 - BODY.shimmySpeed)) < 0.05, String(body.x));
    assert.deepEqual([body.y, body.z], [y, z]);
    run(body, 120, east);
    assert.true(body.x > 5, "and back the other way");
  });

  QUnit.test("it says which way it is shimmying, as the body's left or right", (assert) => {
    const body = hanging();
    body.update(east, false, dt);
    assert.strictEqual(body.hang.moving, 1, "facing north, east is to the right");
    body.update(west, false, dt);
    assert.strictEqual(body.hang.moving, -1);
    body.update(null, false, dt);
    assert.strictEqual(body.hang.moving, 0);
  });

  QUnit.test("it stops at the ends of the ledge, with room for the body", (assert) => {
    const body = hanging();
    run(body, 600, west);
    assert.true(Math.abs(body.x - OPTIONS.ledgeMargin) < 0.05, String(body.x));
    run(body, 1200, east);
    assert.true(Math.abs(body.x - (10 - OPTIONS.ledgeMargin)) < 0.05, String(body.x));
  });

  QUnit.test("it stops when there is something in the way along the ledge", (assert) => {
    const post = { name: "post", minX: 0, maxX: 3, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    const body = hanging(WALL, [post]);
    run(body, 600, west);
    assert.true(body.x >= 3 + OPTIONS.radius - 0.05, String(body.x));
    assert.notStrictEqual(body.hang, null);
  });

  QUnit.test("a key into the wall climbs the ledge, in the time of a climb, and ends standing on top", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    assert.notStrictEqual(body.hang.climb, null);
    run(body, Math.floor((BODY.climbTime - 0.1) / dt));
    assert.notStrictEqual(body.hang, null, "not done yet");
    run(body, 15);
    assert.strictEqual(body.hang, null);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 3);
    assert.true(body.z > 0 && body.z < 1, "on top of the box, near its edge");
  });

  QUnit.test("the jump key climbs it too", (assert) => {
    const body = hanging();
    run(body, 5);
    body.update(null, false, dt, true);
    assert.notStrictEqual(body.hang.climb, null);
  });

  QUnit.test("it rises while it climbs, and goes over the edge after", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    let lastY = body.y;
    for (let i = 0; i < 10; i++) {
      body.update(null, false, dt);
      assert.true(body.y >= lastY - 1e-9);
      lastY = body.y;
    }
    assert.true(body.z < 0, "still in front of the wall at the start of the climb");
  });

  QUnit.test("the keys do nothing while it climbs: it cannot be dropped half way", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    run(body, 10, { x: 0, z: -1 });
    assert.notStrictEqual(body.hang, null);
    run(body, 60);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 3);
  });

  QUnit.test("it cannot climb a ledge that has a wall on top of it, and stays hanging", (assert) => {
    const above = { name: "above", minX: 0, maxX: 10, minY: 0, maxY: 9, minZ: 0.5, maxZ: 10 };
    const body = hanging();
    body.world.boxes.push(above); // the wall is put there after the body has caught the ledge
    run(body, 60, north);
    assert.notStrictEqual(body.hang, null);
    assert.strictEqual(body.hang.climb, null);
  });

  QUnit.test("after a climb it can walk away on top, and is not pulled back to the ledge", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    run(body, 60);
    run(body, 60, north);
    assert.strictEqual(body.hang, null);
    assert.true(body.z > 3);
  });
});

QUnit.module("Hanging from any ledge", () => {
  const dt = 1 / 60;
  const wallWorld = () => new World({ boxes: [WALL] });
  const ledge = () => ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("hangOn puts the body hanging from the ledge where it is told, wherever it was, and still", (assert) => {
    const body = new Controller({ x: 1, z: 20, world: wallWorld(), ledges: ledgesOf([WALL]) });
    body.hangOn(ledge(), 5);
    const spot = hangSpot(ledge(), 5, body.options);
    assert.deepEqual([body.x, body.y, body.z, body.heading], [spot.x, spot.y, spot.z, spot.heading]);
    assert.false(body.grounded);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.strictEqual(body.y, spot.y);
  });

  QUnit.test("a body put on a ledge can climb it, shimmy on it and be dropped", (assert) => {
    const body = new Controller({ x: 1, z: 20, world: wallWorld(), ledges: ledgesOf([WALL]) });
    body.hangOn(ledge(), 5);
    body.update({ x: 1, z: 0 }, false, dt);
    assert.strictEqual(body.hang.moving, 1);
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3);
  });

  QUnit.test("a body that hangs from a leaning wall is out from the face of the box by the lean, and climbs just the same", (assert) => {
    const leaning = { ...WALL, lean: 0.45 };
    const body = new Controller({ x: 1, z: 20, world: new World({ boxes: [leaning] }), ledges: ledgesOf([leaning]) });
    body.hangOn(ledgesOf([leaning]).find((l) => l.nz === -1), 5);
    assert.true(Math.abs(body.z - -(OPTIONS.radius + OPTIONS.hangOffset + 0.45)) < 1e-9);
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3 && body.z > 0);
  });
});

QUnit.module("Dropping down onto a ledge", () => {
  const dt = 1 / 60;
  const onTop = (changes = {}) => new Controller({ x: 5, z: 0.6, y: 3, world: new World({ boxes: [WALL] }), ledges: ledgesOf([WALL]), ...changes });

  QUnit.test("a body near the edge of a roof can lower itself over it, and hangs from the ledge, facing the wall", (assert) => {
    const body = onTop();
    assert.true(body.dropDown());
    assert.notStrictEqual(body.hang, null);
    assert.false(body.grounded);
    assert.true(Math.abs(body.y - (3 - BODY.hangDrop)) < 1e-9);
    assert.true(body.z < 0, "it is on the outside of the wall now");
    assert.strictEqual(body.heading, 0, "and faces the wall, which is to the north");
  });

  QUnit.test("it can climb back up, and the climb ends where it began, on the roof", (assert) => {
    const body = onTop();
    body.dropDown();
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3 && body.z > 0);
  });

  QUnit.test("away from the edges, or in the air, or already hanging, there is nothing to drop to", (assert) => {
    const middle = onTop({ z: 5 });
    assert.false(middle.dropDown());
    assert.strictEqual(middle.hang, null);
    const falling = onTop();
    falling.placeAt(5, 3, 0.6);
    assert.false(falling.dropDown());
    const hanging = onTop();
    hanging.dropDown();
    assert.false(hanging.dropDown());
  });

  QUnit.test("it is the same on every roof of the district that has room under its edge", (assert) => {
    const roofs = buildingBoxes();
    const world = new World({ boxes: [...roofs, ...ledgeBoxes(), ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
    const ledges = ledgesOf([...roofs, ...ledgeBoxes()]);
    let dropped = 0;
    for (const roof of roofs) {
      const spot = roofSpot(roof);
      const body = new Controller({ x: roof.minX + 0.6, y: roof.maxY, z: spot.z, world, ledges });
      if (body.dropDown()) dropped++;
    }
    assert.true(dropped >= roofs.length / 2, "most of the roofs have a ledge to lower oneself onto: " + dropped);
  });
});

QUnit.module("Ledges of the district", () => {
  const roofs = buildingBoxes();
  const lowerRoofs = ledgeBoxes();
  const world = new World({ boxes: [...roofs, ...lowerRoofs, ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...roofs, ...lowerRoofs]);
  const dt = 1 / 60;

  QUnit.test("a runner on the lower roof of a building in two levels can jump at the upper one, catch its ledge and climb it", (assert) => {
    const problems = [];
    buildingPlacements().forEach((placement, i) => {
      if (!placement.ledge) return;
      const spot = ledgeSpot(placement, roofs[i]);
      const body = new Controller({ x: spot.x, y: spot.y, z: spot.z, heading: spot.heading, world, ledges });
      for (let f = 0; f < 60 && !body.hang; f++) body.update(null, false, dt, f < 20);
      if (!body.hang || body.hang.ledge.name !== placement.name) return problems.push(`${placement.name} not caught`);
      body.update({ x: -1, z: 0 }, false, dt);
      for (let f = 0; f < 80; f++) body.update(null, false, dt);
      if (!body.grounded || body.y < placement.roof - 0.01) problems.push(`${placement.name} not climbed: ${body.y}`);
    });
    assert.deepEqual(problems, []);
  });

  QUnit.test("every ledge of the district that can be hung from, in the middle, can be climbed onto the roof", (assert) => {
    const problems = [];
    let hung = 0;
    for (const ledge of ledges) {
      const body = new Controller({ world, ledges });
      const u = ledge.length / 2;
      if (!canHang(world, ledge, u, body.options) || !canClimb(world, ledge, u, body.options)) continue;
      hung++;
      body.hangOn(ledge, u);
      body.update({ x: -ledge.nx, z: -ledge.nz }, false, dt);
      for (let f = 0; f < 80; f++) body.update(null, false, dt);
      if (!body.grounded || body.y < ledge.y - 0.01) problems.push(`${ledge.name} ${ledge.nx},${ledge.nz}`);
    }
    assert.true(hung > 20, "most of the ledges can be hung from");
    assert.deepEqual(problems, []);
  });

  QUnit.test("a runner in the street cannot reach a ledge of any building", (assert) => {
    const body = new Controller({ x: 0, z: -9, world, ledges, bounds: districtBounds() });
    for (let f = 0; f < 120; f++) body.update({ x: 0, z: 1 }, true, dt, f % 30 < 15);
    assert.strictEqual(body.hang, null);
  });
});

QUnit.module("The numbers of the moves", () => {
  QUnit.test("a wall that is vaulted is more than a step and no higher than the reach of the hands from the ground", (assert) => {
    assert.true(BODY.stepHeight < BODY.vaultHeight && BODY.vaultHeight <= BODY.mantleHeight && BODY.mantleHeight < BODY.handReach);
  });

  QUnit.test("a vault has to be run at: slower than a jog, and faster than a walk", (assert) => {
    assert.true(BODY.vaultSpeed > 0 && BODY.vaultSpeed < SCOUT.jogSpeed);
  });

  QUnit.test("the times are real: a mantle takes a fraction of a second, and a kick holds the keys for less than that", (assert) => {
    assert.true(BODY.mantleTime > 0.2 && BODY.mantleTime < 1.5);
    assert.true(BODY.wallLock > 0 && BODY.wallLock < BODY.mantleTime);
  });

  QUnit.test("a kick off a wall goes up, and no more than twice as fast as a jump from the ground", (assert) => {
    assert.true(BODY.wallJumpSpeed < BODY.jumpSpeed * 2 && BODY.wallJumpSpeed > 0);
  });

  QUnit.test("help is a little: less than the reach of the hands, and than the width of the body", (assert) => {
    assert.true(BODY.assistReach > 0 && BODY.assistReach < BODY.handReach / 2);
    assert.true(BODY.assistDistance > 0 && BODY.assistDistance < SCOUT.radius * 2);
    assert.true(BODY.assistAngle > 0 && BODY.assistAngle < 1);
  });
});

QUnit.module("Controller vaulting", () => {
  const dt = 1 / 60;
  const north = { x: 0, z: 1 };
  const LOW = { name: "low wall", minX: -5, maxX: 5, minY: 0, maxY: 0.9, minZ: 0, maxZ: 0.4 };
  const runner = (box = LOW, options = {}) => new Controller({ x: 0, z: -5, heading: 0, world: new World({ boxes: [box] }), options });
  // Runs north for `seconds`, and says how high the feet got.
  const run = (body, seconds, sprint = false) => {
    let top = body.y;
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      body.update(north, sprint, dt);
      top = Math.max(top, body.y);
    }
    return top;
  };

  QUnit.test("a runner that runs at a low wall goes over it, and is on the ground beyond it, still running", (assert) => {
    const body = runner();
    run(body, 3);
    assert.true(body.z > LOW.maxZ + SCOUT.radius);
    assert.strictEqual(body.y, 0);
    assert.true(body.grounded);
    assert.strictEqual(body.move, null);
    assert.strictEqual(body.speed, SCOUT.jogSpeed);
  });

  QUnit.test("it begins as the body gets to the wall, and is a vault", (assert) => {
    const body = runner();
    let began = null;
    for (let i = 0; i < 200 && !began; i++) {
      body.update(north, false, dt);
      if (body.move) began = { z: body.z, kind: body.move.kind };
    }
    assert.strictEqual(began.kind, "vault");
    assert.true(began.z < LOW.minZ - SCOUT.radius, "before it has touched the wall");
    assert.true(began.z > LOW.minZ - SCOUT.radius - BODY.vaultReach - 0.2);
  });

  QUnit.test("it goes over the top of the wall, as high as the lift says, and not much higher", (assert) => {
    const body = runner();
    const top = run(body, 3);
    assert.true(Math.abs(top - (LOW.maxY + BODY.vaultLift)) < 1e-9);
  });

  QUnit.test("it takes the time that the way takes at the speed it is going, and a sprint is faster than a jog", (assert) => {
    const timeOf = (sprint) => {
      const body = runner();
      for (let i = 0; i < 600 && !body.move; i++) body.update(north, sprint, dt);
      return body.move.time;
    };
    assert.true(timeOf(true) < timeOf(false));
    assert.true(timeOf(false) > 0.3 && timeOf(false) < 1);
  });

  QUnit.test("it does not steer or stop: the keys are not read while it goes", (assert) => {
    const body = runner();
    while (!body.move) body.update(north, false, dt);
    const heading = body.heading;
    for (let i = 0; i < 5; i++) body.update({ x: -1, z: 0 }, false, dt);
    assert.strictEqual(body.heading, heading);
    assert.notStrictEqual(body.move, null);
  });

  QUnit.test("a walk is not a vault: a body that is too slow stops at the wall", (assert) => {
    const body = runner(LOW, { jogSpeed: BODY.vaultSpeed - 1 });
    run(body, 3);
    assert.strictEqual(body.move, null);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a wall that is too high is not vaulted, and stops the body", (assert) => {
    const body = runner({ ...LOW, maxY: BODY.vaultHeight + 0.3 });
    run(body, 3);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a wall that is too thick is not vaulted either", (assert) => {
    const body = runner({ ...LOW, maxZ: BODY.vaultDepth + 0.6 });
    run(body, 3);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a body in the air does not vault: it falls, or catches what it can", (assert) => {
    const body = runner();
    body.placeAt(0, 3, -1);
    body.speed = 5;
    body.update(north, false, dt);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("a body that is only walking along the wall does not vault it", (assert) => {
    const body = new Controller({ x: -3, z: -0.5, heading: Math.PI / 2, world: new World({ boxes: [LOW] }) });
    for (let i = 0; i < 100; i++) body.update({ x: 1, z: 0 }, false, dt);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("it can be reset or placed somewhere else in the middle of a vault", (assert) => {
    const body = runner();
    while (!body.move) body.update(north, false, dt);
    body.placeAt(0, 5, 0);
    assert.strictEqual(body.move, null);
    const again = runner();
    while (!again.move) again.update(north, false, dt);
    again.reset();
    assert.strictEqual(again.move, null);
  });
});

QUnit.module("Controller mantling", () => {
  const dt = 1 / 60;
  const CRATE = { name: "crate", minX: 0, maxX: 4, minY: 0, maxY: 1.5, minZ: 0, maxZ: 1.5 };
  const mantler = (box = CRATE, options = {}) => new Controller({ x: 2, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [box] }), ledges: ledgesOf([box]), options });
  const run = (body, frames, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(null, false, dt, jump);
  };

  QUnit.test("a body at a crate that is too high to step onto mantles it when the jump key goes down", (assert) => {
    const body = mantler();
    body.update(null, false, dt, true);
    assert.strictEqual(body.move.kind, "mantle");
    assert.strictEqual(body.vy, 0);
  });

  QUnit.test("it is a jump that is wanted: without the key, nothing happens", (assert) => {
    const body = mantler();
    run(body, 30);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("it takes the time of the mantle, and ends standing on top of the crate, on the ground", (assert) => {
    const body = mantler();
    run(body, Math.ceil(BODY.mantleTime / dt) - 3, true);
    assert.notStrictEqual(body.move, null);
    run(body, 6, true);
    assert.strictEqual(body.move, null);
    assert.strictEqual(body.y, 1.5);
    assert.true(body.grounded);
    assert.true(body.z > CRATE.minZ && body.z < CRATE.maxZ);
  });

  QUnit.test("it goes up first and then over the edge, as a climb does, and faces the wall the whole way", (assert) => {
    const body = mantler();
    run(body, 6, true);
    assert.strictEqual(body.heading, 0);
    const z = body.z;
    run(body, 12, true);
    assert.true(body.y > 0.1, "up");
    assert.true(Math.abs(body.z - z) < 0.2, "not yet over");
  });

  QUnit.test("it stands still when it has mantled: the speed is taken away, and the ledge is not caught again at once", (assert) => {
    const body = mantler();
    run(body, 80, true);
    assert.strictEqual(body.speed, 0);
    assert.strictEqual(body.hang, null);
    assert.strictEqual(body.y, 1.5);
  });

  QUnit.test("a ledge that is too high for the hands from the ground is jumped at instead", (assert) => {
    const body = mantler({ ...CRATE, maxY: BODY.mantleHeight + 0.3 });
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
    assert.true(body.vy > 0);
  });

  QUnit.test("a body that is not facing the crate jumps, and does not mantle", (assert) => {
    const body = mantler();
    body.heading = Math.PI;
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
    assert.true(body.vy > 0);
  });

  QUnit.test("a runner that does not have room on top of the crate does not mantle it", (assert) => {
    const world = new World({ boxes: [CRATE, { minX: 0, maxX: 4, minY: 2, maxY: 3, minZ: 0, maxZ: 1.5 }] });
    const body = new Controller({ x: 2, z: -SCOUT.radius - 0.1, heading: 0, world, ledges: ledgesOf([CRATE]) });
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
  });
});

QUnit.module("Controller kicking off a wall", () => {
  const dt = 1 / 60;
  const WALL = { name: "wall", minX: -10, maxX: 10, minY: 0, maxY: 6, minZ: 0, maxZ: 1 };
  const kicker = (options = {}, box = WALL) => {
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [box] }), options });
    body.placeAt(0, 2, -SCOUT.radius - 0.1); // in the air, beside the wall, facing it
    return body;
  };
  // A jump key that goes down, in the air.
  const press = (body, direction = null) => {
    body.update(direction, false, dt, false);
    body.update(direction, false, dt, true);
  };

  QUnit.test("a body in the air beside a wall that it faces, when the jump key goes down, is kicked up and out from the wall", (assert) => {
    const body = kicker();
    press(body);
    assert.strictEqual(body.wallJumps, 1);
    assert.true(Math.abs(body.vy - (BODY.wallJumpSpeed - BODY.gravity * dt)) < 1e-9);
    assert.strictEqual(body.speed, BODY.wallKick);
    assert.true(body.jumping);
  });

  QUnit.test("it is turned to face away from the wall, and goes that way", (assert) => {
    const body = kicker();
    press(body);
    assert.true(Math.abs(Math.abs(body.heading) - Math.PI) < 1e-9);
    const z = body.z;
    for (let i = 0; i < 10; i++) body.update(null, false, dt);
    assert.true(body.z < z, "away from the wall, to the south");
  });

  QUnit.test("it needs a wall, and a wall that it faces", (assert) => {
    const far = kicker();
    far.z = -3;
    press(far);
    assert.strictEqual(far.wallJumps, 0);
    const turned = kicker();
    turned.heading = Math.PI;
    press(turned);
    assert.strictEqual(turned.wallJumps, 0);
  });

  QUnit.test("on the ground, beside a wall, the jump key is a jump", (assert) => {
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [WALL] }) });
    press(body);
    assert.strictEqual(body.wallJumps, 0);
    assert.strictEqual(body.speed, 0);
  });

  QUnit.test("the keys do not steer for a moment after a kick, and then they do", (assert) => {
    const body = kicker();
    press(body);
    const heading = body.heading;
    body.update({ x: 0, z: 1 }, false, dt);
    assert.strictEqual(body.heading, heading);
    for (let i = 0; i < Math.ceil(BODY.wallLock / dt) + 20; i++) body.update({ x: 0, z: 1 }, false, dt);
    assert.true(Math.abs(body.heading) < Math.abs(heading));
  });

  QUnit.test("never twice in a row off the same wall", (assert) => {
    const body = kicker();
    press(body);
    assert.strictEqual(body.wallJumps, 1);
    body.heading = 0;
    body.z = -SCOUT.radius - 0.1;
    press(body);
    assert.strictEqual(body.wallJumps, 1);
  });

  QUnit.test("there is no limit to the kicks in one jump, between two walls", (assert) => {
    const south = { name: "south", minX: -10, maxX: 10, minY: 0, maxY: 60, minZ: 0, maxZ: 1 };
    const north = { name: "north", minX: -10, maxX: 10, minY: 0, maxY: 60, minZ: -2.4, maxZ: -1.4 };
    const body = new Controller({ x: 0, z: -0.7, heading: 0, world: new World({ boxes: [south, north] }) });
    body.placeAt(0, 2, -0.7);
    for (let kick = 0; kick < 12; kick++) {
      body.heading = kick % 2 === 0 ? 0 : Math.PI;
      body.z = -0.7;
      press(body);
    }
    assert.strictEqual(body.wallJumps, 12);
  });

  QUnit.test("landing gives the kicks back, and the wall again", (assert) => {
    const body = kicker();
    press(body);
    for (let i = 0; i < 300 && !body.grounded; i++) body.update(null, false, dt);
    assert.true(body.grounded);
    assert.strictEqual(body.wallJumps, 0);
    assert.strictEqual(body.kickedOff, null);
  });

  QUnit.test("kicking between two walls goes on up, to the top of them, where the ledge is caught", (assert) => {
    const wall = (minX, maxX) => ({ name: "wall", minX, maxX, minY: 0, maxY: 20, minZ: -5, maxZ: 5 });
    const boxes = [wall(-3.1, -1), wall(1, 3.1)];
    const world = new World({ boxes });
    const body = new Controller({ x: -0.5, z: 0, heading: -Math.PI / 2, world, ledges: ledgesOf(boxes) });
    // A player who is jumping in a gap between two walls: the key goes up and down while a wall is near (to kick off it), and is held otherwise.
    let kicks = 0;
    let last = 0;
    for (let i = 0; i < 1200 && !body.hang; i++) {
      const near = Boolean(findWall(world, body, body.options, body.kickedOff));
      body.update(null, false, dt, near ? i % 2 === 0 : true);
      if (body.wallJumps > last) kicks++;
      last = body.wallJumps;
    }
    assert.notStrictEqual(body.hang, null, "it is hanging");
    assert.strictEqual(body.hang.ledge.y, 20);
    assert.true(kicks > 10, "more than ten kicks");
  });

  QUnit.test("a kick carries higher than the jump it came from", (assert) => {
    const reach = (kick) => {
      const body = kicker();
      if (kick) press(body);
      let top = body.y;
      for (let i = 0; i < 90; i++) {
        body.update(null, false, dt, kick);
        top = Math.max(top, body.y);
      }
      return top;
    };
    assert.true(reach(true) > reach(false) + 0.5);
  });
});

QUnit.module("Controller grab assist", () => {
  const dt = 1 / 60;
  const WALL = { name: "wall", minX: -5, maxX: 5, minY: 0, maxY: 3.9, minZ: 0, maxZ: 1 };
  const jumper = (options = {}) => new Controller({ x: 0, z: -SCOUT.radius - 0.15, heading: 0, world: new World({ boxes: [WALL] }), ledges: ledgesOf([WALL]), options });
  // Jumps at the wall, and holds the key toward it (or not), until it is caught, or has come down.
  const jumpAt = (body, direction) => {
    for (let i = 0; i < 90 && !body.hang && !(i > 10 && body.grounded); i++) body.update(direction, false, dt, i < 30);
    return body;
  };

  QUnit.test("a ledge that is just too high for a jump is caught by a body that is steering toward it", (assert) => {
    assert.notStrictEqual(jumpAt(jumper(), { x: 0, z: 1 }).hang, null);
  });

  QUnit.test("and not by one that is not: the help is for a body that is asking to go there", (assert) => {
    assert.strictEqual(jumpAt(jumper(), null).hang, null);
  });

  QUnit.test("and not at all, without the help", (assert) => {
    const none = { assistReach: 0, assistDistance: 0, assistAngle: 0 };
    assert.strictEqual(jumpAt(jumper(none), { x: 0, z: 1 }).hang, null);
  });

  QUnit.test("a body that is caught with help hangs just as one that was caught without it does", (assert) => {
    const body = jumpAt(jumper(), { x: 0, z: 1 });
    assert.true(Math.abs(body.y - (3.9 - BODY.hangDrop)) < 1e-9);
    assert.strictEqual(body.heading, 0);
  });

  QUnit.test("help is a little: a wall that is much too high is not caught", (assert) => {
    const high = { ...WALL, maxY: 6 };
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.15, heading: 0, world: new World({ boxes: [high] }), ledges: ledgesOf([high]) });
    assert.strictEqual(jumpAt(body, { x: 0, z: 1 }).hang, null);
  });
});

QUnit.module("The yard of the district", () => {
  const dt = 1 / 60;
  const boxes = [...buildingBoxes(), ...ledgeBoxes(), ...rimBoxes(), ...yardBoxes()];
  const world = () => new World({ boxes, ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...buildingBoxes(), ...ledgeBoxes(), ...yardBoxes()]);
  const piece = (name) => yardBoxes().find((box) => box.name === `yard ${name}`);
  const south = (box, back) => ({ x: (box.minX + box.maxX) / 2, z: box.minZ - back });

  QUnit.test("a runner coming north along the road from the start of the yard vaults the low wall, and is running on the other side of it", (assert) => {
    const wall = piece("low wall");
    const body = new Controller({ ...YARD_START, world: world(), ledges });
    let vaulted = false;
    for (let i = 0; i < 600 && body.z < wall.maxZ + 2; i++) {
      body.update({ x: 0, z: 1 }, false, dt);
      vaulted = vaulted || (body.move && body.move.kind === "vault");
    }
    assert.true(vaulted);
    assert.true(body.z > wall.maxZ + 1);
    assert.true(body.grounded);
    assert.strictEqual(body.y, groundHeight(body.x, body.z));
  });

  QUnit.test("a runner at the crate mantles it, and stands on it", (assert) => {
    const crate = piece("crate");
    const at = south(crate, SCOUT.radius + 0.1);
    const body = new Controller({ ...at, heading: 0, world: world(), ledges });
    for (let i = 0; i < 90; i++) body.update(null, false, dt, i < 3);
    assert.strictEqual(body.y, crate.maxY);
    assert.true(body.grounded);
  });

  QUnit.test("the two walls are close enough that a body kicked off one reaches the other before the top of the kick", (assert) => {
    const west = piece("west wall");
    const east = piece("east wall");
    const gap = east.minX - west.maxX;
    const across = (gap - SCOUT.radius * 2 - BODY.wallReach) / BODY.wallKick;
    assert.true(across < BODY.wallJumpSpeed / BODY.gravity);
    assert.true(gap > SCOUT.radius * 2 + 0.2, "and wide enough to stand between");
  });

  QUnit.test("the high wall is too high for a jump, and not with a little help", (assert) => {
    const wall = piece("high wall");
    const at = south(wall, SCOUT.radius + 0.15);
    const jumpAt = (options) => {
      const body = new Controller({ ...at, y: wall.minY, heading: 0, world: world(), ledges, options });
      for (let i = 0; i < 90 && !body.hang && !(i > 10 && body.grounded); i++) body.update({ x: 0, z: 1 }, false, dt, i < 30);
      return body.hang;
    };
    assert.strictEqual(jumpAt({ assistReach: 0, assistDistance: 0, assistAngle: 0 }), null);
    assert.notStrictEqual(jumpAt({}), null);
  });

  QUnit.test("every piece of the yard is for a move, and is the right size for it", (assert) => {
    for (const [i, piece] of YARD.entries()) {
      const box = yardBoxes()[i];
      const height = box.maxY - box.minY;
      if (piece.move === "vault") assert.true(height > BODY.stepHeight && height <= BODY.vaultHeight && piece.depth <= BODY.vaultDepth, piece.name);
      if (piece.move === "mantle") assert.true(height > BODY.vaultHeight && height <= BODY.mantleHeight && piece.depth > BODY.vaultDepth, piece.name);
      if (piece.move === "wall jump") assert.true(height >= BODY.wallMinHeight + jumpHeight(BODY), piece.name);
      if (piece.move === "assist") assert.true(height > jumpHeight(BODY) + BODY.handReach && height <= jumpHeight(BODY) + BODY.handReach + BODY.assistReach, piece.name);
    }
  });
});
