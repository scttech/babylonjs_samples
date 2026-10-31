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
    const creature = make("ghoul", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = Math.PI; // already facing the player (along -z)
    const before = creature.distanceTo(player.position);
    run(creature, 2);
    const walked = before - creature.distanceTo(player.position);
    assert.true(Math.abs(walked - CREATURES.ghoul.speed * 2) < 0.2, `walked ${walked.toFixed(2)}`);
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

  QUnit.test("it lunges at once when it is already close, and says so once", (assert) => {
    const creature = make("spider", [0, 0, 1.4]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 1.5);
    assert.strictEqual(events.filter((e) => e === "lunge").length, 1);
  });

  QUnit.test("a lunge reaches the player: it touches, recovers, and then draws back and goes: it does not come again", (assert) => {
    const creature = make("spider", [0, 0, 1.4]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 30);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
    assert.strictEqual(creature.touches, 1, "once");
    assert.true(creature.done, "and it has gone");
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
    assert.strictEqual(creature.state, "retreat", "and then it draws back");
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
    const spider = menagerie.spawn("spider", [0, 0, 1.4]);
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

QUnit.module("creeping", () => {
  const player = { position: [0, 1.4, 0] };
  const quick = (kind, patience) => new Creature({ id: 1, kind, position: [0, 0, 9], table: { ...CREATURES[kind], creep: { patience: [patience, patience] } }, random: () => 0.5 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("it comes to its distance and stops there, and does not rush", (assert) => {
    const creature = quick("ghoul", 1000);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 60);
    assert.strictEqual(creature.state, "creep");
    assert.false(events.includes("lunge"));
    assert.true(Math.abs(creature.distanceTo(player.position) - creature.creepAt) < 0.8, `${creature.distanceTo(player.position).toFixed(1)} m, wanting ${creature.creepAt.toFixed(1)}`);
  });

  QUnit.test("it circles while it loiters, and keeps its distance as it does", (assert) => {
    const creature = quick("ghoul", 1000);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    run(creature, 20);
    const bearings = [];
    for (let i = 0; i < 400; i++) {
      run(creature, 0.1, 0.05);
      bearings.push(Math.atan2(creature.position[0], creature.position[2]));
      assert.true(creature.distanceTo(player.position) > 1.8 && creature.distanceTo(player.position) < creature.creepAt + 1.5);
    }
    assert.true(Math.max(...bearings) - Math.min(...bearings) > 0.3, "it has moved round the player");
  });

  QUnit.test("when its patience is out it rushes, once, from where it is, and touches", (assert) => {
    const creature = quick("ghoul", 3);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 40);
    assert.strictEqual(events.filter((e) => e === "lunge").length, 1);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
  });

  QUnit.test("it rushes after about as long as its patience, and not before", (assert) => {
    const creature = quick("ghoul", 6);
    creature.state = "creep";
    creature.creepAt = 4;
    creature.position = [0, 0, 4];
    let seconds = 0;
    while (creature.state === "creep" && seconds < 30) { creature.update(0.05, player); seconds += 0.05; }
    assert.true(Math.abs(seconds - 6) < 0.2, `${seconds.toFixed(1)} s`);
    assert.strictEqual(creature.state, "lunge");
  });

  QUnit.test("a stun gives the player time: it does not count while it is stopped", (assert) => {
    const creature = quick("ghoul", 2);
    creature.state = "creep";
    creature.position = [0, 0, 4];
    creature.stun(2);
    run(creature, 1.9);
    assert.strictEqual(creature.waited, 0);
  });

  QUnit.test("a player who goes away is followed", (assert) => {
    const creature = quick("ghoul", 1000);
    creature.state = "creep";
    creature.position = [0, 0, 4];
    creature.update(0.05, { position: [0, 1.4, -30] });
    assert.strictEqual(creature.state, "stalk");
  });

  QUnit.test("after its rush it draws back and fades, and is gone in the table's time", (assert) => {
    const creature = quick("skeleton", 1000);
    creature.state = "retreat";
    creature.position = [0, 0, 3];
    run(creature, creature.creep.retreatSeconds - creature.creep.fadeSeconds - 0.1);
    assert.strictEqual(creature.fade, 1, "all there while it goes");
    assert.true(creature.distanceTo(player.position) > 3.5, "further away");
    run(creature, creature.creep.fadeSeconds / 2 + 0.1);
    assert.true(creature.fade > 0 && creature.fade < 1, "fading");
    run(creature, creature.creep.fadeSeconds);
    assert.true(creature.done);
  });

  QUnit.test("a creature that is retreating can still be hurt and captured", (assert) => {
    const creature = quick("skeleton", 1000);
    creature.state = "retreat";
    assert.true(creature.alive);
    assert.true(creature.capture());
  });

  QUnit.test("every kind creeps: it has a distance and a patience, and the spider is bolder than the ghoul", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 9], random: () => 0.5 });
      assert.true(creature.creepAt > CREATURES[kind].lungeRange, `${kind}: it loiters outside the distance it rushes from`);
      assert.true(creature.patience > 3, kind);
    }
    const spider = new Creature({ id: 1, kind: "spider", position: [0, 0, 9], random: () => 0.5 });
    const ghoul = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 9], random: () => 0.5 });
    assert.true(spider.patience < ghoul.patience && spider.creepAt < ghoul.creepAt);
  });

  QUnit.test("two creatures are not alike: their distance, patience and side are their own", (assert) => {
    let n = 0;
    const random = () => ((n++ * 0.37) % 1);
    const a = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 9], random });
    const b = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 9], random });
    assert.notStrictEqual(a.creepAt, b.creepAt);
    assert.notStrictEqual(a.patience, b.patience);
  });
});

