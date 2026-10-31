QUnit.module("hash, flicker and envelope", () => {
  QUnit.test("a hash is the same for the same input, and between 0 and 1", (assert) => {
    assert.strictEqual(hash(5), hash(5));
    assert.notStrictEqual(hash(5), hash(6));
    for (let i = 0; i < 200; i++) assert.true(hash(i) >= 0 && hash(i) < 1);
  });

  QUnit.test("a flicker is never brighter than 1 or dimmer than the table says, however long it goes on", (assert) => {
    let lowest = 1, highest = 0;
    for (let t = 0; t < 120; t += 0.013) {
      const value = flicker(t, 3);
      lowest = Math.min(lowest, value);
      highest = Math.max(highest, value);
    }
    assert.true(highest <= 1 + 1e-9);
    assert.true(lowest >= 1 - GHOST.flickerDepth - 1e-9);
    assert.true(highest - lowest > 0.2, "it does flicker");
  });

  QUnit.test("a flicker with a depth of 0 does not", (assert) => {
    const still = { ...GHOST, flickerDepth: 0 };
    for (let t = 0; t < 10; t += 0.1) assert.strictEqual(flicker(t, 1, still), 1);
  });

  QUnit.test("two ghosts do not flicker together", (assert) => {
    let same = 0;
    for (let t = 0; t < 10; t += 0.1) if (Math.abs(flicker(t, 1) - flicker(t, 2)) < 1e-6) same += 1;
    assert.true(same < 5);
  });

  QUnit.test("a ghost is not there before it begins, appears smoothly, stays, and goes smoothly", (assert) => {
    assert.strictEqual(envelope(-1, null), 0);
    assert.strictEqual(envelope(0, null), 0);
    const half = envelope(GHOST.fadeIn / 2, null);
    assert.true(Math.abs(half - 0.5) < 1e-9, "halfway is half");
    assert.strictEqual(envelope(GHOST.fadeIn, null), 1);
    assert.strictEqual(envelope(100, null), 1);
    assert.strictEqual(envelope(10, 10), 1, "at the moment it starts to go it is all there");
    assert.true(Math.abs(envelope(10 + GHOST.fadeOut / 2, 10) - 0.5) < 1e-9);
    assert.strictEqual(envelope(10 + GHOST.fadeOut, 10), 0);
    assert.strictEqual(envelope(50, 10), 0);
  });

  QUnit.test("it never goes up when it should be going down", (assert) => {
    let last = 1;
    for (let age = 10; age < 10 + GHOST.fadeOut; age += 0.05) {
      const value = envelope(age, 10);
      assert.true(value <= last + 1e-12);
      last = value;
    }
  });
});

QUnit.module("bob, drift and turning", () => {
  QUnit.test("it bobs by no more than the table's height", (assert) => {
    for (let t = 0; t < 30; t += 0.1) assert.true(Math.abs(bob(t, 4)) <= GHOST.bobHeight + 1e-9);
  });

  QUnit.test("it drifts about its place, and no further than the radius", (assert) => {
    let wandered = 0;
    for (let t = 0; t < 120; t += 0.5) {
      const [x, z] = drift(t, 7);
      assert.true(Math.hypot(x, z) <= GHOST.driftRadius * 1.5);
      wandered = Math.max(wandered, Math.hypot(x, z));
    }
    assert.true(wandered > GHOST.driftRadius / 2);
  });

  QUnit.test("facingYaw is 0 straight ahead (z) and a quarter turn to the right (x)", (assert) => {
    assert.strictEqual(facingYaw([0, 0, 0], [0, 0, 5]), 0);
    assert.true(Math.abs(facingYaw([0, 0, 0], [5, 0, 0]) - Math.PI / 2) < 1e-9);
    assert.true(Math.abs(Math.abs(facingYaw([0, 0, 0], [0, 0, -5])) - Math.PI) < 1e-9);
  });

  QUnit.test("it turns towards a direction by a step, and arrives", (assert) => {
    assert.strictEqual(turnToward(0, 1, 0.25), 0.25);
    assert.strictEqual(turnToward(0, 0.1, 0.25), 0.1);
    assert.strictEqual(turnToward(0, -1, 0.25), -0.25);
  });

  QUnit.test("it turns the short way round the back", (assert) => {
    const result = turnToward(3, -3, 0.1); // the short way from 3 to -3 passes through pi
    assert.true(result > 3, "it goes up, through pi, and not back down through 0");
    assert.strictEqual(turnToward(3, -3, 0.5), -3, "and a step that is far enough arrives");
  });
});

