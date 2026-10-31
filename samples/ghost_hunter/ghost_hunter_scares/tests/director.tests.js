// A random number generator that gives the same numbers every time, so a hunt can be run twice and be the same (mulberry32, which is
// small and mixes its seed well: a poor one gives nearly the same first number for seeds that are next to each other).
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const facing = (x, z) => ({ position: [0, 1.4, 0], forward: [x, 0, z] });

QUnit.module("bearings and views", () => {
  QUnit.test("straight ahead is 0, to the right is positive, to the left negative, behind is 180", (assert) => {
    const player = facing(0, 1);
    assert.strictEqual(Math.round(bearingTo(player, [0, 0, 5])), 0);
    assert.strictEqual(Math.round(bearingTo(player, [5, 0, 0])), 90);
    assert.strictEqual(Math.round(bearingTo(player, [-5, 0, 0])), -90);
    assert.strictEqual(Math.round(Math.abs(bearingTo(player, [0, 0, -5]))), 180);
  });

  QUnit.test("it is the same whichever way the player faces", (assert) => {
    const player = facing(1, 0); // facing right
    assert.strictEqual(Math.round(bearingTo(player, [5, 0, 0])), 0);
    assert.strictEqual(Math.round(bearingTo(player, [0, 0, -5])), 90);
  });

  QUnit.test("the bearing is always between -180 and 180", (assert) => {
    const player = facing(0.3, 0.7);
    for (let a = 0; a < 360; a += 7) {
      const b = bearingTo(player, [Math.sin(toRadians(a)) * 4, 0, Math.cos(toRadians(a)) * 4]);
      assert.true(b >= -180 && b <= 180);
    }
  });

  QUnit.test("pointAt and bearingTo agree", (assert) => {
    const player = facing(0.6, 0.8);
    for (const bearing of [-170, -90, -20, 0, 35, 90, 170]) {
      const point = pointAt(player, bearing, 5);
      assert.true(Math.abs(bearingTo(player, point) - bearing) < 1e-6, `${bearing}`);
      assert.true(Math.abs(Math.hypot(point[0], point[2]) - 5) < 1e-9);
      assert.strictEqual(point[1], 0);
    }
  });

  QUnit.test("a phone held upright sees less sideways than a laptop", (assert) => {
    const phone = horizontalHalfFov(60, 9 / 19);
    const laptop = horizontalHalfFov(60, 16 / 9);
    assert.true(phone < 20 && laptop > 40);
    assert.true(Math.abs(horizontalHalfFov(60, 1) - 30) < 1e-9, "a square screen sees as much sideways as up");
  });

  QUnit.test("the view and a margin round it", (assert) => {
    const player = facing(0, 1);
    assert.true(inView(player, pointAt(player, 20, 5), 30));
    assert.false(inView(player, pointAt(player, 50, 5), 30));
    assert.true(inView(player, pointAt(player, 33, 5), 30, 6), "just outside the edge counts as in");
  });

  QUnit.test("a point on the map: the player in the middle, ahead at the top", (assert) => {
    const player = facing(0, 1);
    assert.deepEqual(mapPoint(player, [0, 0, 0], 10, 160).map(Math.round), [80, 80]);
    assert.deepEqual(mapPoint(player, [0, 0, 4], 10, 160).map(Math.round), [80, 40]);
    assert.deepEqual(mapPoint(player, [3, 0, 0], 10, 160).map(Math.round), [110, 80]);
  });
});