QUnit.module("keeping their distance", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a creature that rushes stops at arm's length and not inside the player, for every kind", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      const table = { ...CREATURES[kind], creep: { patience: [0.2, 0.2] } };
      const creature = new Creature({ id: 1, kind, position: [0, 0, 6], table, random: () => 0 });
      creature.state = "stalk";
      creature.yaw = Math.PI;
      let nearest = Infinity;
      for (let t = 0; t < 40; t += 0.02) {
        creature.update(0.02, player);
        creature.events = [];
        nearest = Math.min(nearest, creature.distanceTo(player.position));
      }
      assert.true(nearest > 0.8, `${kind} came to ${nearest.toFixed(2)} m`);
      assert.true(nearest <= (table.fallAt || table.touchRange) + 0.05, `${kind} still touched, at ${nearest.toFixed(2)} m`);
    }
  });

  QUnit.test("a person-sized creature is never nearer than a metre and a quarter, so that it fits in the view", (assert) => {
    for (const kind of ["ghoul", "skeleton"]) assert.true(CREATURES[kind].touchRange >= 1.2, kind);
  });

  QUnit.test("they loiter further away than they touch, and rush from further than that", (assert) => {
    for (const [kind, table] of Object.entries(CREATURES)) {
      assert.true(table.lungeRange > table.touchRange, kind);
      assert.true(CREEP.distance[0] > table.lungeRange, kind);
    }
  });
});

