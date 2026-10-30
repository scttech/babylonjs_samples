QUnit.module("moveInput", () => {
  QUnit.test("no keys ask for nothing", (assert) => {
    assert.deepEqual(moveInput(new Set()), { forward: 0, right: 0, sprint: false, jump: false });
  });

  QUnit.test("W and the up arrow go forward, S and the down arrow go back", (assert) => {
    assert.strictEqual(moveInput(new Set(["KeyW"])).forward, 1);
    assert.strictEqual(moveInput(new Set(["ArrowUp"])).forward, 1);
    assert.strictEqual(moveInput(new Set(["KeyS"])).forward, -1);
    assert.strictEqual(moveInput(new Set(["ArrowDown"])).forward, -1);
  });

  QUnit.test("D and the right arrow go right, A and the left arrow go left", (assert) => {
    assert.strictEqual(moveInput(new Set(["KeyD"])).right, 1);
    assert.strictEqual(moveInput(new Set(["ArrowRight"])).right, 1);
    assert.strictEqual(moveInput(new Set(["KeyA"])).right, -1);
    assert.strictEqual(moveInput(new Set(["ArrowLeft"])).right, -1);
  });

  QUnit.test("keys that cancel cancel, and two keys for the same thing count once", (assert) => {
    assert.strictEqual(moveInput(new Set(["KeyW", "KeyS"])).forward, 0);
    assert.strictEqual(moveInput(new Set(["KeyW", "ArrowUp"])).forward, 1);
  });

  QUnit.test("either shift key sprints", (assert) => {
    assert.true(moveInput(new Set(["ShiftLeft"])).sprint);
    assert.true(moveInput(new Set(["ShiftRight"])).sprint);
    assert.false(moveInput(new Set(["KeyW"])).sprint);
  });

  QUnit.test("the space bar is a jump", (assert) => {
    assert.true(moveInput(new Set(["Space"])).jump);
    assert.false(moveInput(new Set(["KeyW"])).jump);
  });

  QUnit.test("ALL_MOVE_KEYS has every key the scout uses, and no others", (assert) => {
    for (const codes of Object.values(MOVE_KEYS)) for (const code of codes) assert.true(ALL_MOVE_KEYS.has(code), code);
    assert.false(ALL_MOVE_KEYS.has("KeyP"));
  });
});

QUnit.module("moveDirection", () => {
  const near = (assert, actual, expected) => {
    assert.true(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.z - expected.z) < 1e-9, `${actual.x}, ${actual.z}`);
  };

  QUnit.test("nowhere to go with no keys", (assert) => {
    assert.strictEqual(moveDirection({ forward: 0, right: 0 }, 1), null);
  });

  QUnit.test("forward is the way the camera looks", (assert) => {
    near(assert, moveDirection({ forward: 1, right: 0 }, 0), { x: 0, z: 1 });
    near(assert, moveDirection({ forward: 1, right: 0 }, Math.PI / 2), { x: 1, z: 0 });
  });

  QUnit.test("right is to the right of that, and back is the opposite", (assert) => {
    near(assert, moveDirection({ forward: 0, right: 1 }, 0), { x: 1, z: 0 });
    near(assert, moveDirection({ forward: 0, right: 1 }, Math.PI / 2), { x: 0, z: -1 });
    near(assert, moveDirection({ forward: -1, right: 0 }, 0), { x: 0, z: -1 });
  });

  QUnit.test("going on a diagonal is no faster: the direction is a unit vector", (assert) => {
    const direction = moveDirection({ forward: 1, right: 1 }, 0.7);
    assert.true(Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-9);
  });
});

QUnit.module("turnToward", () => {
  QUnit.test("turns by at most a step, the short way", (assert) => {
    assert.true(Math.abs(turnToward(0, 1, 0.25) - 0.25) < 1e-9);
    assert.true(Math.abs(turnToward(0, -1, 0.25) + 0.25) < 1e-9);
  });

  QUnit.test("arrives exactly, and doesn't overshoot", (assert) => {
    assert.strictEqual(turnToward(0, 0.1, 0.25), 0.1);
    assert.strictEqual(turnToward(1, 1, 0.25), 1);
  });

  QUnit.test("goes round the short way past the edge of the range", (assert) => {
    // from 3 to -3 the short way is up through PI (a turn of 0.28), not down through 0 (a turn of 6)
    const turned = turnToward(3, -3, 0.1);
    assert.true(Math.abs(wrapAngle(turned - 3) - 0.1) < 1e-9);
  });
});

QUnit.module("pushOutOfBox", () => {
  const box = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

  QUnit.test("a circle that is clear of the box isn't moved", (assert) => {
    assert.deepEqual(pushOutOfBox(15, 5, 1, box), { x: 15, z: 5 });
  });

  QUnit.test("a circle that touches a face is pushed straight out", (assert) => {
    const out = pushOutOfBox(10.2, 5, 1, box);
    assert.deepEqual([out.x, out.z], [11, 5]);
  });

  QUnit.test("a circle that touches a corner is pushed away from the corner", (assert) => {
    const out = pushOutOfBox(10.3, 10.3, 1, box);
    assert.true(Math.abs(Math.hypot(out.x - 10, out.z - 10) - 1) < 1e-9);
    assert.true(out.x > 10 && out.z > 10);
  });

  QUnit.test("a circle whose middle is inside the box leaves by the nearest side", (assert) => {
    assert.deepEqual(pushOutOfBox(1, 5, 1, box), { x: -1, z: 5 });
    assert.deepEqual(pushOutOfBox(9, 5, 1, box), { x: 11, z: 5 });
    assert.deepEqual(pushOutOfBox(5, 9.5, 1, box), { x: 5, z: 11 });
  });

  QUnit.test("it ends up clear of the box, wherever it started", (assert) => {
    for (let x = -3; x <= 13; x += 0.7) {
      for (let z = -3; z <= 13; z += 0.7) {
        const out = pushOutOfBox(x, z, 0.5, box);
        const nearest = { x: Math.min(box.maxX, Math.max(box.minX, out.x)), z: Math.min(box.maxZ, Math.max(box.minZ, out.z)) };
        if (Math.hypot(out.x - nearest.x, out.z - nearest.z) < 0.5 - 1e-9) assert.true(false, `${x}, ${z} -> ${out.x}, ${out.z}`);
      }
    }
    assert.true(true);
  });
});

