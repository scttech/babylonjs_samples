QUnit.module("runTime and fallTime", () => {
  const o = { ...SCOUT, ...BODY };

  QUnit.test("a run is the distance at the sprint speed", (assert) => {
    assert.strictEqual(runTime({ x: 0, z: 0 }, { x: 30, z: 40 }, { sprintSpeed: 10 }), 5);
    assert.true(Math.abs(runTime({ x: 0, z: 0 }, { x: 3, z: 4 }) - 5 / o.sprintSpeed) < 1e-9);
  });

  QUnit.test("a fall is how long gravity takes, and the roll that follows it", (assert) => {
    assert.strictEqual(fallTime(0), ROUTE.roll);
    assert.true(Math.abs(fallTime(20, { gravity: 10 }) - (2 + ROUTE.roll)) < 1e-9);
    assert.true(fallTime(40) > fallTime(10));
    assert.strictEqual(fallTime(-5), ROUTE.roll, "never a negative fall");
  });
});

QUnit.module("districtWorld", () => {
  const env = districtWorld();

  QUnit.test("it is the district the game is: the roofs, the lower roofs, the fire escapes, and a roof that each fire escape reaches", (assert) => {
    assert.strictEqual(env.roofs.length, buildingPlacements().length);
    assert.strictEqual(env.escapes.length, fireEscapes().length);
    assert.true(env.world.boxes.length > env.roofs.length + env.lower.length);
    assert.true(env.ledges.length >= env.world.boxes.length - rimBoxes().length);
  });

  QUnit.test("a fire escape reaches the roof, or for a building in two levels the lower one", (assert) => {
    env.placed.forEach((placement, i) => {
      assert.strictEqual(env.reached[i].maxY, placement.ledge > 0 ? placement.roof - placement.ledge : placement.roof, placement.name);
    });
  });
});

QUnit.module("climbStart and playClimb", () => {
  const roof = { name: "roof", minX: 0, maxX: 20, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };
  const box = (height, minX = 8, maxX = 11) => ({ name: "box", minX, maxX, minY: 10, maxY: 10 + height, minZ: 4, maxZ: 7 });
  const climb = (target, options) => {
    const world = new World({ boxes: [roof, target], ground: () => 0 });
    return playClimb(world, ledgesOf([roof, target]), roof, target, options);
  };

  QUnit.test("a run begins at the face with the most roof in front of it, square to it, a run-up back", (assert) => {
    const start = climbStart(roof, box(2, 14, 17));
    assert.deepEqual([start.dx, start.dz], [1, 0], "from the west, where there are 14 m of roof, and not the east, where there are 3");
    assert.true(Math.abs(Math.sin(start.heading) - 1) < 1e-9, "facing east");
  });

  QUnit.test("it starts on the roof, and not further back than there is room for", (assert) => {
    const start = climbStart(roof, box(2, 1.5, 4.5));
    assert.true(start.x >= roof.minX && start.x <= roof.maxX && start.z >= roof.minZ && start.z <= roof.maxZ);
    assert.strictEqual(start.y, 10);
  });

  QUnit.test("something a jump gets the hands to is climbed", (assert) => {
    assert.true(climb(box(2.4)).landed);
    assert.true(climb(box(1.6)).landed);
  });

  QUnit.test("something that is too high is not", (assert) => {
    assert.false(climb(box(6)).landed);
  });

  QUnit.test("it plays by the numbers of the runner it is given", (assert) => {
    assert.true(climb(box(3.4)).landed, "a runner that jumps");
    assert.false(climb(box(3.4), { body: { jumpSpeed: 1 } }).landed, "and one that hardly does");
  });
});

