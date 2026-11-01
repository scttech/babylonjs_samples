QUnit.module("Walker", () => {
  // A route that goes four along z, and then three along x: seven in all.
  const makeWalkRoute = () =>
    makeRoute([
      { x: 0, z: 0 },
      { x: 0, z: 4 },
      { x: 3, z: 4 },
    ]);

  QUnit.test("begins at the start, not done, with nothing walked", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);

    assert.strictEqual(walker.distance, 0);
    assert.strictEqual(walker.progress, 0);
    assert.false(walker.done);
  });

  QUnit.test("walks its speed times the time", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.update(1.5);

    assert.strictEqual(walker.distance, 3);
  });

  QUnit.test("many short steps are the same as one long one", (assert) => {
    const a = new Walker(makeWalkRoute(), 2);
    const b = new Walker(makeWalkRoute(), 2);
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    b.update(1);

    assert.true(Math.abs(a.distance - b.distance) < 1e-9);
  });

  QUnit.test("progress is the share of the route walked", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(3.5);

    assert.strictEqual(walker.progress, 0.5);
  });

  QUnit.test("stops at the end, and is done, and does not go on", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.update(100);

    assert.strictEqual(walker.distance, 7);
    assert.strictEqual(walker.progress, 1);
    assert.true(walker.done);
  });

  QUnit.test("is done at the end exactly, and not a moment before", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(6.99);
    assert.false(walker.done);
    walker.update(0.01);

    assert.true(walker.done);
  });

  QUnit.test("a speed scale makes it slower or faster, and can be changed in the middle", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.speedScale = 0.5;
    walker.update(2);
    walker.speedScale = 2;
    walker.update(1);

    assert.strictEqual(walker.distance, 2 + 4);
  });

  QUnit.test("a speed scale of nothing is standing still", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.speedScale = 0;
    walker.update(10);

    assert.strictEqual(walker.distance, 0);
  });

  QUnit.test("it can begin part of the way along", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1, 5);

    assert.strictEqual(walker.position().z, 4);
    assert.strictEqual(walker.position().x, 1);
  });

  QUnit.test("it says where it is, and which way it faces, as the route does", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(2);

    assert.deepEqual(walker.position(), pointAlong(walker.route, 2));
    assert.strictEqual(walker.position().yaw, 0);
    walker.update(3);
    assert.strictEqual(walker.position().yaw, Math.PI / 2);
  });

  QUnit.test("on a real route it gets to the end in the length over the speed", (assert) => {
    const route = routeFor(parseMap(MAPS[0]));
    const walker = new Walker(route, 2);
    let time = 0;
    while (!walker.done) {
      walker.update(1 / 60);
      time += 1 / 60;
    }

    assert.true(Math.abs(time - route.total / 2) < 0.05);
  });
});