QUnit.module("the mummy: it staggers, then it runs", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (position = [0, 0, 14], random = () => 0.5) => {
    const mummy = new Creature({ id: 1, kind: "mummy", position, random });
    mummy.state = "stalk";
    mummy.yaw = Math.PI;
    return mummy;
  };
  const speedOf = (creature, seconds) => {
    const before = creature.distanceTo(player.position);
    for (let t = 0; t < seconds; t += 0.05) creature.update(0.05, player);
    return (before - creature.distanceTo(player.position)) / seconds;
  };

  QUnit.test("it staggers at first, at the slow speed of the table", (assert) => {
    const mummy = make();
    const speed = speedOf(mummy, 1.5);
    assert.true(Math.abs(speed - CREATURES.mummy.charge.staggerSpeed) < 0.12, `${speed.toFixed(2)} m/s`);
    assert.strictEqual(mummy.state, "stalk");
  });

  QUnit.test("after its stagger time it runs, at the fast speed, and does not loiter", (assert) => {
    const mummy = make([0, 0, 40]);
    mummy.staggerFor = 2;
    for (let t = 0; t < 2.2; t += 0.05) mummy.update(0.05, player);
    assert.strictEqual(mummy.state, "charge");
    const speed = speedOf(mummy, 1.5);
    assert.true(Math.abs(speed - CREATURES.mummy.charge.runSpeed) < 0.3, `${speed.toFixed(2)} m/s`);
    assert.true(speed > CREATURES.mummy.charge.staggerSpeed * 3, "much faster than the stagger");
  });

  QUnit.test("it picks how long it staggers from the range, so that two mummies are not alike", (assert) => {
    const [low, high] = CREATURES.mummy.charge.staggerTime;
    const a = make([0, 0, 14], () => 0), b = make([0, 0, 14], () => 0.999);
    assert.true(Math.abs(a.staggerFor - low) < 1e-9 && Math.abs(b.staggerFor - high) < 0.01);
  });

  QUnit.test("a charge ends in a rush, a touch, and a retreat, like the others, at arm's length", (assert) => {
    const mummy = make([0, 0, 9]);
    const events = [];
    let nearest = Infinity;
    for (let t = 0; t < 30; t += 0.02) {
      mummy.update(0.02, player);
      events.push(...mummy.events);
      mummy.events = [];
      nearest = Math.min(nearest, mummy.distanceTo(player.position));
    }
    assert.true(events.includes("lunge") && events.includes("touch"));
    assert.true(nearest > 1.1, `came to ${nearest.toFixed(2)} m`);
    assert.true(mummy.done, "and then it was gone");
  });

  QUnit.test("it has a model of its own, with a clip for the stagger and one for the run", (assert) => {
    assert.deepEqual(CREATURES.mummy.models, ["mummy"]);
    assert.strictEqual(ModelBody.clipFor("stalk", CREATURE_MODELS.mummy.clips), "Mummy_Stagger");
    assert.strictEqual(ModelBody.clipFor("charge", CREATURE_MODELS.mummy.clips), "Running");
    assert.strictEqual(ModelBody.clipFor("lunge", CREATURE_MODELS.mummy.clips), "Running");
  });

  QUnit.test("a model with a lunge clip and no run clip runs with the lunge one", (assert) => {
    assert.strictEqual(ModelBody.clipFor("charge", { lunge: "Attack", idle: "Idle" }), "Attack");
    assert.strictEqual(ModelBody.clipFor("charge", { idle: "Idle" }), "Idle");
  });
});

QUnit.module("personal space", () => {
  QUnit.test("a point that is far enough is where it was, one that is too near is moved straight out, and one on top is moved along", (assert) => {
    assert.deepEqual(keepAway([0, 0, 3], [0, 1.4, 0], 2), [0, 3]);
    const [x, z] = keepAway([0, 0, 1], [0, 1.4, 0], 2);
    assert.true(Math.abs(x) < 1e-9 && Math.abs(z - 2) < 1e-9);
    const [x2, z2] = keepAway([1, 0, 1], [0, 1.4, 0], 2);
    assert.true(Math.abs(Math.hypot(x2, z2) - 2) < 1e-9 && Math.abs(x2 - z2) < 1e-9, "and in the same direction");
    assert.deepEqual(keepAway([0, 0, 0], [0, 1.4, 0], 2), [0, 2]);
  });

  QUnit.test("a creature that the player walks up to is moved out of the way, whatever it was doing", (assert) => {
    for (const state of ["lurk", "stalk", "creep", "recover", "retreat", "charge"]) {
      const kind = state === "charge" ? "mummy" : "ghoul"; // only a creature that charges has a charge
      const creature = new Creature({ id: 1, kind, position: [0, 0, 0.3], random: () => 0.5 });
      creature.state = state;
      creature.update(0.02, { position: [0, 1.4, 0] });
      assert.true(creature.distanceTo([0, 1.4, 0]) >= CREATURES[kind].touchRange * PERSONAL_SPACE - 1e-9, state);
    }
  });

  QUnit.test("a stunned creature is moved out too, and a dying one is left alone", (assert) => {
    const stunned = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 0.3], random: () => 0.5 });
    stunned.stun(1);
    stunned.update(0.02, { position: [0, 1.4, 0] });
    assert.true(stunned.distanceTo([0, 1.4, 0]) >= CREATURES.ghoul.touchRange * PERSONAL_SPACE - 1e-9);
    const dying = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 0.3], random: () => 0.5 });
    dying.hit(100);
    dying.update(0.02, { position: [0, 1.4, 0] });
    assert.true(dying.distanceTo([0, 1.4, 0]) < 0.5);
  });

  QUnit.test("the space is inside the touch range, so that a rush still touches", (assert) => {
    assert.true(PERSONAL_SPACE < 0.9);
    for (const [kind, table] of Object.entries(CREATURES)) assert.true(table.touchRange * PERSONAL_SPACE < table.touchRange * 0.9, kind);
  });
});

