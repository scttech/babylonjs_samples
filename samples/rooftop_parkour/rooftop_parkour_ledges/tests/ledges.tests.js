// A wall to catch: a box whose south side is the plane z = 0, from x = 0 to 10, with its top 3 metres up. A body south of it, facing north (+z),
// is facing the wall. (The ledge on that side runs from x = 10 to x = 0, with its outside to the south, -z.)
const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 3, minZ: 0, maxZ: 10 };
const worldOf = (...boxes) => new World({ boxes });
const OPTIONS = { ...SCOUT, ...BODY };
// A body 0.5 metres from the wall (edge to wall is 0.05), a metre off the ground, facing it.
const bodyAt = (changes = {}) => ({ x: 5, y: 1, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });

QUnit.module("ledgesOf", () => {
  QUnit.test("a box has four ledges, one for each side, at the height of its top", (assert) => {
    const ledges = ledgesOf([WALL]);
    assert.strictEqual(ledges.length, 4);
    assert.true(ledges.every((ledge) => ledge.y === 3 && ledge.name === "wall"));
  });

  QUnit.test("each ledge has a unit way out from the wall, and a unit way along it, the two at right angles", (assert) => {
    for (const ledge of ledgesOf([WALL])) {
      assert.true(Math.abs(Math.hypot(ledge.nx, ledge.nz) - 1) < 1e-9);
      assert.true(Math.abs(Math.hypot(ledge.tx, ledge.tz) - 1) < 1e-9);
      assert.true(Math.abs(ledge.nx * ledge.tx + ledge.nz * ledge.tz) < 1e-9);
    }
  });

  QUnit.test("the way out points away from the middle of the box, and each ledge is along the side of the box it is on", (assert) => {
    const middle = { x: 5, z: 5 };
    for (const ledge of ledgesOf([WALL])) {
      const toMiddle = (middle.x - ledge.ax) * ledge.nx + (middle.z - ledge.az) * ledge.nz;
      assert.true(toMiddle < 0, "the middle is behind the wall");
      assert.strictEqual(ledge.length, 10);
      assert.true(Math.abs(ledge.ax + ledge.tx * ledge.length - ledge.bx) < 1e-9);
    }
  });

  QUnit.test("a ledge has the lean of its box, and none if the box has none", (assert) => {
    assert.true(ledgesOf([WALL]).every((ledge) => ledge.lean === 0));
    assert.true(ledgesOf([{ ...WALL, lean: 0.4 }]).every((ledge) => ledge.lean === 0.4));
  });

  QUnit.test("a box that is not square has ledges of two lengths", (assert) => {
    const lengths = ledgesOf([{ ...WALL, maxX: 4 }]).map((ledge) => ledge.length).sort((a, b) => a - b);
    assert.deepEqual(lengths, [4, 4, 10, 10]);
  });

  QUnit.test("the ledges of the district are all above the ground and all have a length", (assert) => {
    const ledges = ledgesOf([...buildingBoxes(), ...ledgeBoxes()]);
    assert.strictEqual(ledges.length, (buildingBoxes().length + ledgeBoxes().length) * 4);
    assert.true(ledges.every((ledge) => ledge.y > 10 && ledge.length > 3));
  });
});

QUnit.module("clampAlong", () => {
  const ledge = ledgesOf([WALL])[0];

  QUnit.test("a place along a ledge is kept off its ends, by the margin", (assert) => {
    assert.strictEqual(clampAlong(ledge, -3, OPTIONS), OPTIONS.ledgeMargin);
    assert.strictEqual(clampAlong(ledge, 4, OPTIONS), 4);
    assert.strictEqual(clampAlong(ledge, 30, OPTIONS), 10 - OPTIONS.ledgeMargin);
  });

  QUnit.test("a ledge shorter than twice the margin is hung from at its middle", (assert) => {
    assert.strictEqual(clampAlong({ length: 0.8 }, 0.1, OPTIONS), 0.4);
  });
});