QUnit.module("Scout", () => {
  const north = { x: 0, z: 1 };

  QUnit.test("stands still with nowhere to go", (assert) => {
    const scout = new Scout({ x: 3, z: 4 });
    scout.update(null, false, 1);
    assert.deepEqual([scout.x, scout.z, scout.speed], [3, 4, 0]);
  });

  QUnit.test("gets up to speed gradually, and not past it", (assert) => {
    const scout = new Scout({});
    scout.update(north, false, 0.05);
    assert.true(scout.speed > 0 && scout.speed < SCOUT.jogSpeed);
    for (let i = 0; i < 100; i++) scout.update(north, false, 0.05);
    assert.strictEqual(scout.speed, SCOUT.jogSpeed);
  });

  QUnit.test("sprints faster than it jogs", (assert) => {
    const scout = new Scout({});
    for (let i = 0; i < 100; i++) scout.update(north, true, 0.05);
    assert.strictEqual(scout.speed, SCOUT.sprintSpeed);
  });

  QUnit.test("slows down and stops when the keys are let go", (assert) => {
    const scout = new Scout({});
    for (let i = 0; i < 100; i++) scout.update(north, false, 0.05);
    scout.update(null, false, 0.05);
    assert.true(scout.speed < SCOUT.jogSpeed);
    for (let i = 0; i < 100; i++) scout.update(null, false, 0.05);
    assert.strictEqual(scout.speed, 0);
  });

  QUnit.test("goes the way it faces, and turns to face the way it is asked to go", (assert) => {
    const scout = new Scout({});
    for (let i = 0; i < 200; i++) scout.update({ x: 1, z: 0 }, false, 0.02);
    assert.true(Math.abs(scout.heading - Math.PI / 2) < 1e-9);
    assert.true(scout.x > 5);
    assert.true(Math.abs(scout.z) < 2);
  });

  QUnit.test("a turn is a curve: the body doesn't slide sideways", (assert) => {
    const scout = new Scout({ heading: 0 });
    scout.speed = SCOUT.jogSpeed;
    scout.update({ x: 1, z: 0 }, false, 0.02);
    assert.true(scout.z > 0);
    assert.true(scout.x >= 0 && scout.x < scout.z);
  });

  QUnit.test("can't walk into a wall", (assert) => {
    const wall = { minX: -5, maxX: 5, minZ: 3, maxZ: 8 };
    const scout = new Scout({ x: 0, z: 0, boxes: [wall] });
    for (let i = 0; i < 300; i++) scout.update(north, true, 0.02);
    assert.true(scout.z <= wall.minZ - SCOUT.radius + 1e-9);
    assert.true(scout.z > 2);
  });

  QUnit.test("can't leave the world", (assert) => {
    const scout = new Scout({ bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } });
    for (let i = 0; i < 300; i++) scout.update(north, true, 0.02);
    assert.strictEqual(scout.z, 10);
  });

  QUnit.test("its numbers can be changed without changing the defaults", (assert) => {
    const before = SCOUT.jogSpeed;
    const a = new Scout({});
    const b = new Scout({});
    a.options.jogSpeed = 99;
    assert.strictEqual(b.options.jogSpeed, before);
    assert.strictEqual(SCOUT.jogSpeed, before);
  });

  QUnit.test("its feet follow the ground: down onto a road, and up onto a sidewalk", (assert) => {
    const scout = new Scout({ x: 0, z: 0, ground: (x, z) => (z > 5 ? 0 : -0.15) });
    assert.strictEqual(scout.y, -0.15);
    scout.z = 10;
    for (let i = 0; i < 20; i++) scout.update(null, false, 0.05);
    assert.true(Math.abs(scout.y) < 1e-6);
  });

  QUnit.test("a step in the ground is followed quickly but not at once", (assert) => {
    const scout = new Scout({ x: 0, z: 0, ground: () => 1 });
    scout.y = 0;
    scout.update(null, false, 0.01);
    assert.true(scout.y > 0 && scout.y < 1);
  });

  QUnit.test("with no ground function it stands at 0", (assert) => {
    const scout = new Scout({});
    scout.update(null, false, 0.1);
    assert.strictEqual(scout.y, 0);
  });

  QUnit.test("reset puts it back where it started, stopped", (assert) => {
    const scout = new Scout({ x: 2, z: -9, heading: 0.5 });
    for (let i = 0; i < 50; i++) scout.update({ x: 1, z: 0 }, true, 0.02);
    scout.reset();
    assert.deepEqual([scout.x, scout.z, scout.heading, scout.speed], [2, -9, 0.5, 0]);
  });
});

QUnit.module("typesText", () => {
  QUnit.test("is true for a key typed into a box of text, and false for anything else", (assert) => {
    assert.true(typesText({ target: { tagName: "INPUT" } }));
    assert.true(typesText({ target: { tagName: "TEXTAREA" } }));
    assert.false(typesText({ target: { tagName: "CANVAS" } }));
    assert.false(typesText({ target: null }));
  });
});
