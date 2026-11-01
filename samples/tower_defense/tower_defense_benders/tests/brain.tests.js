QUnit.module("angles", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("wrapAngle leaves an angle that is already in range alone", (assert) => {
    for (const a of [0, 1, -1, 3, -3, Math.PI]) assert.true(near(wrapAngle(a), a), `${a}`);
  });

  QUnit.test("wrapAngle brings a bigger angle back round, and a smaller one", (assert) => {
    assert.true(near(wrapAngle(2 * Math.PI + 1), 1));
    assert.true(near(wrapAngle(-2 * Math.PI - 1), -1));
    assert.true(near(wrapAngle(7 * Math.PI), Math.PI));
  });

  QUnit.test("a half turn is a half turn the same way whichever way it is written", (assert) => {
    assert.true(near(wrapAngle(Math.PI), Math.PI));
    assert.true(near(wrapAngle(-Math.PI), Math.PI));
  });

  QUnit.test("angleDifference is the short way round: just past the half turn is a small turn the other way", (assert) => {
    assert.true(near(angleDifference(3, -3), 2 * Math.PI - 6), "from 3 to -3 is a little further round the same way, and not nearly all the way back");
    assert.true(near(angleDifference(-3, 3), -(2 * Math.PI - 6)));
    assert.true(near(angleDifference(0, 1), 1));
    assert.true(near(angleDifference(1, 0), -1));
  });

  QUnit.test("turnToward goes the whole way when it is near enough", (assert) => {
    assert.true(near(turnToward(0, 0.2, 0.5), 0.2));
    assert.true(near(turnToward(0, -0.2, 0.5), -0.2));
  });

  QUnit.test("turnToward goes no further than the step, in the right direction", (assert) => {
    assert.true(near(turnToward(0, 2, 0.5), 0.5));
    assert.true(near(turnToward(0, -2, 0.5), -0.5));
  });

  QUnit.test("turnToward goes the short way round, across the half turn", (assert) => {
    const next = turnToward(3, -3, 0.1);

    assert.true(near(next, wrapAngle(3.1)), "from 3 towards -3 is up, through the half turn, and not down through zero");
  });

  QUnit.test("turnToward gets there in the end, from anywhere", (assert) => {
    for (const [from, to] of [[0, 3], [3, -3], [-2, 2], [1, 1], [3.1, -3.1]]) {
      let angle = from;
      for (let i = 0; i < 100; i++) angle = turnToward(angle, to, 0.2);

      assert.true(Math.abs(angleDifference(angle, to)) < 1e-9, `${from} to ${to}`);
    }
  });

  QUnit.test("facing is the yaw that points a model that faces along z at a place", (assert) => {
    const here = { x: 0, z: 0 };

    assert.true(near(facing(here, { x: 0, z: 5 }), 0), "more z is straight ahead");
    assert.true(near(facing(here, { x: 5, z: 0 }), Math.PI / 2), "more x is a quarter turn");
    assert.true(near(facing(here, { x: -5, z: 0 }), -Math.PI / 2));
    assert.true(near(Math.abs(facing(here, { x: 0, z: -5 })), Math.PI), "less z is behind");
  });

  QUnit.test("facing agrees with the walking enemies: it is the same angle pointAlong gives", (assert) => {
    const route = makeRoute([{ x: 0, z: 0 }, { x: 3, z: 4 }]);

    assert.true(near(facing({ x: 0, z: 0 }, { x: 3, z: 4 }), pointAlong(route, 1).yaw));
  });
});

QUnit.module("an attack in the BENDERS table", () => {
  QUnit.test("it lasts its length over its speed, and the hand is out that share of the way through", (assert) => {
    const attack = { seconds: 3, speed: 2, hitAt: 0.4 };

    assert.strictEqual(attackDuration(attack), 1.5);
    assert.true(Math.abs(hitTime(attack) - 0.6) < 1e-12);
  });

  QUnit.test("for every bender, the hand is out before the attack is over", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(hitTime(spec.attack) < attackDuration(spec.attack), kind);
  });

  QUnit.test("and the cooldown is at least as long as the attack, so that an attack is never cut off by the next", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(spec.cooldown >= attackDuration(spec.attack), kind);
  });

  QUnit.test("every attack is over in about a second and a half or less, which is as long as a person will watch one", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(attackDuration(spec.attack) <= 1.6, kind);
  });
});

