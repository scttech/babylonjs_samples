const peekRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

QUnit.module("a creature that peeks", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const plan = { from: [3, 3.5], to: [1.5, 3.5], side: 1, pop: false };
  const make = (peek = plan, kind = "ghoul_girl") => new Creature({ id: 1, kind, position: [0, 0, 0], random: () => 0.5, peek });

  QUnit.test("it begins hidden, leans out, stays, draws back and is gone", (assert) => {
    const creature = make();
    assert.strictEqual(creature.state, "peek");
    assert.deepEqual([creature.position[0], creature.position[2]], plan.from);
    const seen = [];
    for (let t = 0; t < 8 && !creature.done; t += 0.05) {
      creature.update(0.05, player);
      seen.push(creature.lean);
    }
    assert.true(creature.done, "it goes");
    assert.true(Math.max(...seen) > 0.99, "it leans all the way out");
    assert.true(seen[0] < 0.1, "from nothing");
    const length = creature.peek.inTime + creature.peek.hold + creature.peek.outTime;
    assert.true(length > 2.5 && length < 4.5, `${length.toFixed(1)} seconds`);
  });

  QUnit.test("it tells of itself once, and faces the player", (assert) => {
    const creature = make();
    const events = [];
    for (let t = 0; t < 8; t += 0.05) {
      creature.update(0.05, player);
      events.push(...creature.events);
      creature.events = [];
    }
    assert.deepEqual(events, ["peek"]);
    const toward = Math.atan2(player.position[0] - creature.position[0], player.position[2] - creature.position[2]);
    assert.true(Math.abs(creature.yaw - toward) < 1e-6);
  });

  QUnit.test("a pop is there at once, with a strike, and gone in a second or two", (assert) => {
    const creature = make({ ...plan, pop: true });
    assert.deepEqual([creature.position[0], creature.position[2]], plan.to, "it is where it can be seen");
    creature.update(0.02, player);
    assert.deepEqual(creature.events, ["pop"]);
    assert.true(creature.lean > 0.99, "no leaning out");
    let time = 0.02;
    while (!creature.done && time < 10) {
      creature.update(0.02, player);
      time += 0.02;
    }
    assert.true(time > 0.9 && time < 2.2, `${time.toFixed(2)} seconds`);
  });

  QUnit.test("it can be hit while it is out, and falls the way anything does", (assert) => {
    const creature = make();
    for (let t = 0; t < 1.5; t += 0.05) creature.update(0.05, player);
    assert.true(creature.alive);
    creature.capture();
    assert.strictEqual(creature.state, "dying");
  });

  QUnit.test("its body tilts towards the middle of the view, only while it leans", (assert) => {
    const creature = make();
    assert.strictEqual(peekTilt(creature), 0);
    creature.lean = 1;
    assert.true(Math.abs(Math.abs(peekTilt(creature)) - PEEK.lean) < 1e-9);
    const left = make({ ...plan, side: -1 });
    left.lean = 1;
    assert.strictEqual(Math.sign(peekTilt(left)), -Math.sign(peekTilt(creature)), "the other way from the other side");
    assert.strictEqual(peekTilt({ peek: null, lean: 1 }), 0, "a creature that does not peek never tilts");
  });
});

