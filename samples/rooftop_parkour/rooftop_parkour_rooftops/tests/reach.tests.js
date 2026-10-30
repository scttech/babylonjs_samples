QUnit.module("approach", () => {
  const a = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

  QUnit.test("two roofs side by side are as far apart as the gap, along x, and the line goes from the one to the other", (assert) => {
    const line = approach(a, { minX: 14, maxX: 20, minZ: 2, maxZ: 8 });
    assert.strictEqual(line.distance, 4);
    assert.deepEqual([line.dx, line.dz], [1, 0]);
    assert.strictEqual(line.from.x, 10);
    assert.strictEqual(line.to.x, 14);
  });

  QUnit.test("it is the same the other way, turned round", (assert) => {
    const line = approach({ minX: 14, maxX: 20, minZ: 2, maxZ: 8 }, a);
    assert.strictEqual(line.distance, 4);
    assert.deepEqual([line.dx, line.dz], [-1, 0]);
  });

  QUnit.test("along z, too", (assert) => {
    const line = approach(a, { minX: 3, maxX: 6, minZ: -7, maxZ: -3 });
    assert.strictEqual(line.distance, 3);
    assert.deepEqual([line.dx, line.dz], [0, -1]);
  });

  QUnit.test("at a corner, the line goes from corner to corner", (assert) => {
    const line = approach(a, { minX: 13, maxX: 20, minZ: 14, maxZ: 20 });
    assert.strictEqual(line.distance, 5);
    assert.true(Math.abs(line.dx - 0.6) < 1e-9 && Math.abs(line.dz - 0.8) < 1e-9);
  });

  QUnit.test("roofs that touch are no distance apart", (assert) => {
    assert.strictEqual(approach(a, { minX: 10, maxX: 12, minZ: 0, maxZ: 10 }).distance, 0);
  });
});

QUnit.module("isOver and steerTo", () => {
  const box = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };

  QUnit.test("a point is over a box if it is inside, with a margin if there is one", (assert) => {
    assert.true(isOver(box, 2, 2));
    assert.false(isOver(box, 4.1, 2));
    assert.true(isOver(box, 4.1, 2, 0.2));
    assert.false(isOver(box, 0.5, 2, -0.6), "a negative margin is a margin inside");
  });

  QUnit.test("steering is the unit vector toward a point, and nothing at it", (assert) => {
    assert.deepEqual(steerTo({ x: 0, z: 0 }, { x: 0, z: 5 }), { x: 0, z: 1 });
    const d = steerTo({ x: 1, z: 1 }, { x: 4, z: 5 });
    assert.true(Math.abs(d.x - 0.6) < 1e-9 && Math.abs(d.z - 0.8) < 1e-9);
    assert.strictEqual(steerTo({ x: 1, z: 1 }, { x: 1, z: 1 }), null);
  });
});

QUnit.module("crossingStart", () => {
  const a = { minX: 0, maxX: 20, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };
  const b = { minX: 24, maxX: 30, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };

  QUnit.test("it starts on the roof, a run-up back from the edge, facing the other roof", (assert) => {
    const start = crossingStart(a, b);
    assert.strictEqual(start.y, 10);
    assert.true(Math.abs(start.x - (20 - BOT.runUp)) < 1e-9);
    assert.true(Math.abs(Math.sin(start.heading) - 1) < 1e-9, "east");
    assert.true(isOver(a, start.x, start.z));
  });

  QUnit.test("on a roof that is not so long, it starts at the far end of it", (assert) => {
    const small = { ...a, maxX: 3 };
    const start = crossingStart(small, { ...b, minX: 7, maxX: 12 });
    assert.true(isOver(small, start.x, start.z), "still on the roof");
    assert.true(start.x < 3 - 0.5);
  });
});

