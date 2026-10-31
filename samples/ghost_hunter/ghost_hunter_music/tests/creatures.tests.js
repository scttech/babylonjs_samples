const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

QUnit.module("solveLeg and footOffset", () => {
  QUnit.test("the bones keep their lengths, whatever the foot does", (assert) => {
    for (const foot of [[0.3, -0.5, 0.2], [0.1, -0.4, -0.3], [0.5, -0.2, 0.1], [0, -0.7, 0]]) {
      const { knee, foot: reached } = solveLeg([0, 0, 0], foot, 0.4, 0.4, [1, 0.3, 0]);
      assert.true(Math.abs(dist3([0, 0, 0], knee) - 0.4) < 1e-9, "upper");
      assert.true(Math.abs(dist3(knee, reached) - 0.4) < 1e-9, "lower");
      assert.true(dist3(reached, foot) < 1e-5, "it reaches the foot");
    }
  });

  QUnit.test("a foot that is too far is reached for in a straight line", (assert) => {
    const { knee, foot } = solveLeg([0, 0, 0], [3, 0, 0], 0.4, 0.4, [0, 1, 0]);
    assert.true(Math.abs(foot[0] - 0.8) < 1e-4);
    assert.true(Math.abs(knee[1]) < 1e-2, "the leg is straight, so the knee is on the line");
  });

  QUnit.test("the knee bends the way it is told", (assert) => {
    const up = solveLeg([0, 0, 0], [0.4, -0.3, 0], 0.4, 0.4, [0, 1, 0]).knee;
    const down = solveLeg([0, 0, 0], [0.4, -0.3, 0], 0.4, 0.4, [0, -1, 0]).knee;
    assert.true(up[1] > down[1]);
    const out = solveLeg([0, 0, 0], [0, -0.5, 0.2], 0.4, 0.4, [1, 0, 0]).knee;
    assert.true(out[0] > 0);
  });

  QUnit.test("a foot at the hip (or a bend that is along the leg) does not break it", (assert) => {
    const { knee } = solveLeg([0, 0, 0], [0, 0, 0], 0.4, 0.4, [0, 1, 0]);
    assert.true(knee.every(Number.isFinite));
    assert.true(solveLeg([0, 0, 0], [0, -0.5, 0], 0.4, 0.4, [0, -1, 0]).knee.every(Number.isFinite));
  });

  QUnit.test("a foot is planted for most of a step, moving back at a steady pace, and then swings forward and up", (assert) => {
    const a = footOffset(0.1, 1, 0.2), b = footOffset(0.2, 1, 0.2), c = footOffset(0.3, 1, 0.2);
    assert.strictEqual(a[1], 0);
    assert.true(Math.abs((a[0] - b[0]) - (b[0] - c[0])) < 1e-9, "steady");
    assert.true(b[0] < a[0], "back");
    const swing = footOffset(0.8, 1, 0.2);
    assert.true(swing[1] > 0.1, "up in the middle of the swing");
  });

  QUnit.test("a step goes round: the end of one is the start of the next, and the foot never leaves the stride", (assert) => {
    const end = footOffset(0.9999, 1, 0.2), start = footOffset(0, 1, 0.2);
    assert.true(Math.abs(end[0] - start[0]) < 1e-3);
    for (let p = -1.3; p < 2; p += 0.05) {
      const [forward, up] = footOffset(p, 0.4, 0.1);
      assert.true(Math.abs(forward) <= 0.2 + 1e-9);
      assert.true(up >= 0 && up <= 0.1 + 1e-9);
    }
  });
});

