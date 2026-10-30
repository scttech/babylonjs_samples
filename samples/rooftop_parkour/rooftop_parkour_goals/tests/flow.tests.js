QUnit.module("The numbers of flow", () => {
  QUnit.test("every kind of move that can happen is worth something, and the harder the move the more", (assert) => {
    for (const kind of ["jump", "roll", "grab", "climb", "vault", "mantle", "kick", "token"]) assert.true(FLOW.points[kind] > 0, kind);
    assert.true(FLOW.points.kick > FLOW.points.vault && FLOW.points.vault >= FLOW.points.mantle && FLOW.points.mantle > FLOW.points.jump);
  });

  QUnit.test("a chain lasts long enough to get from one move to the next, and running slows the clock down but does not stop it", (assert) => {
    assert.true(FLOW.window > 1);
    assert.true(FLOW.runSlow > 0 && FLOW.runSlow < 1);
    assert.true(FLOW.runSpeed <= SCOUT.jogSpeed, "a jog is running");
    assert.true(FLOW.maxMultiplier >= 2 && FLOW.perStep >= 1);
  });
});

QUnit.module("snapshot and moveEvents", () => {
  const body = (changes = {}) => ({ grounded: true, move: null, wallJumps: 0, hang: null, rolling: 0, jumping: false, ...changes });

  QUnit.test("a snapshot is what a body is doing, as far as flow cares", (assert) => {
    assert.deepEqual(snapshot(body({ move: { kind: "vault" }, hang: { climb: 0.2 }, rolling: 0.3, wallJumps: 2, grounded: false })), {
      grounded: false,
      move: "vault",
      wallJumps: 2,
      hanging: true,
      climbing: true,
      rolling: true,
    });
    assert.deepEqual(snapshot(body({ hang: { climb: null } })), { grounded: true, move: null, wallJumps: 0, hanging: true, climbing: false, rolling: false });
  });

  QUnit.test("nothing changed, nothing happened", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body()), body()), []);
  });

  QUnit.test("a vault and a mantle are counted the moment they begin, and not while they go on", (assert) => {
    const still = snapshot(body());
    assert.deepEqual(moveEvents(still, body({ move: { kind: "vault" } })), ["vault"]);
    assert.deepEqual(moveEvents(still, body({ move: { kind: "mantle" } })), ["mantle"]);
    assert.deepEqual(moveEvents(snapshot(body({ move: { kind: "vault" } })), body({ move: { kind: "vault" } })), []);
  });

  QUnit.test("a kick is counted for each wall jump", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body({ wallJumps: 1, grounded: false })), body({ wallJumps: 2, grounded: false, jumping: true })), ["kick"]);
  });

  QUnit.test("catching a ledge, and then climbing it, are each counted once", (assert) => {
    const air = snapshot(body({ grounded: false }));
    assert.deepEqual(moveEvents(air, body({ grounded: false, hang: { climb: null } })), ["grab"]);
    const hanging = snapshot(body({ grounded: false, hang: { climb: null } }));
    assert.deepEqual(moveEvents(hanging, body({ grounded: false, hang: { climb: 0.1 } })), ["climb"]);
    assert.deepEqual(moveEvents(snapshot(body({ grounded: false, hang: { climb: 0.1 } })), body({ grounded: false, hang: { climb: 0.2 } })), []);
  });

  QUnit.test("a roll is counted when it begins", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body({ grounded: false })), body({ rolling: 0.4 })), ["roll"]);
    assert.deepEqual(moveEvents(snapshot(body({ rolling: 0.4 })), body({ rolling: 0.3 })), []);
  });

  QUnit.test("a jump is counted when the body leaves the ground because it jumped, and not when it walks off an edge", (assert) => {
    const ground = snapshot(body());
    assert.deepEqual(moveEvents(ground, body({ grounded: false, jumping: true })), ["jump"]);
    assert.deepEqual(moveEvents(ground, body({ grounded: false, jumping: false })), []);
  });

  QUnit.test("a kick is not also a jump, and a catch is not", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body()), body({ grounded: false, jumping: true, wallJumps: 1 })), ["kick"]);
    assert.deepEqual(moveEvents(snapshot(body()), body({ grounded: false, jumping: true, hang: { climb: null } })), ["grab"]);
  });

  QUnit.test("with a real controller: a jump, a vault, and a mantle are each seen", (assert) => {
    const dt = 1 / 60;
    const wall = { name: "wall", minX: -3, maxX: 3, minY: 0, maxY: 1, minZ: 2, maxZ: 2.4 };
    const crate = { name: "crate", minX: -3, maxX: 3, minY: 0, maxY: 1.5, minZ: 8, maxZ: 10 };
    const world = new World({ boxes: [wall, crate] });
    const ledges = ledgesOf([wall, crate]);
    const body1 = new Controller({ x: 0, z: -1, heading: 0, world, ledges });
    const seen = [];
    for (let i = 0; i < 400; i++) {
      const before = snapshot(body1);
      body1.update({ x: 0, z: 1 }, true, dt, i > 150 && body1.z > 6.9 && body1.z < 7.6);
      seen.push(...moveEvents(before, body1));
    }
    assert.true(seen.includes("vault"), seen.join());
    assert.true(seen.includes("mantle") || seen.includes("jump"), seen.join());
  });
});

