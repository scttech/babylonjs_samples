QUnit.module("shakeFade", () => {
  QUnit.test("starts at 1 and is 0 when the shake is over", (assert) => {
    assert.strictEqual(shakeFade(0, 0.4), 1);
    assert.strictEqual(shakeFade(0.4, 0.4), 0);
    assert.strictEqual(shakeFade(5, 0.4), 0);
  });

  QUnit.test("fades quickly at first and then settles: it is below a straight fade in the middle", (assert) => {
    assert.true(shakeFade(0.2, 0.4) < 0.5);
    assert.strictEqual(shakeFade(0.2, 0.4), 0.25);
  });

  QUnit.test("never goes up", (assert) => {
    let last = 1;
    for (let age = 0; age <= 0.4; age += 0.02) {
      const fade = shakeFade(age, 0.4);
      assert.true(fade <= last + 1e-12, `at ${age}`);
      last = fade;
    }
  });

  QUnit.test("a time before the start counts as the start", (assert) => {
    assert.strictEqual(shakeFade(-1, 0.4), 1);
  });
});

QUnit.module("shakeOffset", () => {
  QUnit.test("is never further than the strength", (assert) => {
    for (let age = 0; age < 0.5; age += 0.01) {
      const { x, y } = shakeOffset(age, 0.5, 0.4);
      assert.true(Math.hypot(x, y) <= 0.5 * Math.SQRT2 + 1e-9, `at ${age}`);
    }
  });

  QUnit.test("is nothing when the shake is over", (assert) => {
    assert.deepEqual(shakeOffset(0.4, 0.5, 0.4), { x: 0, y: 0 });
  });

  QUnit.test("a bigger strength throws the view further", (assert) => {
    const small = shakeOffset(0.05, 0.2, 0.4);
    const big = shakeOffset(0.05, 0.8, 0.4);

    assert.true(Math.hypot(big.x, big.y) > Math.hypot(small.x, small.y));
  });

  QUnit.test("across and up have a wobble of their own, so the view jumps about and doesn't slide to and fro", (assert) => {
    const ratios = new Set();
    for (const age of [0.01, 0.03, 0.05, 0.07]) {
      const { x, y } = shakeOffset(age, 1, 0.4);
      ratios.add(Math.round((x / y) * 100));
    }

    assert.true(ratios.size > 1);
  });

  QUnit.test("is the same every time for the same moment", (assert) => {
    assert.deepEqual(shakeOffset(0.123, 0.5, 0.4), shakeOffset(0.123, 0.5, 0.4));
  });
});

QUnit.module("Shake", () => {
  QUnit.test("starts still: no shake, and no offset", (assert) => {
    const shake = new Shake();

    assert.false(shake.active);
    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a knock starts a shake that moves the view", (assert) => {
    const shake = new Shake();

    shake.knock();
    shake.update(0.02);

    assert.true(shake.active);
    assert.notDeepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("it is over after its duration", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock();

    shake.update(0.3);
    assert.true(shake.active);

    shake.update(0.15);
    assert.false(shake.active);
    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a little knock is a smaller shake than a full one", (assert) => {
    const full = new Shake();
    const little = new Shake();
    full.knock(1);
    little.knock(0.25);
    full.update(0.03);
    little.update(0.03);

    assert.true(Math.hypot(full.offset.x, full.offset.y) > Math.hypot(little.offset.x, little.offset.y));
  });

  QUnit.test("strength can be changed while the game runs, and 0 means no shake at all", (assert) => {
    const shake = new Shake();
    shake.strength = 0;

    shake.knock();
    shake.update(0.03);

    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a knock in the middle of a shake starts it over", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock();
    shake.update(0.35);

    shake.knock();

    assert.strictEqual(shake.age, 0);
  });

  QUnit.test("but a small knock doesn't cut short a big shake that is still strong", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock(1);
    shake.update(0.05);

    shake.knock(0.2);

    assert.strictEqual(shake.age, 0.05);
    assert.strictEqual(shake.size, 1);
  });

  QUnit.test("time that doesn't pass (a pause) doesn't move a shake on", (assert) => {
    const shake = new Shake();
    shake.knock();
    shake.update(0.1);
    const before = shake.offset;

    shake.update(0);

    assert.deepEqual(shake.offset, before);
  });

  QUnit.test("update() with no shake does nothing", (assert) => {
    const shake = new Shake();

    shake.update(1);

    assert.false(shake.active);
  });
});