QUnit.module("hangSpot and topSpot", () => {
  const ledge = ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("a body hangs against the wall, its feet under the ledge by the drop, facing the wall", (assert) => {
    const spot = hangSpot(ledge, 5, OPTIONS);
    assert.true(Math.abs(spot.z - -(OPTIONS.radius + OPTIONS.hangOffset)) < 1e-9);
    assert.strictEqual(spot.y, 3 - OPTIONS.hangDrop);
    assert.strictEqual(spot.heading, 0);
    assert.true(Math.abs(spot.x - 5) < 1e-9, "5 metres along the ledge from where it starts, which is the east end");
  });

  QUnit.test("the place along the ledge is the place along it, whichever way the ledge runs", (assert) => {
    for (const side of ledgesOf([WALL])) {
      const a = hangSpot(side, 2, OPTIONS);
      const b = hangSpot(side, 6, OPTIONS);
      assert.true(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - 4) < 1e-9);
    }
  });

  QUnit.test("the body is turned to face the wall, on all four sides", (assert) => {
    for (const side of ledgesOf([WALL])) {
      const spot = hangSpot(side, 5, OPTIONS);
      assert.true(Math.abs(Math.sin(spot.heading) + side.nx) < 1e-9 && Math.abs(Math.cos(spot.heading) + side.nz) < 1e-9);
    }
  });

  QUnit.test("a body hangs as far further out as the wall leans, so that it is not in the wall", (assert) => {
    const plain = hangSpot(ledge, 5, OPTIONS);
    const leaning = hangSpot({ ...ledge, lean: 0.4 }, 5, OPTIONS);
    assert.true(Math.abs(plain.z - leaning.z - 0.4) < 1e-9, "further south, where south is out from this wall");
    assert.strictEqual(leaning.y, plain.y);
  });

  QUnit.test("it stands on top, in from the edge, at the height of the ledge", (assert) => {
    const spot = topSpot(ledge, 5, OPTIONS);
    assert.true(spot.z > 0, "over the box, not beside it");
    assert.true(Math.abs(spot.z - (OPTIONS.radius + OPTIONS.topOffset)) < 1e-9);
    assert.strictEqual(spot.y, 3);
  });
});