QUnit.module("comboMilestone", () => {
  const table = { milestone: 5 };

  QUnit.test("a chain that reaches a multiple of the milestone is a combo", (assert) => {
    assert.true(comboMilestone(4, 5, table));
    assert.true(comboMilestone(9, 10, table));
    assert.true(comboMilestone(14, 15, table));
  });

  QUnit.test("a chain that does not is not, and the one that is already there is not again", (assert) => {
    assert.false(comboMilestone(0, 1, table));
    assert.false(comboMilestone(5, 6, table));
    assert.false(comboMilestone(5, 5, table));
    assert.false(comboMilestone(8, 9, table));
  });

  QUnit.test("a chain that jumps over a milestone (a token and a move in a frame) has crossed it, once", (assert) => {
    assert.true(comboMilestone(4, 6, table));
    assert.true(comboMilestone(3, 11, table));
  });

  QUnit.test("a chain that ended and began again crossed nothing", (assert) => {
    assert.false(comboMilestone(7, 1, table));
    assert.false(comboMilestone(12, 0, table));
  });

  QUnit.test("with the numbers of the game, the milestone is a few moves, and a chain can reach it before the multiplier is at its highest", (assert) => {
    assert.true(FLOW.milestone >= 3 && FLOW.milestone <= FLOW.perStep * FLOW.maxMultiplier);
    assert.true(comboMilestone(FLOW.milestone - 1, FLOW.milestone));
  });

  QUnit.test("it is the moves of a Flow that cross it: the fifth move of a chain does", (assert) => {
    const flow = new Flow({ ...FLOW, milestone: 5 });
    const crossed = [];
    for (let i = 0; i < 11; i++) {
      const before = flow.chain;
      flow.add("vault");
      if (comboMilestone(before, flow.chain, flow.table)) crossed.push(flow.chain);
    }
    assert.deepEqual(crossed, [5, 10]);
  });
});

QUnit.module("Flow", () => {
  const table = { window: 2, perStep: 2, maxMultiplier: 4, runSpeed: 3, runSlow: 0.5, points: { vault: 3, kick: 4, token: 5 } };

  QUnit.test("it begins with nothing: no points, no chain, a multiplier of 1", (assert) => {
    const flow = new Flow(table);
    assert.deepEqual([flow.score, flow.chain, flow.multiplier, flow.fraction, flow.bestChain], [0, 0, 1, 0, 0]);
  });

  QUnit.test("a move is worth its points, times the multiplier at the time", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("vault"), 3);
    assert.strictEqual(flow.score, 3);
    assert.strictEqual(flow.add("kick"), 4);
    assert.strictEqual(flow.multiplier, 2, "two moves make a step");
    assert.strictEqual(flow.add("vault"), 6);
    assert.strictEqual(flow.score, 13);
  });

  QUnit.test("a token is worth what it is marked with, times its points", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("token", 3), 15);
  });

  QUnit.test("a kind that is not in the table is worth nothing, but is a move", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("dance"), 0);
    assert.strictEqual(flow.chain, 1);
  });

  QUnit.test("the multiplier goes up a step each perStep moves, and no higher than the most", (assert) => {
    const flow = new Flow(table);
    const seen = [];
    for (let i = 0; i < 12; i++) {
      flow.add("vault");
      seen.push(flow.multiplier);
    }
    assert.deepEqual(seen, [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4]);
  });

  QUnit.test("a chain is alive for the window, and a move starts the window again", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.false(flow.update(1.5));
    assert.strictEqual(flow.chain, 1);
    flow.add("vault");
    assert.false(flow.update(1.5), "the second move began the window again");
    assert.strictEqual(flow.chain, 2);
  });

  QUnit.test("when the window is used up the chain ends: the multiplier is 1 again, the points stay, and the best chain is kept", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    flow.add("vault");
    flow.add("vault");
    assert.true(flow.update(2.1));
    assert.deepEqual([flow.chain, flow.multiplier, flow.score, flow.bestChain], [0, 1, 12, 3]);
  });

  QUnit.test("it says only once that the chain ended", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.true(flow.update(3));
    assert.false(flow.update(3));
  });

  QUnit.test("a body that runs uses up the window more slowly, and one that stands doesn't", (assert) => {
    const running = new Flow(table);
    const standing = new Flow(table);
    running.add("vault");
    standing.add("vault");
    assert.false(running.update(3, 5), "3 s at half the rate is 1.5 s of 2");
    assert.true(standing.update(3, 0));
  });

  QUnit.test("the fraction is how much of the window is left, for a bar", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.strictEqual(flow.fraction, 1);
    flow.update(0.5);
    assert.strictEqual(flow.fraction, 0.75);
    flow.update(5);
    assert.strictEqual(flow.fraction, 0);
  });

  QUnit.test("a long chain is worth more than the same moves each on their own", (assert) => {
    const chained = new Flow(table);
    for (let i = 0; i < 8; i++) chained.add("vault");
    const apart = new Flow(table);
    for (let i = 0; i < 8; i++) {
      apart.add("vault");
      apart.update(5);
    }
    assert.true(chained.score > apart.score * 1.5, `${chained.score} against ${apart.score}`);
    assert.strictEqual(apart.score, 24);
  });

  QUnit.test("reset starts again", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    flow.add("kick");
    flow.reset();
    assert.deepEqual([flow.score, flow.chain, flow.bestChain, flow.lastKind, flow.fraction], [0, 0, 0, null, 0]);
  });

  QUnit.test("it uses the numbers of the game unless it is given others, so the developer panel can change them", (assert) => {
    const flow = new Flow();
    assert.strictEqual(flow.table, FLOW);
    flow.add("kick");
    assert.strictEqual(flow.score, FLOW.points.kick);
  });
});