QUnit.module("Apparition", () => {
  const home = [2, 0, 3];

  QUnit.test("waits for its delay, then appears, is there, and goes", (assert) => {
    const ghost = new Apparition({ id: 1, home, delay: 2 });
    assert.strictEqual(ghost.stage, "waiting");
    assert.strictEqual(ghost.opacity(), 0);
    ghost.update(2.1, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "appearing");
    ghost.update(GHOST.fadeIn, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "present");
    assert.true(ghost.opacity() > 0);
    ghost.vanish();
    ghost.update(0.01, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "fading");
    ghost.update(GHOST.fadeOut + 0.1, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "gone");
    assert.true(ghost.done);
  });

  QUnit.test("it fades of itself at the end of its life", (assert) => {
    const ghost = new Apparition({ id: 1, home, delay: 0, table: { ...GHOST, life: 5 } });
    ghost.update(0.1, [0, 0, 0]);
    for (let i = 0; i < 100; i++) ghost.update(0.1, [0, 0, 0]);
    assert.true(ghost.fadeStart !== null);
    for (let i = 0; i < 40; i++) ghost.update(0.1, [0, 0, 0]);
    assert.true(ghost.done);
  });

  QUnit.test("it is never more than the table's opacity", (assert) => {
    const ghost = new Apparition({ id: 2, home, delay: 0 });
    for (let i = 0; i < 400; i++) {
      ghost.update(0.05, [0, 0, 0]);
      assert.true(ghost.opacity() <= GHOST.opacity + 1e-9);
      assert.true(ghost.opacity() >= 0);
    }
  });

  QUnit.test("it floats above its place, and stays near it", (assert) => {
    const ghost = new Apparition({ id: 3, home, delay: 0 });
    for (let i = 0; i < 200; i++) {
      ghost.update(0.1, [0, 0, 0]);
      const [x, y, z] = ghost.position();
      assert.true(y >= GHOST.hover - GHOST.bobHeight - 1e-9);
      assert.true(Math.hypot(x - home[0], z - home[2]) < GHOST.driftRadius * 1.5);
    }
  });

  QUnit.test("it turns to face the player, and does not snap", (assert) => {
    const ghost = new Apparition({ id: 4, home: [0, 0, 5], delay: 0 });
    ghost.update(0.1, [5, 1.4, 5]); // the player is far to one side
    const first = ghost.yaw;
    assert.true(Math.abs(first) <= GHOST.turnRate * 0.1 + 1e-9, "one step only");
    for (let i = 0; i < 100; i++) ghost.update(0.1, [5, 1.4, 5]);
    assert.true(Math.abs(ghost.yaw - facingYaw(ghost.position(), [5, 1.4, 5])) < 0.05, "and in the end it faces the player");
  });

  QUnit.test("a ghost that has not shown itself is simply not coming when it is sent away", (assert) => {
    const ghost = new Apparition({ id: 5, home, delay: 3 });
    ghost.vanish();
    assert.true(ghost.done);
  });

  QUnit.test("sent away once it is there, it fades and does not pop", (assert) => {
    const ghost = new Apparition({ id: 6, home, delay: 0 });
    ghost.update(5, [0, 0, 0]);
    ghost.vanish();
    ghost.update(GHOST.fadeOut / 2, [0, 0, 0]);
    assert.false(ghost.done);
    assert.true(ghost.opacity() > 0 && ghost.opacity() < GHOST.opacity);
  });
});

QUnit.module("Haunting", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("summons a ghost to haunt a place, and tells of it", (assert) => {
    const haunting = new Haunting();
    const told = [];
    haunting.onChange(({ type, item }) => told.push(`${type} ${item.id}`));
    const ghost = haunting.summon([1, 0, 2], { placement: 7 });
    assert.strictEqual(ghost.placement, 7);
    assert.strictEqual(ghost.age, -GHOST.summonDelay);
    assert.deepEqual(told, ["added 1"]);
  });

  QUnit.test("tells of a ghost that has gone, and forgets it", (assert) => {
    const haunting = new Haunting();
    const told = [];
    haunting.onChange(({ type }) => told.push(type));
    haunting.summon([0, 0, 3], { delay: 0 }).vanish();
    haunting.update(0.1, player);
    haunting.update(10, player);
    assert.deepEqual(told, ["added", "removed"]);
    assert.strictEqual(haunting.items.length, 0);
  });

  QUnit.test("sends away the ghosts of a mark that was taken up, and only those", (assert) => {
    const haunting = new Haunting();
    const a = haunting.summon([0, 0, 3], { placement: 1, delay: 0 });
    const b = haunting.summon([3, 0, 3], { placement: 2, delay: 0 });
    haunting.update(5, player);
    haunting.banish(1);
    assert.true(a.fadeStart !== null);
    assert.strictEqual(b.fadeStart, null);
    haunting.banish();
    assert.true(b.fadeStart !== null);
  });

  QUnit.test("when there are too many, the oldest begins to go", (assert) => {
    const haunting = new Haunting({ ...GHOST, max: 2 });
    const first = haunting.summon([0, 0, 3], { delay: 0 });
    haunting.update(3, player);
    haunting.summon([1, 0, 3], { delay: 0 });
    haunting.summon([2, 0, 3], { delay: 0 });
    assert.true(first.fadeStart !== null);
  });

  QUnit.test("finds the nearest ghost that has shown itself", (assert) => {
    const haunting = new Haunting();
    assert.strictEqual(haunting.nearest([0, 0, 0]), null);
    const waiting = haunting.summon([0, 0, 1], { delay: 100 });
    const shown = haunting.summon([0, 0, 6], { delay: 0 });
    haunting.update(3, player);
    const near = haunting.nearest([0, 0, 0]);
    assert.strictEqual(near.item, shown, "a ghost that has not shown itself does not count");
    assert.true(near.distance > 5);
    assert.true(waiting.stage === "waiting");
  });

  QUnit.test("the table of the game is sensible", (assert) => {
    assert.true(GHOST.fadeIn > 0 && GHOST.fadeOut > 0);
    assert.true(GHOST.opacity > 0 && GHOST.opacity <= 1);
    assert.true(GHOST.flickerDepth >= 0 && GHOST.flickerDepth <= 1);
    assert.true(GHOST.life > GHOST.fadeIn);
    assert.true(GHOST.max >= 1);
  });
});