QUnit.module("choosing where and what", () => {
  const player = facing(0, 1);
  const half = 30;

  QUnit.test("something turns up out of the view, every time, at the table's distance", (assert) => {
    const random = seeded(7);
    let tried = 0, chosen = 0;
    for (let i = 0; i < 500; i++) {
      tried += 1;
      const spot = chooseSpawn(player, half, HUNT, random);
      if (!spot) continue;
      chosen += 1;
      assert.false(inView(player, spot.point, half, 0), `${spot.zone} at ${spot.bearing.toFixed(0)}`);
      assert.true(spot.distance >= HUNT.distance[0] && spot.distance <= HUNT.distance[1]);
    }
    assert.true(chosen > tried * 0.9, "it rarely has to give up");
  });

  QUnit.test("it uses every zone, behind most of all", (assert) => {
    const random = seeded(11);
    const counts = {};
    for (let i = 0; i < 800; i++) {
      const spot = chooseSpawn(player, half, HUNT, random);
      if (spot) counts[spot.zone] = (counts[spot.zone] || 0) + 1;
    }
    assert.true(counts.behind > counts.edge && counts.edge > counts.flank, JSON.stringify(counts));
    assert.true(counts.flank > 0);
  });

  QUnit.test("the edge is on both sides, and just outside the view", (assert) => {
    const random = seeded(3);
    const sides = new Set();
    for (let i = 0; i < 400; i++) {
      const [from, to] = zoneRange({ name: "edge" }, half, HUNT, random);
      assert.true(Math.min(Math.abs(from), Math.abs(to)) >= half + HUNT.edgeMargin[0] - 1e-9);
      assert.true(Math.max(Math.abs(from), Math.abs(to)) <= half + HUNT.edgeMargin[1] + 1e-9);
      sides.add(Math.sign(from));
    }
    assert.strictEqual(sides.size, 2);
  });

  QUnit.test("a view so wide that there is nowhere out of it to stand is refused, and not forced", (assert) => {
    const wide = { ...HUNT, zones: [{ name: "flank", from: 80, to: 115, weight: 1 }] };
    assert.strictEqual(chooseSpawn(player, 100, wide, seeded(1)), null);
  });

  QUnit.test("the weights are the table's: a spider is most likely when it is quiet, and a ghoul only when it is not", (assert) => {
    const random = seeded(5);
    const count = (tension, intensity) => {
      const counts = {};
      for (let i = 0; i < 600; i++) {
        const pick = chooseKind(tension, intensity, HUNT, random);
        counts[pick.kind] = (counts[pick.kind] || 0) + 1;
      }
      return counts;
    };
    assert.strictEqual(count(0, 1).ghoul, undefined, "none at no tension");
    assert.true(count(1, 1).ghoul > 100);
    assert.true(count(0, 1).spider > count(1, 1).spider);
  });

  QUnit.test("a kind that is not allowed yet at this intensity is never picked", (assert) => {
    const random = seeded(9);
    for (let i = 0; i < 300; i++) assert.strictEqual(chooseKind(1, 0.5, HUNT, random).kind, "spider");
  });

  QUnit.test("weights that add up to nothing pick nothing", (assert) => {
    assert.strictEqual(pickWeighted([{ w: 0 }], (x) => x.w, () => 0.5), null);
  });
});