QUnit.module("playCrossing", () => {
  const o = { ...SCOUT, ...BODY };
  const roof = (minX, maxX, top) => ({ name: "roof", minX, maxX, minY: 0, maxY: top, minZ: 0, maxZ: 10 });
  const cross = (a, b) => playCrossing(new World({ boxes: [a, b], ground: () => 0 }), ledgesOf([a, b]), a, b);

  QUnit.test("a gap a runner can jump is crossed: the runner ends up standing on the other roof", (assert) => {
    const result = cross(roof(0, 10, 10), roof(13, 23, 10));
    assert.true(result.landed);
    assert.strictEqual(result.how, "jump");
  });

  QUnit.test("a gap that is further than a sprinting jump and the hands that catch the edge is not crossed: the runner falls between the roofs", (assert) => {
    const result = cross(roof(0, 10, 10), roof(18, 28, 10));
    assert.false(result.landed);
    assert.strictEqual(result.how, "fell");
  });

  QUnit.test("a gap a little too far to jump is crossed by the hands: the runner catches the edge of the other roof, and climbs", (assert) => {
    const result = cross(roof(0, 10, 10), roof(16, 26, 10));
    assert.true(result.landed);
    assert.strictEqual(result.how, "climb");
  });

  QUnit.test("a roof that is lower is further to jump to: a drop adds to the reach", (assert) => {
    assert.false(cross(roof(0, 10, 10), roof(18, 28, 10)).landed);
    assert.true(cross(roof(0, 10, 10), roof(18, 28, 4)).landed);
  });

  QUnit.test("a roof that is a little higher is reached by catching the edge, and climbing", (assert) => {
    const result = cross(roof(0, 10, 10), roof(12, 22, 12));
    assert.true(result.landed);
    assert.strictEqual(result.how, "climb");
  });

  QUnit.test("a roof that is much higher is not reached", (assert) => {
    assert.false(cross(roof(0, 10, 10), roof(12, 22, 18)).landed);
  });

  QUnit.test("roofs that touch are walked across", (assert) => {
    const a = roof(0, 10, 10);
    const b = { ...roof(10, 20, 10), maxZ: 10 };
    const result = playCrossing(new World({ boxes: [a, b], ground: () => 0 }), [], a, b);
    assert.true(result.landed);
  });

  QUnit.test("it plays by the numbers of the runner it is given: a slower runner can't cross what a faster one can", (assert) => {
    const a = roof(0, 10, 10);
    const b = roof(15, 25, 10);
    const world = new World({ boxes: [a, b], ground: () => 0 });
    assert.true(playCrossing(world, ledgesOf([a, b]), a, b).landed);
    assert.false(playCrossing(world, ledgesOf([a, b]), a, b, { body: { sprintSpeed: 3 } }).landed);
  });
});

QUnit.module("the roofs of the district", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...propBoxes()], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...propBoxes()]);

  for (const { from, to } of CROSSINGS) {
    QUnit.test(`from the roof of building ${from} to the roof of building ${to} can be crossed with a run and a jump`, (assert) => {
      const result = playCrossing(world, ledges, boxes[from], boxes[to]);
      assert.true(result.landed, `${boxes[from].name} to ${boxes[to].name}: ${result.how}`);
    });
  }

  QUnit.test("a gap of the district that is not in the list of crossings is one that it is not designed to cross: every gap on the list is one that could be", (assert) => {
    const listed = new Set(CROSSINGS.map(({ from, to }) => `${from}>${to}`));
    for (let from = 0; from < boxes.length; from++) {
      for (let to = 0; to < boxes.length; to++) {
        if (from === to || listed.has(`${from}>${to}`)) continue;
        const result = playCrossing(world, ledges, boxes[from], boxes[to]);
        // a roof that is lower, and not far, is in the list; one that is higher, or far, is reached some other way: by the fire escape
        if (boxes[to].maxY >= boxes[from].maxY || approach(boxes[from], boxes[to]).distance > 8) assert.false(result.landed, `${boxes[from].name} (${from}) to ${boxes[to].name} (${to})`);
      }
    }
  });
});

QUnit.module("the fire escapes of the district", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const props = propBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...props], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...props]);
  const placed = buildingPlacements();

  for (const escape of fireEscapes()) {
    QUnit.test(`${escape.name} of building ${escape.building}: from the street to the roof, a mantle of the planter, a jump to the platform, a climb, and the stairs`, (assert) => {
      const roof = placed[escape.building].ledge > 0 ? lower.find((box) => box.name === `${placed[escape.building].name} ledge`) : boxes[escape.building];
      const result = playEscape(world, ledges, escape, roof);
      assert.true(result.reached, `got as far as floor ${result.floor} of ${escape.floors}, ${result.phase}`);
    });
  }

  QUnit.test("a runner that is too slow does not get there: the numbers of the runner are the ones that count", (assert) => {
    const escape = fireEscapes()[0];
    const roof = boxes[escape.building];
    assert.false(playEscape(world, ledges, escape, roof, { body: { stepHeight: 0.1 }, bot: { time: 30 } }).reached, "a runner that can hardly step can't climb a stair");
  });
});

QUnit.module("the start of the game", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const props = propBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...props], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...props]);

  QUnit.test("the runner begins the game in front of the first fire escape, and can mantle the planter from the start", (assert) => {
    const escape = fireEscapes()[0];
    const planter = escape.planter.box;
    assert.true(START.z > planter.maxZ);
    assert.true(START.x > planter.minX && START.x < planter.maxX);
    const body = new Controller({ ...START, world, ledges });
    for (let i = 0; i < 600 && !(body.grounded && body.move === null && body.y > 0.5); i++) body.update({ x: 0, z: -1 }, false, 1 / 60, body.z < planter.maxZ + 0.75);
    assert.true(body.grounded && Math.abs(body.y - PLANTER.height) < 1e-9, "on the planter");
  });
});