QUnit.module("poses", () => {
  const poses = { spider: spiderPose, ghoul: ghoulPose, skeleton: skeletonPose };
  const everyPoint = (pose) => [...pose.bones.flatMap((b) => [b.a, b.b]), ...pose.blobs.map((b) => b.p)];

  QUnit.test("every pose is made of numbers, whatever the state", (assert) => {
    for (const [name, make] of Object.entries(poses)) {
      for (const moving of [0, 0.5, 1]) for (const reach of [0, 1]) for (const gait of [0, 0.3, 7.77]) {
        const pose = make({ gait, time: 3.3, moving, reach, crouch: reach });
        assert.true(everyPoint(pose).every((p) => p.every(Number.isFinite)), `${name} ${moving} ${reach} ${gait}`);
        assert.true(pose.bones.every((b) => b.r > 0) && pose.blobs.every((b) => b.r > 0));
      }
    }
  });

  QUnit.test("every colour a pose uses is one the look has", (assert) => {
    for (const make of Object.values(poses)) {
      const pose = make({ gait: 0.4, time: 1, moving: 1, reach: 1 });
      for (const item of [...pose.bones, ...pose.blobs]) assert.true(item.color in { flesh: 1, bone: 1, dark: 1, claw: 1, eye: 1 }, item.color);
    }
  });

  QUnit.test("a spider has eight legs of two bones each, and they keep their lengths", (assert) => {
    const pose = spiderPose({ gait: 0.2, moving: 1 });
    const legBones = pose.bones.filter((b) => b.color === "dark");
    assert.strictEqual(legBones.length, 16);
    legBones.forEach((b, i) => assert.true(Math.abs(dist3(b.a, b.b) - (i % 2 === 0 ? 0.27 : 0.34)) < 1e-4, `bone ${i}`));
    assert.strictEqual(pose.blobs.filter((b) => b.color === "eye").length, 4);
  });

  QUnit.test("a spider's feet are on the floor, except the ones that are swinging, and some are always on the floor", (assert) => {
    for (let gait = 0; gait < 2; gait += 0.1) {
      const pose = spiderPose({ gait, moving: 1 });
      const feet = pose.bones.filter((b) => b.color === "dark").filter((_, i) => i % 2 === 1).map((b) => b.b[1]);
      assert.true(feet.every((y) => y >= -1e-6));
      assert.true(feet.filter((y) => y < 0.005).length >= 4, "at least half of them are planted");
    }
  });

  QUnit.test("a spider standing still twitches and does not walk", (assert) => {
    const a = spiderPose({ gait: 0, time: 0, moving: 0 });
    const b = spiderPose({ gait: 0, time: 0.5, moving: 0 });
    assert.notDeepEqual(a.bones[5].b, b.bones[5].b);
    assert.true(dist3(a.bones[5].b, b.bones[5].b) < 0.05);
  });

  QUnit.test("a spider crouches, and a ghoul and a skeleton reach", (assert) => {
    const high = Math.max(...spiderPose({ crouch: 0 }).blobs.map((b) => b.p[1]));
    const low = Math.max(...spiderPose({ crouch: 1 }).blobs.map((b) => b.p[1]));
    assert.true(low < high);
    for (const make of [ghoulPose, skeletonPose]) {
      const hands = (pose) => Math.max(...pose.bones.filter((b) => b.a[1] > 1.2).map((b) => b.b[1]));
      assert.true(hands(make({ reach: 1 })) > hands(make({ reach: 0 })) - 1e-9);
    }
  });

  QUnit.test("a ghoul is hunched: its head is in front of its feet, and it is as tall as the table says, near enough", (assert) => {
    const pose = ghoulPose({ gait: 0, moving: 0.5 });
    const top = Math.max(...pose.blobs.map((b) => b.p[1] + b.r));
    assert.true(Math.abs(top - CREATURES.ghoul.height) < 0.25);
    const head = pose.blobs.filter((b) => b.color === "eye")[0].p;
    assert.true(head[2] > 0.3, "leaning forward");
  });

  QUnit.test("a skeleton has a skull and ribs, and rattles more when it moves", (assert) => {
    const still = skeletonPose({ time: 0.3, moving: 0 });
    const running = skeletonPose({ time: 0.3, moving: 1 });
    assert.true(still.bones.filter((b) => b.r === 0.01).length >= 6, "ribs");
    assert.true(still.blobs.some((b) => b.r === 0.11), "a skull");
    const rattle = (pose) => Math.abs(pose.blobs.find((b) => b.r === 0.11).p[0]);
    assert.true(rattle(running) >= rattle(still));
  });

  QUnit.test("every kind has a pose, and a table", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      const table = CREATURES[kind];
      assert.strictEqual(typeof POSES[table.pose || kind], "function", kind);
      assert.true(table.health > 0 && table.speed > 0 && table.lungeSpeed > table.speed && table.lungeRange > table.touchRange, kind);
    }
  });
});