QUnit.module("Director", () => {
  const world = (active = 0, player = facing(0, 1)) => ({ player, halfFov: 30, active });
  const run = (director, seconds, active = () => 0, step = 0.1) => {
    const orders = [];
    for (let t = 0; t < seconds; t += step) orders.push(...director.update(step, world(active())));
    return orders;
  };

  QUnit.test("nothing happens at first: the dread builds", (assert) => {
    const director = new Director({ ...HUNT }, seeded(1));
    assert.strictEqual(director.update(0.1, world()).length, 0);
    run(director, 3);
    assert.true(director.tension > 0.1 && director.tension < director.target);
  });

  QUnit.test("when it is high enough, something turns up, and the tension drops to the table's number", (assert) => {
    const director = new Director({ ...HUNT }, seeded(2));
    const orders = run(director, 30);
    assert.true(orders.length >= 1);
    assert.true(["spider", "skeleton", "ghoul"].includes(orders[0].kind));
    assert.true(director.tension <= 1);
    assert.strictEqual(director.spawned, orders.length);
  });

  QUnit.test("the rhythm: it takes about as long as the table says, and not exactly", (assert) => {
    const times = [];
    for (let seed = 1; seed <= 12; seed++) {
      const director = new Director({ ...HUNT }, seeded(seed));
      let t = 0;
      while (director.update(0.1, world()).length === 0 && t < 60) t += 0.1;
      times.push(t);
    }
    const slowest = HUNT.spawnAt[1] / HUNT.riseRate, quickest = HUNT.spawnAt[0] / HUNT.riseRate;
    assert.true(times.every((t) => t >= quickest - 0.2 && t <= slowest + 0.2), times.map((t) => t.toFixed(1)).join(", "));
    assert.true(new Set(times.map((t) => t.toFixed(1))).size > 3, "it is not on the beat");
  });

  QUnit.test("a higher intensity makes it come quicker", (assert) => {
    const timeFor = (intensity) => {
      const director = new Director({ ...HUNT, intensity }, seeded(4));
      let t = 0;
      while (director.update(0.1, world()).length === 0 && t < 100) t += 0.1;
      return t;
    };
    assert.true(timeFor(2) < timeFor(1) * 0.6);
  });

  QUnit.test("it does not send more than the player can bear: no more at once than the limit", (assert) => {
    const director = new Director({ ...HUNT }, seeded(3));
    let active = 0;
    for (let t = 0; t < 400; t += 0.1) {
      const orders = director.update(0.1, world(active));
      active += orders.length;
      assert.true(active <= director.limit);
    }
    assert.strictEqual(active, director.limit);
  });

  QUnit.test("the limit goes up with the intensity", (assert) => {
    assert.true(new Director({ ...HUNT, intensity: 4 }).limit > new Director({ ...HUNT, intensity: 1 }).limit);
    assert.true(new Director({ ...HUNT, intensity: 0.01 }).limit >= 1);
  });

  QUnit.test("a scare drops the dread and starts a rest, in which nothing turns up", (assert) => {
    const director = new Director({ ...HUNT }, seeded(5));
    director.tension = 0.9;
    director.noteScare();
    assert.strictEqual(director.tension, HUNT.afterScare);
    assert.strictEqual(director.resting, HUNT.cooldown);
    assert.strictEqual(run(director, HUNT.cooldown - 0.5).length, 0);
    assert.strictEqual(director.tension, HUNT.afterScare, "the tension does not rise in the rest");
    run(director, 1);
    assert.true(director.tension > HUNT.afterScare, "and then it does");
  });

  QUnit.test("a scare does not raise a tension that was lower", (assert) => {
    const director = new Director({ ...HUNT }, seeded(5));
    director.tension = 0.02;
    director.noteScare();
    assert.strictEqual(director.tension, 0.02);
  });

  QUnit.test("when it is switched off, nothing happens", (assert) => {
    const director = new Director({ ...HUNT, enabled: false }, seeded(6));
    assert.strictEqual(run(director, 200).length, 0);
    assert.strictEqual(director.tension, 0);
  });

  QUnit.test("it never turns up in the view, over a whole night of hunting", (assert) => {
    const director = new Director({ ...HUNT, intensity: 3 }, seeded(8));
    const player = facing(0.2, 1);
    for (let t = 0; t < 1200; t += 0.1) {
      for (const order of director.update(0.1, { player, halfFov: 30, active: 0 })) assert.false(inView(player, order.point, 30, 0), order.zone);
    }
    assert.true(director.spawned > 20);
  });

  QUnit.test("a spider sometimes starts in the air, and nothing else does", (assert) => {
    const director = new Director({ ...HUNT, intensity: 3, dropChance: 0.5 }, seeded(10));
    const orders = [];
    for (let t = 0; t < 1200; t += 0.1) orders.push(...director.update(0.1, world()));
    const drops = orders.filter((order) => order.point[1] > 0);
    assert.true(drops.length > 3);
    assert.true(drops.every((order) => order.kind === "spider" && order.point[1] === HUNT.dropHeight));
    assert.true(orders.some((order) => order.kind === "spider" && order.point[1] === 0));
  });

  QUnit.test("the same random gives the same hunt", (assert) => {
    const a = new Director({ ...HUNT }, seeded(21)), b = new Director({ ...HUNT }, seeded(21));
    assert.deepEqual(run(a, 120), run(b, 120));
  });

  QUnit.test("the table is sensible", (assert) => {
    assert.true(HUNT.spawnAt[0] < HUNT.spawnAt[1] && HUNT.spawnAt[1] <= 1);
    assert.true(HUNT.afterSpawn < HUNT.spawnAt[0], "the dread has to build again before the next one");
    assert.true(HUNT.afterScare <= HUNT.afterSpawn);
    assert.true(HUNT.distance[0] > 3, "not so near that it is on top of you when it appears");
    assert.true(HUNT.zones.every((zone) => zone.weight > 0));
  });
});

QUnit.module("a creature that starts in the air", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("falls, as fast as gravity says, and lands, and says so", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    assert.strictEqual(creature.state, "fall");
    let time = 0;
    const told = [];
    while (creature.state === "fall" && time < 3) {
      creature.update(0.01, player);
      told.push(...creature.events);
      creature.events = [];
      time += 0.01;
    }
    const expected = Math.sqrt((2 * 2.3) / CREATURE_GRAVITY);
    assert.true(Math.abs(time - expected) < 0.03, `${time.toFixed(2)} s, not ${expected.toFixed(2)} s`);
    assert.strictEqual(creature.position[1], 0);
    assert.strictEqual(creature.state, "lurk");
    assert.deepEqual(told, ["landed"]);
  });

  QUnit.test("it does not walk while it falls, and it goes fast, and then faster", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    creature.update(0.1, player);
    const first = 2.3 - creature.position[1];
    creature.update(0.1, player);
    const second = 2.3 - first - creature.position[1];
    assert.true(second > first);
    assert.strictEqual(creature.position[2], 6);
  });

  QUnit.test("a creature that starts on the floor does not fall", (assert) => {
    assert.strictEqual(new Creature({ id: 1, kind: "spider", position: [0, 0, 6] }).state, "lurk");
  });

  QUnit.test("it is a creature that can be hit while it falls, and its pose is finite", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    assert.true(creature.hit(1));
    assert.true(creature.pose().bones.every((bone) => bone.a.every(Number.isFinite)));
  });
});
