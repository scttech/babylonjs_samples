QUnit.module("StreetStream", () => {
  const assertClose = (assert, actual, expected, tolerance, message) =>
    assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

  const isBuilding = (p) => p.piece.includes("building");
  const withoutId = ({ id, ...rest }) => rest;
  const byPosition = (a, b) => a.z - b.z || a.x - b.x || a.piece.localeCompare(b.piece);

  // Runs a runner from z = 0 to `to`, `step` at a time, and returns every piece ever added.
  const runTo = (stream, to, step) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...stream.update(z).added);
    return everything;
  };

  QUnit.test("nothing exists before the first update", (assert) => {
    assert.strictEqual(new StreetStream().active.size, 0);
  });

  QUnit.test("the first update builds the street, one row behind the start and a good way ahead", (assert) => {
    const { added, removed } = new StreetStream({ ahead: 100 }).update(0);
    const roads = added.filter((p) => p.piece === "roads/road_straight");

    assert.strictEqual(removed.length, 0);
    assert.strictEqual(roads[0].z, -TILE, "starts a row behind");
    assert.true(roads[roads.length - 1].endZ >= 100, "reaches the distance ahead");
  });

  QUnit.test("builds buildings along both sides, out as far as the road", (assert) => {
    const { added } = new StreetStream({ ahead: 100 }).update(0);

    for (const side of [-1, 1]) {
      const buildings = added.filter((p) => isBuilding(p) && Math.sign(p.x) === side);
      assert.true(buildings.length > 3, `side ${side} has buildings`);
      assert.true(buildings[buildings.length - 1].endZ >= 100, `side ${side} reaches the distance ahead`);
    }
  });

  QUnit.test("gives every piece its own id, counting up", (assert) => {
    const { added } = new StreetStream().update(0);

    assert.strictEqual(new Set(added.map((p) => p.id)).size, added.length);
    assert.strictEqual(Math.min(...added.map((p) => p.id)), 0);
    assert.strictEqual(Math.max(...added.map((p) => p.id)), added.length - 1);
  });

  QUnit.test("keeps the pieces that exist in `active`, by id", (assert) => {
    const stream = new StreetStream();

    const { added } = stream.update(0);

    assert.strictEqual(stream.active.size, added.length);
    for (const piece of added) assert.strictEqual(stream.active.get(piece.id), piece);
  });

  QUnit.test("updating again at the same place changes nothing", (assert) => {
    const stream = new StreetStream();
    stream.update(50);

    const { added, removed } = stream.update(50);

    assert.strictEqual(added.length, 0);
    assert.strictEqual(removed.length, 0);
  });

  QUnit.test("moving forward builds more street ahead", (assert) => {
    const stream = new StreetStream({ ahead: 100 });
    stream.update(0);

    const { added } = stream.update(50);

    assert.true(added.length > 0);
    for (const piece of added) assert.true(piece.endZ > 100, `${piece.piece} is beyond what was already built`);
  });

  QUnit.test("pieces far behind the runner are removed, and only those", (assert) => {
    const stream = new StreetStream({ ahead: 100, behind: 30 });
    stream.update(0);

    const { removed } = stream.update(200);

    assert.true(removed.length > 0);
    for (const piece of removed) assert.true(piece.endZ < 170, `${piece.piece} ended at ${piece.endZ}, behind the runner`);
    for (const piece of stream.active.values()) assert.true(piece.endZ >= 170, `${piece.piece} is still wanted`);
  });

  QUnit.test("a removed piece is gone from `active`", (assert) => {
    const stream = new StreetStream({ ahead: 100, behind: 30 });
    stream.update(0);

    const { removed } = stream.update(200);

    for (const piece of removed) assert.false(stream.active.has(piece.id));
  });

  QUnit.test("nothing is removed while the runner is still near the start", (assert) => {
    const stream = new StreetStream();

    assert.strictEqual(stream.update(0).removed.length, 0);
    assert.strictEqual(stream.update(5).removed.length, 0);
  });

  QUnit.test("road tiles follow each other with no gaps, however far it runs", (assert) => {
    const roads = runTo(new StreetStream(), 500, 7).filter((p) => p.piece === "roads/road_straight");

    for (let i = 1; i < roads.length; i++) assertClose(assert, roads[i].z - roads[i - 1].z, TILE, 1e-9, `road ${i}`);
  });

  QUnit.test("buildings follow each other with just a gap between, on each side, however far it runs", (assert) => {
    const everything = runTo(new StreetStream(), 500, 7);

    for (const side of [-1, 1]) {
      const row = everything.filter((p) => isBuilding(p) && Math.sign(p.x) === side);
      for (let i = 1; i < row.length; i++) {
        const width = BUILDINGS.find((b) => b.piece === row[i].piece).width * WORLD_SCALE;
        assertClose(assert, row[i].z - width / 2 - row[i - 1].endZ, BUILDING_GAP * WORLD_SCALE, 1e-9, `side ${side}, building ${i}`);
      }
    }
  });

  QUnit.test("the same seed gives the same street, however the updates are spaced out", (assert) => {
    const fine = runTo(new StreetStream({ seed: 5 }), 400, 1).map(withoutId).sort(byPosition);
    const coarse = runTo(new StreetStream({ seed: 5 }), 400, 40).map(withoutId).sort(byPosition);

    assert.deepEqual(fine, coarse);
  });

  QUnit.test("a different seed gives different buildings", (assert) => {
    const a = runTo(new StreetStream({ seed: 1 }), 100, 10).filter(isBuilding).map((p) => p.piece);
    const b = runTo(new StreetStream({ seed: 2 }), 100, 10).filter(isBuilding).map((p) => p.piece);

    assert.notDeepEqual(a, b);
  });

  QUnit.test("the two sides don't copy each other", (assert) => {
    const buildings = runTo(new StreetStream({ seed: 4 }), 300, 10).filter(isBuilding);
    const left = buildings.filter((p) => p.x < 0).map((p) => p.piece);
    const right = buildings.filter((p) => p.x > 0).map((p) => p.piece);

    assert.notDeepEqual(left.slice(0, 10), right.slice(0, 10));
  });

  QUnit.test("only a bounded number of pieces exist at once, however far the runner goes", (assert) => {
    const stream = new StreetStream();
    stream.update(0);
    const atStart = stream.active.size;
    let most = atStart;

    for (let z = 0; z <= 20000; z += 5) {
      stream.update(z);
      most = Math.max(most, stream.active.size);
    }

    assert.true(most < atStart * 1.5, `${most} pieces at most, against ${atStart} to start with`);
  });

  QUnit.test("the options set how far ahead and behind the street is kept", (assert) => {
    const small = new StreetStream({ ahead: 40, behind: 10 });
    const big = new StreetStream({ ahead: 200, behind: 60 });

    assert.true(small.update(0).added.length < big.update(0).added.length);
  });

  QUnit.test("reset() takes every piece away, and returns them", (assert) => {
    const stream = new StreetStream();
    const { added } = stream.update(0);

    const removed = stream.reset();

    assert.strictEqual(removed.length, added.length);
    assert.strictEqual(stream.active.size, 0);
  });

  QUnit.test("after reset() the next update builds the very same street again", (assert) => {
    const stream = new StreetStream({ seed: 9 });
    const first = stream.update(0).added;
    stream.update(300);

    stream.reset();
    const again = stream.update(0).added;

    assert.deepEqual(again, first, "same pieces, same ids");
  });

  QUnit.test("reset() with nothing built returns nothing", (assert) => {
    assert.deepEqual(new StreetStream().reset(), []);
  });
});