QUnit.module("Creature", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (kind = "ghoul", position = [0, 0, 8]) => new Creature({ id: 1, kind, position, random: () => 0 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("it lurks, then stalks, and does not move while it lurks", (assert) => {
    const creature = make();
    assert.strictEqual(creature.state, "lurk");
    creature.update(0.5, player);
    assert.deepEqual(creature.position, [0, 0, 8]);
    run(creature, CREATURES.ghoul.lurkTime[0] + 0.2);
    assert.strictEqual(creature.state, "stalk");
  });

  QUnit.test("it stalks at its own speed, towards the player", (assert) => {
    const creature = make("skeleton", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = Math.PI; // already facing the player (along -z)
    const before = creature.distanceTo(player.position);
    run(creature, 2);
    const walked = before - creature.distanceTo(player.position);
    assert.true(Math.abs(walked - CREATURES.skeleton.speed * 2) < 0.2, `walked ${walked.toFixed(2)}`);
  });

  QUnit.test("it turns before it walks: one that faces away does not go towards you at first", (assert) => {
    const creature = make("ghoul", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = 0; // facing away
    creature.update(0.1, player);
    assert.strictEqual(creature.position[2], 8, "it has not moved yet");
    run(creature, 4);
    assert.true(creature.position[2] < 8);
  });

  QUnit.test("it lunges when it is close, and says so once", (assert) => {
    const creature = make("spider", [0, 0, 2]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 1.5);
    assert.strictEqual(events.filter((e) => e === "lunge").length, 1);
  });

  QUnit.test("a lunge reaches the player: it touches, and recovers, and comes again", (assert) => {
    const creature = make("spider", [0, 0, 3]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 12);
    assert.true(events.includes("touch"));
    assert.true(creature.touches >= 2, `it came again: ${creature.touches}`);
    assert.true(creature.distanceTo(player.position) >= 0, "never through the player");
  });

  QUnit.test("a lunge is faster than a walk", (assert) => {
    const table = CREATURES.ghoul;
    assert.true(table.lungeSpeed > table.speed * 2);
  });

  QUnit.test("a creature recovers for the table's time before it stalks again", (assert) => {
    const creature = make("skeleton", [0, 0, 1]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    while (creature.state !== "recover") creature.update(0.02, player);
    let rested = 0;
    while (creature.state === "recover") { creature.update(0.02, player); rested += 0.02; }
    assert.true(Math.abs(rested - CREATURES.skeleton.recoverTime) < 0.06, `rested ${rested.toFixed(2)} s`);
  });

  QUnit.test("it dies when its health is gone, collapses, and is gone", (assert) => {
    const creature = make("spider");
    assert.true(creature.hit(1));
    assert.strictEqual(creature.health, CREATURES.spider.health - 1);
    assert.true(creature.alive);
    creature.hit(100);
    assert.strictEqual(creature.state, "dying");
    assert.false(creature.alive);
    assert.deepEqual(creature.events, ["died"]);
    assert.false(creature.hit(1), "a dead creature cannot be hit again");
    run(creature, CREATURES.spider.deathTime + 0.2);
    assert.true(creature.done);
  });

  QUnit.test("a dying creature's pose comes down to the floor", (assert) => {
    const creature = make("ghoul");
    creature.hit(100);
    const top = (pose) => Math.max(...pose.blobs.map((b) => b.p[1]));
    const standing = top(make("ghoul").pose());
    creature.update(CREATURES.ghoul.deathTime * 0.9, player);
    assert.true(top(creature.pose()) < standing * 0.4);
  });

  QUnit.test("its legs follow its steps: the gait goes up as it goes along, and not when it stands", (assert) => {
    const creature = make("spider", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    run(creature, 1);
    assert.true(creature.gait > 1, `${creature.gait}`);
    const lurker = make("spider");
    run(lurker, 0.5);
    assert.strictEqual(lurker.gait, 0);
  });

  QUnit.test("a creature with its own table uses it", (assert) => {
    const slow = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 8], table: { ...CREATURES.ghoul, speed: 0.1 }, random: () => 0 });
    slow.state = "stalk";
    slow.yaw = Math.PI;
    run(slow, 2);
    assert.true(8 - slow.position[2] < 0.3);
  });
});

QUnit.module("Menagerie", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("spawns a creature and tells of it, and not of a kind that does not exist", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type, item }) => told.push(`${type} ${item.kind}`));
    assert.true(menagerie.spawn("spider", [0, 0, 5]) !== null);
    assert.strictEqual(menagerie.spawn("dragon", [0, 0, 5]), null);
    assert.deepEqual(told, ["added spider"]);
  });

  QUnit.test("no more than the most", (assert) => {
    const menagerie = new Menagerie(2, () => 0);
    menagerie.spawn("spider", [0, 0, 5]);
    menagerie.spawn("ghoul", [1, 0, 5]);
    assert.strictEqual(menagerie.spawn("skeleton", [2, 0, 5]), null);
  });

  QUnit.test("tells of what they do: a lunge, a touch, a death, and when one is gone", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type }) => told.push(type));
    const spider = menagerie.spawn("spider", [0, 0, 2.5]);
    spider.state = "stalk";
    spider.yaw = Math.PI;
    for (let i = 0; i < 40; i++) menagerie.update(0.05, player);
    assert.true(told.includes("lunge") && told.includes("touch"));
    spider.hit(100);
    for (let i = 0; i < 40; i++) menagerie.update(0.05, player);
    assert.true(told.includes("died"));
    assert.strictEqual(told[told.length - 1], "removed");
    assert.strictEqual(menagerie.items.length, 0);
  });

  QUnit.test("finds the nearest creature that is alive", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    assert.strictEqual(menagerie.nearest([0, 0, 0]), null);
    const near = menagerie.spawn("spider", [0, 0, 2]);
    const far = menagerie.spawn("ghoul", [0, 0, 9]);
    assert.strictEqual(menagerie.nearest([0, 0, 0]).creature, near);
    near.hit(100);
    assert.strictEqual(menagerie.nearest([0, 0, 0]).creature, far, "the dying one does not count");
  });

  QUnit.test("clear sends them all away, and tells of each", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type }) => told.push(type));
    menagerie.spawn("spider", [0, 0, 2]);
    menagerie.spawn("ghoul", [0, 0, 9]);
    menagerie.clear();
    assert.strictEqual(menagerie.items.length, 0);
    assert.deepEqual(told, ["added", "added", "removed", "removed"]);
  });
});
