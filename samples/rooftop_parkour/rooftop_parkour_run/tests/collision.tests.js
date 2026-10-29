QUnit.module("World.supportAt", () => {
  const roof = { minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const step = { minX: 20, maxX: 22, minY: 0, maxY: 0.3, minZ: 0, maxZ: 2 };

  QUnit.test("with no boxes, it is the ground", (assert) => {
    assert.strictEqual(new World({ ground: () => -0.15 }).supportAt(3, 4, 0.25, 100), -0.15);
    assert.strictEqual(new World().supportAt(3, 4, 0.25, 100), 0);
  });

  QUnit.test("over a box, it is the top of the box", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(5, 5, 0.25, 100), 20);
  });

  QUnit.test("beside a box, it is the ground", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(15, 5, 0.25, 100), 0);
  });

  QUnit.test("a box whose top is above where the feet are is not under them", (assert) => {
    const world = new World({ boxes: [roof] });
    assert.strictEqual(world.supportAt(5, 5, 0.25, 10), 0);
    assert.strictEqual(world.supportAt(5, 5, 0.25, 20), 20);
  });

  QUnit.test("of several boxes at the same place, it is the highest that is not above", (assert) => {
    const low = { ...roof, maxY: 5 };
    const world = new World({ boxes: [roof, low] });
    assert.strictEqual(world.supportAt(5, 5, 0.25, 100), 20);
    assert.strictEqual(world.supportAt(5, 5, 0.25, 10), 5);
  });

  QUnit.test("a place a little past the edge is still held up, by as much as the reach", (assert) => {
    const world = new World({ boxes: [roof] });
    assert.strictEqual(world.supportAt(10.2, 5, 0.25, 100), 20);
    assert.strictEqual(world.supportAt(10.3, 5, 0.25, 100), 0);
  });

  QUnit.test("the ground can be higher than a box (a box sunk in it) and then it is the ground", (assert) => {
    const world = new World({ boxes: [step], ground: () => 1 });
    assert.strictEqual(world.supportAt(21, 1, 0.25, 100), 1);
  });

  QUnit.test("with a top of Infinity, it is the highest thing there is", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(5, 5, 0.25, Infinity), 20);
  });

  QUnit.test("the ground can change from place to place", (assert) => {
    const world = new World({ ground: (x) => (x > 0 ? 0 : -0.15) });
    assert.strictEqual(world.supportAt(-1, 0, 0.25, 10), -0.15);
    assert.strictEqual(world.supportAt(1, 0, 0.25, 10), 0);
  });
});

QUnit.module("World.wallsAt", () => {
  const tower = { name: "tower", minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const curb = { name: "curb", minX: 20, maxX: 22, minY: 0, maxY: 0.3, minZ: 0, maxZ: 2 };
  const bridge = { name: "bridge", minX: 30, maxX: 40, minY: 10, maxY: 12, minZ: 0, maxZ: 5 };
  const world = new World({ boxes: [tower, curb, bridge] });
  const names = (list) => list.map((box) => box.name);

  QUnit.test("a tall box is a wall to a body on the ground", (assert) => {
    assert.deepEqual(names(world.wallsAt(0, 1.8, 0.4)), ["tower"]);
  });

  QUnit.test("a box that is only a step high is not a wall: it is a step", (assert) => {
    assert.false(names(world.wallsAt(0, 1.8, 0.4)).includes("curb"));
    assert.true(names(world.wallsAt(0, 1.8, 0.2)).includes("curb"));
  });

  QUnit.test("a box that is all above the head is not a wall: it can be walked under", (assert) => {
    assert.false(names(world.wallsAt(0, 1.8, 0.4)).includes("bridge"));
    assert.true(names(world.wallsAt(9, 1.8, 0.4)).includes("bridge"));
  });

  QUnit.test("a body on the roof is not stopped by the building it is standing on", (assert) => {
    assert.deepEqual(names(world.wallsAt(20, 1.8, 0.4)), []);
  });

  QUnit.test("a body a little under the roof is a wall to it again", (assert) => {
    assert.deepEqual(names(world.wallsAt(19.5, 1.8, 0.4)), ["tower"]);
  });
});

QUnit.module("World.push", () => {
  const tower = { minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const world = new World({ boxes: [tower] });

  QUnit.test("a body that touches no wall is where it was", (assert) => {
    assert.deepEqual(world.push(-5, 5, 0.45, 0, 1.8, 0.4), { x: -5, z: 5 });
  });

  QUnit.test("a body in a wall is pushed out of it, the way it came", (assert) => {
    const out = world.push(-0.2, 5, 0.45, 0, 1.8, 0.4);
    assert.true(Math.abs(out.x - -0.45) < 1e-9);
    assert.strictEqual(out.z, 5);
  });

  QUnit.test("a body on the roof goes where it likes", (assert) => {
    assert.deepEqual(world.push(5, 5, 0.45, 20, 1.8, 0.4), { x: 5, z: 5 });
  });

  QUnit.test("a body is pushed out of two walls, one after the other", (assert) => {
    const two = new World({ boxes: [tower, { minX: -4, maxX: -1.2, minY: 0, maxY: 20, minZ: 0, maxZ: 10 }] });
    const out = two.push(-0.9, 5, 0.45, 0, 1.8, 0.4);
    // squeezed between two walls with 0.2 to spare for a body 0.9 wide, it ends in one of them, and not in neither: the second pass settles it
    const nearest = (box) => Math.hypot(out.x - Math.min(box.maxX, Math.max(box.minX, out.x)), out.z - Math.min(box.maxZ, Math.max(box.minZ, out.z)));
    assert.true(Math.min(nearest(two.boxes[0]), nearest(two.boxes[1])) > 0.45 - 1e-9);
  });
});
