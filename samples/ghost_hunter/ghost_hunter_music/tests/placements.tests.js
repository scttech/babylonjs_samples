QUnit.module("Placements", () => {
  const floor = (x, z) => ({ point: [x, 0, z], normal: [0, 1, 0] });

  QUnit.test("marks a surface, and gives the placement an id", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(1, 2));
    assert.deepEqual(item.point, [1, 0, 2]);
    assert.strictEqual(item.kind, "marker");
    assert.false(item.anchored);
    assert.strictEqual(placements.items.length, 1);
    assert.strictEqual(placements.add(floor(5, 5)).id, item.id + 1);
  });

  QUnit.test("a place next to another is the same place", (assert) => {
    const placements = new Placements();
    placements.add(floor(0, 0));
    assert.strictEqual(placements.add(floor(0.2, 0.1)), null);
    assert.true(placements.add(floor(0.6, 0)) !== null);
    assert.strictEqual(placements.items.length, 2);
  });

  QUnit.test("a placement keeps its own copy of the surface", (assert) => {
    const placements = new Placements();
    const surface = floor(1, 1);
    const item = placements.add(surface);
    surface.point[0] = 99;
    assert.strictEqual(item.point[0], 1);
  });

  QUnit.test("past the most, the oldest goes", (assert) => {
    const placements = new Placements({ max: 3, minSeparation: 0.5 });
    const first = placements.add(floor(0, 0));
    for (let i = 1; i <= 3; i++) placements.add(floor(i * 2, 0));
    assert.strictEqual(placements.items.length, 3);
    assert.strictEqual(placements.get(first.id), null);
  });

  QUnit.test("it tells of every change, the oldest going before the new one coming", (assert) => {
    const placements = new Placements({ max: 1, minSeparation: 0.5 });
    const told = [];
    placements.onChange(({ type, item }) => told.push(`${type} ${item.id}`));
    placements.add(floor(0, 0));
    placements.add(floor(3, 0));
    placements.clear();
    assert.deepEqual(told, ["added 1", "removed 1", "added 2", "removed 2"]);
  });

  QUnit.test("removes one by its id, and says whether it was there", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(0, 0));
    assert.true(placements.remove(item.id));
    assert.false(placements.remove(item.id));
  });

  QUnit.test("an anchor says where the phone has the place now", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(0, 0));
    assert.true(placements.anchor(item.id, [0.05, 0, 0.02]));
    assert.true(item.anchored);
    assert.deepEqual(item.point, [0.05, 0, 0.02]);
    assert.false(placements.anchor(999));
  });

  QUnit.test("finds the nearest, on the floor plan", (assert) => {
    const placements = new Placements();
    assert.strictEqual(placements.nearest([0, 0, 0]), null);
    placements.add(floor(0, 3));
    const far = placements.add(floor(0, 10));
    const near = placements.nearest([0, 5, 9]); // the height does not count
    assert.strictEqual(near.item, far);
    assert.strictEqual(near.distance, 1);
  });

  QUnit.test("the table of the game is sensible", (assert) => {
    assert.true(PLACEMENT.max >= 1);
    assert.true(PLACEMENT.minSeparation > 0);
  });
});