QUnit.module("where a peek goes", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const halfFov = 30;

  QUnit.test("from the edge: hidden just outside the view, and out just inside it, on one side", (assert) => {
    for (let seed = 1; seed < 40; seed++) {
      const random = peekRandom(seed);
      const peek = peekAtEdge(player, halfFov, PEEKS, random);
      const hidden = bearingTo(player, [peek.from[0], 0, peek.from[1]]);
      const out = bearingTo(player, [peek.to[0], 0, peek.to[1]]);
      assert.true(Math.abs(hidden) > halfFov + PEEKS.hidden - 0.5, `hidden at ${hidden.toFixed(1)}`);
      assert.true(Math.abs(out) < halfFov, `out at ${out.toFixed(1)}`);
      assert.strictEqual(Math.sign(hidden), peek.side);
      assert.strictEqual(Math.sign(out), peek.side);
      const distance = Math.hypot(peek.to[0], peek.to[1]);
      assert.true(distance >= PEEKS.distance[0] - 0.01 && distance <= PEEKS.distance[1] + 0.01);
    }
  });

  QUnit.test("a pop is nearer than a peek", (assert) => {
    for (let seed = 1; seed < 20; seed++) {
      const peek = peekAtEdge(player, halfFov, PEEKS, peekRandom(seed), true);
      assert.true(peek.pop);
      assert.true(Math.hypot(peek.to[0], peek.to[1]) <= PEEKS.popDistance[1] + 0.01);
    }
  });

  QUnit.test("from a marked spot: it waits behind it and leans out past it towards the middle of the view", (assert) => {
    for (const spot of [[3, 0, 5], [-4, 0, 6], [1, 0, 3]]) {
      const peek = peekAtSpot(player, spot, PEEKS);
      const hidden = Math.abs(bearingTo(player, [peek.from[0], 0, peek.from[1]]));
      const out = Math.abs(bearingTo(player, [peek.to[0], 0, peek.to[1]]));
      assert.true(out < hidden, `${out.toFixed(1)} is nearer the middle than ${hidden.toFixed(1)}`);
      assert.true(Math.hypot(peek.to[0] - spot[0], peek.to[1] - spot[2]) <= PEEKS.spotLean + 1e-6, "it only leans a little way");
    }
  });
});

QUnit.module("the one that sends peeks", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const state = (extra = {}) => ({ player, halfFov: 30, spots: [], active: 0, playing: true, ...extra });

  QUnit.test("nothing comes at first, or when the game is not on", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(3));
    for (let t = 0; t < PEEKS.first[0] - 1; t += 0.5) assert.strictEqual(peeker.update(0.5, state()), null);
    const waiting = new Peeker(PEEKS, peekRandom(3));
    for (let t = 0; t < 200; t += 0.5) assert.strictEqual(waiting.update(0.5, state({ playing: false })), null);
  });

  QUnit.test("none comes while something else is about, and it comes soon after", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(5));
    for (let t = 0; t < 60; t += 0.5) assert.strictEqual(peeker.update(0.5, state({ active: PEEKS.maxActive })), null);
    let waited = 0;
    while (!peeker.update(0.5, state()) && waited < 10) waited += 0.5;
    assert.true(waited <= 2.5, `${waited} seconds`);
  });

  QUnit.test("over an hour: peeks every half minute or so, a quarter of them pops, never closer together than the table says", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(11));
    const times = [];
    let pops = 0;
    for (let t = 0; t < 3600; t += 0.5) {
      const order = peeker.update(0.5, state());
      if (order) {
        times.push(t);
        if (order.peek.pop) pops += 1;
        assert.true(["ghoul_girl", "doll", "mummy", "skeleton", "spider"].includes(order.kind));
      }
    }
    assert.true(times.length > 60 && times.length < 180, `${times.length} peeks`);
    const share = pops / times.length;
    assert.true(share > 0.1 && share < 0.4, `${(share * 100).toFixed(0)}% pops`);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    assert.true(Math.min(...gaps) >= PEEKS.gap[0] - 0.5, `shortest gap ${Math.min(...gaps)}`);
  });

  QUnit.test("a spot in view is used sometimes; one out of view or too near never is", (assert) => {
    const peeker = new Peeker({ ...PEEKS, spotChance: 1 }, peekRandom(7));
    const inView = peeker.order(state({ spots: [[1, 0, 6]] }), false);
    assert.true(peeker.last.includes("marked spot"));
    assert.true(Math.hypot(inView.peek.to[0] - 1, inView.peek.to[1] - 6) <= PEEKS.spotLean + 1e-6);
    peeker.order(state({ spots: [[0, 0, -6]] }), false);
    assert.true(peeker.last.includes("the edge"), "behind the player");
    peeker.order(state({ spots: [[0, 0, 1]] }), false);
    assert.true(peeker.last.includes("the edge"), "too near");
  });
});
