QUnit.module("distanceToBox", () => {
  const box = { minX: 0, maxX: 4, minZ: 0, maxZ: 2 };

  QUnit.test("over the box it is 0, and beside it it is the way to the nearest side or corner", (assert) => {
    assert.strictEqual(distanceToBox(box, 2, 1), 0);
    assert.strictEqual(distanceToBox(box, 7, 1), 3);
    assert.strictEqual(distanceToBox(box, 7, 6), 5);
  });
});

QUnit.module("tokenSpots", () => {
  const tokens = tokenSpots();
  const roofs = buildingBoxes();
  const escapes = fireEscapes();
  const things = roofThings();

  QUnit.test("every token has a name that is its own, a kind that is in the table, and what it is worth", (assert) => {
    assert.strictEqual(new Set(tokens.map((token) => token.id)).size, tokens.length);
    for (const token of tokens) {
      assert.true(token.kind in TOKEN.kinds, token.id);
      assert.strictEqual(token.value, TOKEN.kinds[token.kind].value, token.id);
      assert.true(/^#[0-9a-f]{6}$/i.test(TOKEN.kinds[token.kind].color), token.kind);
    }
  });

  QUnit.test("there are three in the street, on the way from the start to the first fire escape, and on the ground", (assert) => {
    const street = tokens.filter((token) => token.kind === "street");
    assert.strictEqual(street.length, 3);
    const planter = escapes[0].planter.box;
    for (const token of street) {
      assert.strictEqual(token.building, -1);
      assert.strictEqual(token.y, groundHeight(token.x, token.z));
      assert.true(token.z < START.z && token.z > planter.maxZ, "between the start and the planter");
      assert.true(Math.abs(token.x - START.x) < 1e-9);
    }
  });

  QUnit.test("there is one on the top platform of every fire escape, over the platform, at the top of the stair", (assert) => {
    const platform = tokens.filter((token) => token.kind === "platform");
    assert.strictEqual(platform.length, escapes.length);
    for (const token of platform) {
      const escape = escapes.find((e) => e.building === token.building);
      assert.strictEqual(token.y, escape.top);
      const slab = escape.boxes.find((box) => box.maxY === escape.top && token.x >= box.minX && token.x <= box.maxX && token.z >= box.minZ && token.z <= box.maxZ);
      assert.notStrictEqual(slab, undefined, `${token.id} is over a slab of the platform`);
    }
  });

  QUnit.test("there is one on every roof, over the roof, and clear of what is on it", (assert) => {
    const roof = tokens.filter((token) => token.kind === "roof");
    assert.strictEqual(roof.length, roofs.length);
    for (const token of roof) {
      const box = roofs[token.building];
      assert.true(token.x > box.minX + RIM_WIDTH && token.x < box.maxX - RIM_WIDTH && token.z > box.minZ + RIM_WIDTH && token.z < box.maxZ - RIM_WIDTH, `${token.id} is on the roof, not the raised edge`);
      assert.strictEqual(token.y, box.maxY);
      for (const thing of things) {
        if (thing.minY === box.maxY && distanceToBox(thing, token.x, token.z) < TOKEN.roofClear) assert.true(thing.minX < box.minX || thing.maxX > box.maxX, `${token.id} is ${distanceToBox(thing, token.x, token.z).toFixed(1)} m from ${thing.name}`);
      }
    }
  });

  QUnit.test("there is one on top of every hut, and none on anything else", (assert) => {
    const huts = things.filter((thing) => thing.kind === "hut");
    const onHuts = tokens.filter((token) => token.kind === "hut");
    assert.strictEqual(onHuts.length, huts.length);
    for (const token of onHuts) {
      const hut = huts.find((thing) => token.x > thing.minX && token.x < thing.maxX && token.z > thing.minZ && token.z < thing.maxZ);
      assert.notStrictEqual(hut, undefined, token.id);
      assert.strictEqual(token.y, hut.maxY);
      assert.strictEqual(roofs[token.building].maxY, hut.minY, "the building it is on");
    }
  });

  QUnit.test("a token higher up is worth more than one in the street, and the hut, which takes a climb, the most", (assert) => {
    assert.true(TOKEN.kinds.platform.value > TOKEN.kinds.street.value);
    assert.true(TOKEN.kinds.hut.value > TOKEN.kinds.roof.value);
  });

  QUnit.test("none of them is in a wall: a runner could stand where each one is", (assert) => {
    const world = new World({ boxes: [...roofs, ...ledgeBoxes(), ...rimBoxes(), ...propBoxes()], ground: (x, z) => groundHeight(x, z) });
    for (const token of tokens) {
      const support = world.supportAt(token.x, token.z, 0, token.y + 0.01);
      assert.true(Math.abs(support - token.y) < 0.05, `${token.id} is over something to stand on (${support.toFixed(2)} against ${token.y.toFixed(2)})`);
      const pushed = world.push(token.x, token.z, SCOUT.radius, token.y, BODY.height, BODY.stepHeight);
      assert.true(Math.hypot(pushed.x - token.x, pushed.z - token.z) < 0.05, `${token.id} is not in a wall`);
    }
  });
});

QUnit.module("canTake and Collection", () => {
  const token = { id: "t", kind: "roof", x: 5, y: 10, z: 5, value: 2, building: 0 };
  const another = { id: "u", kind: "hut", x: 20, y: 10, z: 5, value: 3, building: 0 };

  QUnit.test("a body takes a token when it is within the radius, in all three directions", (assert) => {
    assert.true(canTake(token, { x: 5, y: 10, z: 5 }));
    assert.true(canTake(token, { x: 5 + TOKEN.radius - 0.01, y: 10, z: 5 }));
    assert.false(canTake(token, { x: 5 + TOKEN.radius + 0.01, y: 10, z: 5 }));
    assert.false(canTake(token, { x: 5, y: 10 + TOKEN.radius + 0.01, z: 5 }), "above it, as on another floor");
    assert.false(canTake(token, { x: 5, y: 10 - 2, z: 5 }), "and under it");
  });

  QUnit.test("a collection takes what the body is at, once", (assert) => {
    const collection = new Collection([token, another]);
    assert.deepEqual(collection.take({ x: 5, y: 10, z: 5.5 }), [token]);
    assert.deepEqual(collection.take({ x: 5, y: 10, z: 5.5 }), [], "it is not taken twice");
    assert.deepEqual([collection.count, collection.total, collection.value], [1, 2, 2]);
    assert.true(collection.has(token));
    assert.false(collection.has(another));
  });

  QUnit.test("two tokens at the same place are taken together", (assert) => {
    const collection = new Collection([token, { ...another, x: 5.5 }]);
    assert.strictEqual(collection.take({ x: 5, y: 10, z: 5 }).length, 2);
    assert.strictEqual(collection.value, 5);
  });

  QUnit.test("reset puts them all back", (assert) => {
    const collection = new Collection([token]);
    collection.take({ x: 5, y: 10, z: 5 });
    collection.reset();
    assert.strictEqual(collection.count, 0);
    assert.strictEqual(collection.take({ x: 5, y: 10, z: 5 }).length, 1);
  });
});

QUnit.module("the trial", () => {
  const checkpoints = trialCheckpoints();
  const roofs = buildingBoxes();

  QUnit.test("the checkpoints are the start, two roofs and the finish, and the finish is where the start is", (assert) => {
    assert.deepEqual(checkpoints.map((c) => c.name), ["Start", "Medium roof", "Small roof", "Finish"]);
    assert.deepEqual([checkpoints[3].x, checkpoints[3].y, checkpoints[3].z], [checkpoints[0].x, checkpoints[0].y, checkpoints[0].z]);
  });

  QUnit.test("the start is where the runner begins, on the road", (assert) => {
    assert.deepEqual([checkpoints[0].x, checkpoints[0].z], [START.x, START.z]);
    assert.strictEqual(checkpoints[0].y, groundHeight(START.x, START.z));
  });

  QUnit.test("the roofs are the roofs of the medium_1 and the small_1 beside it, at the middle, and at the height of the roof", (assert) => {
    for (const [index, building] of [[1, 1], [2, 0]]) {
      const box = roofs[building];
      assert.true(checkpoints[index].x > box.minX && checkpoints[index].x < box.maxX && checkpoints[index].z > box.minZ && checkpoints[index].z < box.maxZ, checkpoints[index].name);
      assert.strictEqual(checkpoints[index].y, box.maxY);
    }
    assert.strictEqual(buildingPlacements()[1].name, "medium_1");
    assert.strictEqual(buildingPlacements()[0].name, "small_1");
  });

  QUnit.test("the jump from the medium_1 to the small_1 is one of the crossings of the district", (assert) => {
    assert.true(CROSSINGS.some((crossing) => crossing.from === 1 && crossing.to === 0));
  });

  QUnit.test("a body is in a gate when it is near the middle, and not much under it or over it", (assert) => {
    const gate = { x: 0, y: 10, z: 0 };
    assert.true(inGate(gate, { x: 1, y: 10, z: 1 }));
    assert.false(inGate(gate, { x: 3, y: 10, z: 0 }), "too far");
    assert.false(inGate(gate, { x: 0, y: 10 + TRIAL.above + 0.1, z: 0 }), "on the floor above");
    assert.false(inGate(gate, { x: 0, y: 10 - TRIAL.below - 0.1, z: 0 }), "and on the floor below");
    assert.true(inGate(gate, { x: 0, y: 10 + 2, z: 0 }), "in a jump");
  });

  QUnit.test("a medal is for par or better, and then for so many times par", (assert) => {
    assert.strictEqual(medalFor(TRIAL.par - 1), "gold");
    assert.strictEqual(medalFor(TRIAL.par), "gold");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.silver), "silver");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.bronze), "bronze");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.bronze + 1), "none");
    assert.strictEqual(medalFor(50, 40), "silver");
  });

  QUnit.test("it is ready until the body moves off, and then it runs, and the clock does not run before", (assert) => {
    const trial = new Trial(checkpoints);
    assert.strictEqual(trial.state, "ready");
    assert.deepEqual(trial.update({ x: checkpoints[0].x, y: 0, z: checkpoints[0].z, speed: 0 }, 1), []);
    assert.strictEqual(trial.time, 0);
    assert.deepEqual(trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.5), [{ kind: "start" }]);
    assert.strictEqual(trial.state, "running");
    assert.strictEqual(trial.time, 0.5, "the clock runs from the frame that it started");
  });

  QUnit.test("the target is the next checkpoint, and then the one after", (assert) => {
    const trial = new Trial(checkpoints);
    assert.strictEqual(trial.target, checkpoints[1]);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    trial.update({ x: checkpoints[1].x, y: checkpoints[1].y, z: checkpoints[1].z, speed: 3 }, 1);
    assert.strictEqual(trial.target, checkpoints[2]);
  });

  QUnit.test("it asks for the checkpoints in order: reaching the last first is not enough", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    const events = trial.update({ x: checkpoints[3].x, y: checkpoints[3].y, z: checkpoints[3].z, speed: 3 }, 1);
    assert.deepEqual(events, []);
    assert.strictEqual(trial.state, "running");
  });

  QUnit.test("a run through all of them finishes, with the splits, a time, a medal and a best", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 20 });
    const at = (c) => ({ x: c.x, y: c.y, z: c.z, speed: 3 });
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    const seen = [];
    for (const c of checkpoints.slice(1)) seen.push(...trial.update(at(c), 6));
    assert.deepEqual(seen.map((e) => e.kind), ["checkpoint", "checkpoint", "finish"]);
    assert.strictEqual(trial.state, "finished");
    assert.strictEqual(trial.splits.length, 3);
    assert.true(Math.abs(trial.time - 18.1) < 1e-9);
    assert.strictEqual(trial.medal, "gold");
    assert.strictEqual(trial.best, trial.time);
    assert.strictEqual(trial.target, null);
  });

  QUnit.test("a finished run does not go on: the clock stops", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, 1);
    const time = trial.time;
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 5);
    assert.strictEqual(trial.time, time);
  });

  QUnit.test("restart goes back to the start, and keeps the best time", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, 10);
    const best = trial.best;
    trial.restart();
    assert.deepEqual([trial.state, trial.time, trial.next, trial.splits.length, trial.medal], ["ready", 0, 1, 0, null]);
    assert.strictEqual(trial.best, best);
  });

  QUnit.test("a better run replaces the best, and a worse one does not", (assert) => {
    const trial = new Trial(checkpoints);
    const run = (seconds) => {
      trial.restart();
      trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0);
      for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, seconds / 3);
    };
    run(60);
    run(90);
    assert.true(Math.abs(trial.best - 60) < 1e-9);
    run(30);
    assert.true(Math.abs(trial.best - 30) < 1e-9);
  });
});