QUnit.module("canHang and canClimb", () => {
  const ledge = ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("with nothing else about, a body can hang from a ledge and climb it", (assert) => {
    const world = worldOf(WALL);
    assert.true(canHang(world, ledge, 5, OPTIONS));
    assert.true(canClimb(world, ledge, 5, OPTIONS));
  });

  QUnit.test("it cannot hang where another box is in the way", (assert) => {
    const other = { name: "other", minX: 4, maxX: 6, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    const world = worldOf(WALL, other);
    assert.false(canHang(world, ledge, 5, OPTIONS));
    assert.true(canHang(world, ledge, 8, OPTIONS));
  });

  QUnit.test("it cannot climb where there is a wall on top, or nothing to stand on", (assert) => {
    const above = { name: "above", minX: 0, maxX: 10, minY: 0, maxY: 9, minZ: 0.5, maxZ: 10 };
    assert.false(canClimb(worldOf(WALL, above), ledge, 5, OPTIONS));
    assert.false(canClimb(worldOf(WALL), { ...ledge, y: 5 }, 5, OPTIONS), "a ledge in the air has nothing to stand on");
  });
});

QUnit.module("findLedge", () => {
  const ledges = ledgesOf([WALL]);
  const world = worldOf(WALL);
  const find = (changes, options = OPTIONS, from = ledges) => findLedge(from, bodyAt(changes), world, options);

  QUnit.test("a body in reach of the ledge, facing it, catches it, where it is along it", (assert) => {
    const found = find({});
    assert.strictEqual(found.ledge.nz, -1);
    assert.true(Math.abs(found.u - 5) < 1e-9);
  });

  QUnit.test("it must be in reach: not too low (at the waist), and not too high", (assert) => {
    assert.strictEqual(find({ y: 2.5 }), null, "the ledge is half a metre up from the feet");
    assert.notStrictEqual(find({ y: 1.2 }), null);
    assert.strictEqual(find({ y: 0.5 }), null, "the ledge is two and a half metres up");
    assert.notStrictEqual(find({ y: 0.9 }), null);
    assert.strictEqual(find({ y: 0 }), null, "three metres up");
  });

  QUnit.test("a longer reach is a ledge that is higher", (assert) => {
    assert.strictEqual(find({ y: 0 }), null);
    assert.notStrictEqual(find({ y: 0 }, { ...OPTIONS, handReach: 3.1 }), null);
  });

  QUnit.test("it must face the wall, to within the angle", (assert) => {
    assert.strictEqual(find({ heading: Math.PI }), null, "facing away");
    assert.strictEqual(find({ heading: Math.PI / 2 }), null, "facing along it");
    assert.notStrictEqual(find({ heading: 0.5 }), null);
    assert.strictEqual(find({ heading: 1.3 }), null);
  });

  QUnit.test("it must be near the wall: close enough for the hands", (assert) => {
    const near = OPTIONS.radius + OPTIONS.grabDistance;
    assert.notStrictEqual(find({ z: -near + 0.01 }), null);
    assert.strictEqual(find({ z: -near - 0.1 }), null);
  });

  QUnit.test("it must be beside some of the ledge: past its end there is no ledge", (assert) => {
    assert.strictEqual(find({ x: -0.5 }), null);
    assert.strictEqual(find({ x: 10.5 }), null);
    assert.notStrictEqual(find({ x: 0.2 }), null);
  });

  QUnit.test("it takes the place along the ledge that keeps it off the end", (assert) => {
    const found = find({ x: 0.2 });
    assert.true(found.u >= OPTIONS.ledgeMargin - 1e-9 && found.u <= 10 - OPTIONS.ledgeMargin + 1e-9);
  });

  QUnit.test("it does not catch a ledge it can't hang from, or can't climb", (assert) => {
    const other = { name: "other", minX: 3, maxX: 7, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    assert.strictEqual(findLedge(ledgesOf([WALL, other]), bodyAt({ x: 5 }), worldOf(WALL, other), OPTIONS), null);
  });

  QUnit.test("of two ledges it takes the nearer", (assert) => {
    const behind = { name: "behind", minX: -20, maxX: -5, minY: 0, maxY: 3, minZ: -20, maxZ: -10 };
    const found = findLedge(ledgesOf([WALL, behind]), bodyAt(), worldOf(WALL, behind), OPTIONS);
    assert.strictEqual(found.ledge.name, "wall");
  });

  QUnit.test("with no ledges, there is nothing to catch", (assert) => {
    assert.strictEqual(find({}, OPTIONS, []), null);
  });
});

QUnit.module("findDrop", () => {
  const ledges = ledgesOf([WALL]);
  const world = worldOf(WALL);
  // A body on top of the wall (3 metres up), 0.5 metres in from its south edge.
  const standing = (changes = {}) => ({ x: 5, y: 3, z: 0.5, heading: 0, ...changes });
  const find = (changes, options = OPTIONS) => findDrop(ledges, standing(changes), world, options);

  QUnit.test("a body on a roof near its edge could lower itself over it, onto the ledge there, wherever it faces", (assert) => {
    const found = find({});
    assert.strictEqual(found.ledge.nz, -1);
    assert.true(Math.abs(found.u - 5) < 1e-9);
    assert.notStrictEqual(find({ heading: Math.PI }), null);
  });

  QUnit.test("it must be near the edge: within the drop reach of it", (assert) => {
    assert.notStrictEqual(find({ z: OPTIONS.dropReach - 0.05 }), null);
    assert.strictEqual(find({ z: OPTIONS.dropReach + 0.5 }), null);
    assert.strictEqual(find({ z: 5 }), null, "the middle of the roof is not near any edge");
  });

  QUnit.test("it must be standing at the top of the ledge: not on a lower roof, and not in the air above it", (assert) => {
    assert.strictEqual(find({ y: 1 }), null);
    assert.strictEqual(find({ y: 3 + OPTIONS.stepHeight + 0.2 }), null);
    assert.notStrictEqual(find({ y: 3.2 }), null, "on the raised edge of the roof, a little above");
  });

  QUnit.test("it must be over the roof, and not out beyond its edge", (assert) => {
    assert.strictEqual(find({ z: -1.5 }), null);
  });

  QUnit.test("it must be beside some of the ledge, and there must be room to hang", (assert) => {
    assert.strictEqual(find({ x: -1 }), null);
    const post = { name: "post", minX: 4, maxX: 6, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    assert.strictEqual(findDrop(ledgesOf([WALL, post]), standing({ x: 5 }), worldOf(WALL, post), OPTIONS), null);
  });

  QUnit.test("of two edges it takes the nearer", (assert) => {
    const corner = findDrop(ledges, standing({ x: 9.7, z: 0.9 }), world, OPTIONS);
    assert.strictEqual(corner.ledge.nx, 1, "the east edge is 0.3 metres away, and the south one 0.9");
    assert.strictEqual(find({ x: 5.2, z: 0.3 }).ledge.nz, -1);
  });
});