QUnit.module("the routes of the district", () => {
  const env = districtWorld();
  const found = reachable(env);
  const tokens = tokenSpots();

  QUnit.test("every building can be got onto from the street, by its fire escape", (assert) => {
    assert.deepEqual([...found.reached].sort(), env.placed.map((_, i) => i));
    for (const [i] of env.placed.entries()) assert.true(found.edges.some((edge) => edge.kind === "escape" && edge.to === i), `building ${i}`);
  });

  QUnit.test("a building in two levels is climbed from the lower roof to the upper one", (assert) => {
    env.placed.forEach((placement, i) => {
      const climbs = found.edges.filter((edge) => edge.kind === "climb" && edge.to === i);
      assert.strictEqual(climbs.length, placement.ledge > 0 ? 1 : 0, placement.name);
    });
  });

  QUnit.test("every designed crossing is made, from a building that is reached", (assert) => {
    for (const { from, to } of CROSSINGS) assert.true(found.edges.some((edge) => edge.kind === "crossing" && edge.from === from && edge.to === to), `${from} to ${to}`);
  });

  QUnit.test("every token is on a building that the bot can get to, or in the street", (assert) => {
    for (const token of tokens) assert.true(token.building === -1 || found.reached.has(token.building), token.id);
  });

  QUnit.test("every token on a hut is one that the bot can climb to, from the roof, and stand on", (assert) => {
    const huts = roofThings().filter((thing) => thing.kind === "hut");
    for (const token of tokens.filter((t) => t.kind === "hut")) {
      const hut = huts.find((thing) => token.x > thing.minX && token.x < thing.maxX && token.z > thing.minZ && token.z < thing.maxZ);
      assert.true(playClimb(env.world, env.ledges, env.roofs[token.building], hut).landed, token.id);
    }
  });

  QUnit.test("every token on a platform is at the top of the stair that the bot climbs: within the reach of a body that passes", (assert) => {
    for (const token of tokens.filter((t) => t.kind === "platform")) {
      const escape = env.escapes.find((e) => e.building === token.building);
      const top = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 1.7, 0.45);
      const near = Math.hypot(top.x - token.x, top.z - token.z);
      assert.true(near < TOKEN.radius, `${token.id} is ${near.toFixed(2)} m from the top of the stair`);
      assert.strictEqual(token.y, escape.top);
    }
  });

  QUnit.test("a body that climbs a fire escape takes the token on its top platform, with the real controller", (assert) => {
    const escape = env.escapes.find((e) => e.building === 0);
    const collection = new Collection(tokens.filter((token) => token.building === 0 && token.kind === "platform"));
    const at = (along, out) => frameToWorld({ x: escape.x, z: escape.z }, escape.turn, along, out);
    const body = new Controller({ x: at(1.7, 0.45).x, z: at(1.7, 0.45).z, y: escape.top, heading: 0, world: env.world, ledges: env.ledges });
    assert.strictEqual(collection.take(body).length, 1);
  });

  QUnit.test("every jump across a gap saves time over going round: dropping to the street, running to the foot of the fire escape and climbing it", (assert) => {
    for (const shortcut of shortcuts(env, found.edges)) {
      assert.true(Number.isFinite(shortcut.jump) && shortcut.jump < 5, `${shortcut.from} to ${shortcut.to} takes ${shortcut.jump.toFixed(1)} s`);
      assert.true(shortcut.saved > 5, `${shortcut.from} to ${shortcut.to} saves ${shortcut.saved.toFixed(1)} s`);
    }
  });

  QUnit.test("the par of the trial is about what the bot takes, a little more: a gold is for running it well, and not for the bot", (assert) => {
    const estimate = trialEstimate(env, found.edges);
    assert.true(estimate > 15 && estimate < 60, `the bot's run takes ${estimate.toFixed(1)} s`);
    assert.true(TRIAL.par >= estimate * 1.2, `the par is ${TRIAL.par}`);
    assert.true(TRIAL.par <= estimate * 2, `the par is ${TRIAL.par}`);
  });

  QUnit.test("with the jump across the alley the trial is quicker than the way round, by more than a gold's margin", (assert) => {
    const jump = found.edges.find((edge) => edge.kind === "crossing" && edge.from === 1 && edge.to === 0);
    const shortcut = shortcuts(env, found.edges).find((s) => s.from === 1 && s.to === 0);
    assert.true(shortcut.saved > TRIAL.par * 0.2, `the jump takes ${jump.time.toFixed(1)} s, and saves ${shortcut.saved.toFixed(1)} s of ${TRIAL.par}`);
  });
});