QUnit.module("the skeleton behaves like the mummy", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("it walks at the player and then runs, and does not circle", (assert) => {
    const skeleton = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 40], random: () => 0.5 });
    skeleton.state = "stalk";
    skeleton.yaw = Math.PI;
    skeleton.staggerFor = 2;
    const speed = (seconds) => {
      const before = skeleton.distanceTo(player.position);
      for (let t = 0; t < seconds; t += 0.05) skeleton.update(0.05, player);
      return (before - skeleton.distanceTo(player.position)) / seconds;
    };
    assert.true(Math.abs(speed(1.5) - CREATURES.skeleton.charge.staggerSpeed) < 0.15);
    for (let t = 0; t < 0.8; t += 0.05) skeleton.update(0.05, player);
    assert.strictEqual(skeleton.state, "charge");
    assert.true(speed(1.5) > CREATURES.skeleton.charge.staggerSpeed * 3);
  });

  QUnit.test("the creatures that charge are the mummy and the skeleton, and the rest creep", (assert) => {
    assert.deepEqual(Object.keys(CREATURES).filter((kind) => CREATURES[kind].charge).sort(), ["mummy", "skeleton"]);
  });

  QUnit.test("its model has a run clip for the charge", (assert) => {
    assert.strictEqual(ModelBody.clipFor("charge", CREATURE_MODELS.skeleton.clips), "Running");
    assert.strictEqual(ModelBody.clipFor("stalk", CREATURE_MODELS.skeleton.clips), "Walking");
  });
});

QUnit.module("the ghoul girl: she rises, walks at you, and falls", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (position = [0, 0, 9]) => new Creature({ id: 1, kind: "ghoul_girl", position, random: () => 0.5 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("she begins by rising, and does nothing else while she does", (assert) => {
    const girl = make();
    assert.strictEqual(girl.state, "arise");
    const start = girl.position.slice();
    run(girl, CREATURES.ghoul_girl.arise - 0.3);
    assert.deepEqual(girl.position, start, "she has not moved");
    assert.strictEqual(girl.state, "arise");
    run(girl, 0.5);
    assert.strictEqual(girl.state, "stalk");
  });

  QUnit.test("then she walks straight at the player at the table's speed, and does not run or loiter", (assert) => {
    const girl = make([0, 0, 30]);
    girl.state = "stalk";
    girl.yaw = Math.PI;
    const before = girl.distanceTo(player.position);
    run(girl, 3);
    const speed = (before - girl.distanceTo(player.position)) / 3;
    assert.true(Math.abs(speed - CREATURES.ghoul_girl.speed) < 0.15, `${speed.toFixed(2)} m/s`);
    assert.strictEqual(girl.state, "stalk");
  });

  QUnit.test("when she gets to arm's length she touches (the scare) and falls, and is gone when she has finished", (assert) => {
    const girl = make([0, 0, 6]);
    const events = run(girl, 30);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
    assert.false(events.includes("lunge"), "she does not rush");
    assert.true(girl.done);
  });

  QUnit.test("she falls well short of arm's length, never nearer", (assert) => {
    const girl = make([0, 0, 6]);
    let nearest = Infinity;
    for (let t = 0; t < 30; t += 0.02) {
      girl.update(0.02, player);
      girl.events = [];
      nearest = Math.min(nearest, girl.distanceTo(player.position));
    }
    assert.true(nearest > CREATURES.ghoul_girl.fallAt * 0.9, `${nearest.toFixed(2)} m`);
  });

  QUnit.test("her fall takes as long as the animation of it", (assert) => {
    const girl = make([0, 0, 2.6]);
    girl.state = "stalk";
    girl.update(0.05, player);
    assert.strictEqual(girl.state, "dying");
    assert.strictEqual(girl.timer, CREATURES.ghoul_girl.deathTime);
  });

  QUnit.test("she can be hurt or captured while she rises and walks, and then she falls the same way", (assert) => {
    const girl = make();
    assert.true(girl.alive);
    assert.true(girl.capture());
    assert.strictEqual(girl.state, "dying");
  });
});
