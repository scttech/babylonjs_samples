// An enemy, as a tower sees one.
const foe = (x, z, progress = 0, done = false, health = 10, dead = false) => ({ x, z, progress, done, health, dead });

QUnit.module("distanceBetween and inRange", () => {
  QUnit.test("is how far apart two places are on the ground, along the straight line", (assert) => {
    assert.strictEqual(distanceBetween({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
    assert.strictEqual(distanceBetween({ x: -1, z: -1 }, { x: -1, z: 2 }), 3);
  });

  QUnit.test("does not care which way round, or how high things are", (assert) => {
    assert.strictEqual(distanceBetween({ x: 1, z: 2 }, { x: 4, z: 6 }), distanceBetween({ x: 4, z: 6 }, { x: 1, z: 2 }));
    assert.strictEqual(distanceBetween({ x: 0, z: 0, y: 9 }, { x: 3, z: 4, y: -9 }), 5);
  });

  QUnit.test("something exactly as far as the range is in range", (assert) => {
    assert.true(inRange({ x: 0, z: 0 }, { x: 3, z: 4 }, 5));
  });

  QUnit.test("something a little further is not", (assert) => {
    assert.false(inRange({ x: 0, z: 0 }, { x: 3, z: 4.01 }, 5));
  });

  QUnit.test("something in the same place is in range of any range, even none", (assert) => {
    assert.true(inRange({ x: 2, z: 2 }, { x: 2, z: 2 }, 0));
  });
});

QUnit.module("pickTarget", () => {
  const tower = { x: 0, z: 0 };

  QUnit.test("with nobody about, it is nobody", (assert) => {
    assert.strictEqual(pickTarget(tower, 5, []), null);
  });

  QUnit.test("nobody in range is nobody", (assert) => {
    assert.strictEqual(pickTarget(tower, 5, [foe(6, 0), foe(0, -9)]), null);
  });

  QUnit.test("`first` is the one furthest along the road, wherever it is in range", (assert) => {
    const far = foe(4, 0, 0.9);
    const near = foe(1, 0, 0.2);

    assert.strictEqual(pickTarget(tower, 5, [near, far], "first"), far);
    assert.strictEqual(pickTarget(tower, 5, [far, near], "first"), far);
  });

  QUnit.test("`first` is the default", (assert) => {
    const ahead = foe(4, 0, 0.9);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.2), ahead]), ahead);
  });

  QUnit.test("`last` is the one that has come the least way", (assert) => {
    const behind = foe(4, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.5), behind, foe(2, 0, 0.8)], "last"), behind);
  });

  QUnit.test("`closest` is the one nearest to the tower, and not the one furthest along", (assert) => {
    const near = foe(1, 1, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(4, 0, 0.9), near, foe(0, 3, 0.5)], "closest"), near);
  });

  QUnit.test("`strongest` is the one with the most health left", (assert) => {
    const tough = foe(3, 0, 0.1, false, 90);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 10), tough, foe(2, 0, 0.5, false, 40)], "strongest"), tough);
  });

  QUnit.test("an enemy that has fallen is not picked, though it is still there on the ground", (assert) => {
    const standing = foe(4, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 0, true), standing]), standing);
    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 0, true)]), null);
  });

  QUnit.test("an enemy out of range is not picked, however far along it is", (assert) => {
    const inside = foe(2, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(9, 0, 0.99), inside], "first"), inside);
  });

  QUnit.test("an enemy that has got to the end is not picked", (assert) => {
    const walking = foe(2, 0, 0.5);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 1, true), walking]), walking);
    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 1, true)]), null);
  });

  QUnit.test("a tie goes to the one that is first in the list", (assert) => {
    const a = foe(1, 0, 0.5);
    const b = foe(-1, 0, 0.5);

    assert.strictEqual(pickTarget(tower, 5, [a, b], "first"), a);
    assert.strictEqual(pickTarget(tower, 5, [b, a], "first"), b);
  });

  QUnit.test("a bigger range sees more", (assert) => {
    const enemies = [foe(3, 0, 0.1), foe(7, 0, 0.9)];

    assert.strictEqual(pickTarget(tower, 4, enemies), enemies[0]);
    assert.strictEqual(pickTarget(tower, 8, enemies), enemies[1]);
  });

  QUnit.test("it does not change the list it is given", (assert) => {
    const enemies = [foe(1, 0, 0.5), foe(2, 0, 0.6)];
    pickTarget(tower, 5, enemies, "last");

    assert.deepEqual(enemies.map((e) => e.progress), [0.5, 0.6]);
  });
});

QUnit.module("TARGET_MODES", () => {
  QUnit.test("there are four ways to choose, and each is a function of an enemy", (assert) => {
    assert.deepEqual(Object.keys(TARGET_MODES), ["first", "last", "closest", "strongest"]);
    for (const score of Object.values(TARGET_MODES)) assert.strictEqual(typeof score(foe(1, 1, 0.5), { x: 0, z: 0 }), "number");
  });

  QUnit.test("`first` and `last` are opposites", (assert) => {
    const e = foe(0, 0, 0.3);

    assert.strictEqual(TARGET_MODES.first(e), -TARGET_MODES.last(e));
  });
});