QUnit.module("TowerBrain", () => {
  // A bender that is easy to work out: an attack of one second, with the hand out at a half, a cooldown of two
  // seconds, and a range of five. It points straight ahead.
  const spec = { range: 5, cooldown: 2, attack: { seconds: 1, speed: 1, hitAt: 0.5, aim: 0 } };
  const at = { x: 0, z: 0 };
  const enemy = (x, z, progress = 0.5) => ({ x, z, progress, done: false });

  // Runs the brain for `seconds` in steps of a fiftieth of a second, and gives back every event, with when it was.
  const run = (brain, seconds, enemies) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += 0.02) for (const event of brain.update(0.02, enemies)) events.push({ ...event, time: Math.round((t + 0.02) * 100) / 100 });
    return events;
  };

  QUnit.test("begins idle, facing the way it rests, with nothing to shoot at", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.strictEqual(brain.state, "idle");
    assert.strictEqual(brain.yaw, BRAIN.rest);
    assert.strictEqual(brain.target, null);
  });

  QUnit.test("with no enemies it does nothing: no events, and it stays facing where it was", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.deepEqual(run(brain, 5, []), []);
    assert.strictEqual(brain.yaw, BRAIN.rest);
  });

  QUnit.test("an enemy out of range is ignored", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.deepEqual(run(brain, 3, [enemy(9, 0)]), []);
    assert.strictEqual(brain.target, null);
  });

  QUnit.test("an enemy in range is looked at: it turns to it, and no faster than its turn rate", (assert) => {
    const brain = new TowerBrain(spec, at);
    const e = enemy(5, 0); // a quarter turn to the right of straight ahead
    brain.update(0.01, [e]);

    assert.strictEqual(brain.target, e);
    assert.true(Math.abs(angleDifference(BRAIN.rest, brain.yaw)) <= BRAIN.turnRate * 0.01 + 1e-9);
    assert.true(Math.abs(angleDifference(BRAIN.rest, brain.yaw)) > 0, "it has started to turn");
  });

  QUnit.test("it takes time to turn: it does not start an attack until it is facing the enemy", (assert) => {
    const brain = new TowerBrain(spec, at);
    const e = enemy(0, 4); // straight ahead is along z, and it is facing the other way, a half turn off
    const events = run(brain, 2, [e]);
    const start = events.find((event) => event.type === "start");

    assert.true(start.time > 0.1, `it started at ${start.time}`);
    assert.true(Math.abs(angleDifference(brain.yaw, brain.yawFor(e))) <= BRAIN.aligned + 1e-9);
  });

  QUnit.test("an attack is a start, then a fire half way through, then an end, in that order, at the right times", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = run(brain, 1.5, [e]);

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "end"]);
    assert.true(Math.abs(events[1].time - events[0].time - 0.5) <= 0.02, "the hand is out half a second after the start");
    assert.true(Math.abs(events[2].time - events[0].time - 1) <= 0.02, "and the attack lasts a second");
  });

  QUnit.test("the start and the fire say who it is", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = run(brain, 1.5, [e]);

    assert.strictEqual(events[0].enemy, e);
    assert.strictEqual(events[1].enemy, e);
    assert.strictEqual(events[1].x, 0);
    assert.strictEqual(events[1].z, 3);
  });

  QUnit.test("it is attacking between the start and the end, and idle outside", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    brain.update(0.02, [e]);
    assert.strictEqual(brain.state, "attacking");
    for (let i = 0; i < 60; i++) brain.update(0.02, [e]);

    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("it waits for its cooldown: attacks begin that far apart, at the soonest", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const starts = run(brain, 10, [enemy(0, 3)]).filter((event) => event.type === "start").map((event) => event.time);

    assert.true(starts.length >= 4, `${starts.length} attacks`);
    starts.slice(1).forEach((time, i) => assert.true(time - starts[i] >= spec.cooldown - 0.021, `gap ${(time - starts[i]).toFixed(2)}`));
  });

  QUnit.test("and does not wait any longer than that, once it is facing the enemy", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const starts = run(brain, 10, [enemy(0, 3)]).filter((event) => event.type === "start").map((event) => event.time);

    starts.slice(1).forEach((time, i) => assert.true(time - starts[i] <= spec.cooldown + 0.05, `gap ${(time - starts[i]).toFixed(2)}`));
  });

  QUnit.test("the first attack does not have to wait for a cooldown that has not begun", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const first = run(brain, 0.2, [enemy(0, 3)]).find((event) => event.type === "start");

    assert.true(first.time <= 0.04);
  });

  QUnit.test("a fire is never without a start before it, or after an end, however long it runs", (assert) => {
    const brain = new TowerBrain(spec, at);
    const events = run(brain, 60, [enemy(2, 2), enemy(-1, 3, 0.9)]);
    let inside = false;
    let ok = true;
    for (const event of events) {
      if (event.type === "start") {
        ok = ok && !inside;
        inside = true;
      }
      if (event.type === "fire") ok = ok && inside;
      if (event.type === "end") {
        ok = ok && inside;
        inside = false;
      }
    }

    assert.true(ok);
    assert.true(events.filter((e) => e.type === "fire").length >= 25);
  });

  QUnit.test("while it attacks it keeps its target, even when a better one comes", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const first = enemy(0, 3, 0.2);
    const better = enemy(1, 3, 0.9);
    brain.update(0.02, [first]);
    const events = [];
    for (let i = 0; i < 40; i++) events.push(...brain.update(0.02, [first, better]));

    assert.strictEqual(events.find((event) => event.type === "fire").enemy, first);
  });

  QUnit.test("and a better one is taken for the next attack: `first` is the one furthest along", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const slow = enemy(0, 3, 0.2);
    const fast = enemy(1, 3, 0.9);
    const starts = run(brain, 6, [slow, fast]).filter((event) => event.type === "start");

    assert.true(starts.every((event) => event.enemy === fast));
  });

  QUnit.test("its mode can be changed, and a `closest` tower picks the nearest", (assert) => {
    const brain = new TowerBrain(spec, at, "closest");
    brain.yaw = 0;
    const near = enemy(0, 1, 0.1);
    const far = enemy(0, 4, 0.9);
    const start = run(brain, 1, [far, near]).find((event) => event.type === "start");

    assert.strictEqual(start.enemy, near);
  });

  QUnit.test("it follows its target while it attacks, so the shot goes where the enemy is", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [];
    for (let i = 0; i < 60; i++) {
      e.x += 0.02; // the enemy walks across
      events.push(...brain.update(0.02, [e]));
    }
    const fire = events.find((event) => event.type === "fire");

    assert.true(fire.x > 0.2, "it fires at where the enemy is, and not where it was when the attack began");
    assert.true(fire.x < e.x, "and the enemy has walked on since");
  });

  QUnit.test("an enemy that has gone by the time the hand is out is shot at where it was last", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [...brain.update(0.02, [e])];
    for (let i = 0; i < 60; i++) events.push(...brain.update(0.02, []));
    const fire = events.find((event) => event.type === "fire");

    assert.strictEqual(fire.enemy, e);
    assert.strictEqual(fire.z, 3);
  });

  QUnit.test("it turns to face where the attack points, and not where the body faces", (assert) => {
    const turned = new TowerBrain({ ...spec, attack: { ...spec.attack, aim: 0.5 } }, at);
    const e = enemy(0, 3);
    for (let i = 0; i < 100; i++) turned.update(0.02, [e]);

    assert.true(Math.abs(turned.yaw - (0 - 0.5)) < 0.02, `${turned.yaw}`);
  });

  QUnit.test("it takes its place in the world into account: a tower on the other side of the board turns the other way", (assert) => {
    const brain = new TowerBrain(spec, { x: 10, z: 0 });
    brain.update(0.02, []);
    const e = enemy(10, 3);
    for (let i = 0; i < 100; i++) brain.update(0.02, [e]);

    assert.true(Math.abs(brain.yaw) < 0.05);
  });

  QUnit.test("it does not fire at an enemy that has got to the end", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const done = { x: 0, z: 3, progress: 1, done: true };

    assert.deepEqual(run(brain, 5, [done]), []);
  });

  QUnit.test("a very long step does not skip the end of an attack, or lose track of the state", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [...brain.update(0.02, [e]), ...brain.update(5, [e])];

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "end"]);
    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("every bender in the table has a brain that can attack: it fires at an enemy ahead, in range", (assert) => {
    for (const [kind, benderSpec] of Object.entries(BENDERS)) {
      const brain = new TowerBrain(benderSpec, at);
      const e = enemy(0, benderSpec.range * 0.5);
      const events = run(brain, 3, [e]);

      assert.true(events.some((event) => event.type === "fire"), kind);
    }
  });
});
