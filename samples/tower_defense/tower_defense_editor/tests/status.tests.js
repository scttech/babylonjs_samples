QUnit.module("Status", () => {
  // Lets a status go by in steps of a fiftieth of a second, and adds up what it says.
  const run = (status, seconds) => {
    let burn = 0;
    let last = { speed: 1 };
    for (let t = 0; t < seconds - 1e-9; t += 0.02) {
      last = status.update(0.02);
      burn += last.burn;
    }
    return { burn, speed: last.speed };
  };

  QUnit.test("a status with nothing on it walks at the usual speed and burns nothing", (assert) => {
    const status = new Status();

    assert.deepEqual(status.update(1), { speed: 1, burn: 0 });
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("a slow makes it walk at the share the table says, for as long as the table says, and then it is over", (assert) => {
    const status = new Status();
    assert.true(status.apply("slow").applied);

    assert.strictEqual(status.update(0.02).speed, EFFECTS.slow.speed);
    assert.true(status.has("slow"));
    run(status, EFFECTS.slow.seconds + 0.1);
    assert.strictEqual(status.update(0.02).speed, 1);
    assert.false(status.has("slow"));
  });

  QUnit.test("a stun stops it, and beats a slow that is on it at the same time", (assert) => {
    const status = new Status();
    status.apply("slow");
    status.apply("stun");

    assert.strictEqual(status.update(0.02).speed, 0);
  });

  QUnit.test("a burn does its damage a second, for its time, and not a moment more", (assert) => {
    const status = new Status();
    status.apply("burn");
    const total = run(status, EFFECTS.burn.seconds + 1).burn;

    assert.true(Math.abs(total - EFFECTS.burn.damage * EFFECTS.burn.seconds) < 1e-6, `${total}`);
  });

  QUnit.test("a burn that runs out part of the way through a step only burns for what was left", (assert) => {
    const status = new Status();
    status.apply("burn");
    const burned = status.update(100).burn;

    assert.true(Math.abs(burned - EFFECTS.burn.damage * EFFECTS.burn.seconds) < 1e-9);
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("the same step in many parts or in one gives the same damage", (assert) => {
    const a = new Status();
    const b = new Status();
    a.apply("burn");
    b.apply("burn");

    assert.true(Math.abs(run(a, 2).burn - b.update(2).burn) < 1e-9);
  });

  QUnit.test("a stronger effect lasts longer, which is how a tower that is upgraded is better", (assert) => {
    const weak = new Status();
    const strong = new Status();
    weak.apply("slow", 1);
    strong.apply("slow", 2);
    run(weak, 3);
    run(strong, 3);

    assert.false(weak.has("slow"));
    assert.true(strong.has("slow"));
  });

  QUnit.test("the same effect again does not add to it: it lasts as long as the longer", (assert) => {
    const status = new Status();
    status.apply("slow", 1);
    run(status, 2);
    status.apply("slow", 1);
    run(status, 2);

    assert.true(status.has("slow"), "refreshed to its whole time, and not to double it");
    run(status, 1);
    assert.false(status.has("slow"));
  });

  QUnit.test("a shorter one does not make a longer one shorter", (assert) => {
    const status = new Status();
    status.apply("slow", 2);
    status.apply("slow", 0.5);
    run(status, 4);

    assert.true(status.has("slow"));
  });

  QUnit.test("a push is at once: it says how far, and leaves a mark for a moment and no more", (assert) => {
    const status = new Status();
    const result = status.apply("push");

    assert.deepEqual(result, { applied: true, push: EFFECTS.push.distance });
    assert.true(status.has("push"));
    assert.strictEqual(status.update(0.02).speed, 1, "it does not slow it");
    run(status, EFFECTS.push.seconds + 0.1);
    assert.false(status.has("push"));
  });

  QUnit.test("a push is as far as the strength says", (assert) => {
    assert.strictEqual(new Status().apply("push", 0.5).push, EFFECTS.push.distance * 0.5);
  });

  QUnit.test("an effect of no strength does nothing, and nothing is said to have taken", (assert) => {
    const status = new Status();

    assert.deepEqual(status.apply("slow", 0), { applied: false, push: 0 });
    assert.deepEqual(status.apply("stun", -1), { applied: false, push: 0 });
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("a name that isn't an effect does nothing", (assert) => {
    assert.false(new Status().apply("rust").applied);
  });

  QUnit.test("an enemy that has been stunned can't be again straight away, and can once it has had its time", (assert) => {
    const status = new Status();
    assert.true(status.apply("stun").applied);
    run(status, EFFECTS.stun.seconds + 0.1);
    assert.false(status.has("stun"), "it is up again");

    assert.false(status.apply("stun").applied, "but not stunned again");
    run(status, EFFECTS.stun.immune + 0.1);
    assert.true(status.apply("stun").applied, "until it has had its time");
  });

  QUnit.test("so a tower that stuns all the time still leaves an enemy most of its time moving", (assert) => {
    const status = new Status();
    let moving = 0;
    let total = 0;
    for (let t = 0; t < 60; t += 0.02) {
      status.apply("stun");
      if (status.update(0.02).speed > 0) moving++;
      total++;
    }

    assert.true(moving / total > 0.6, `${(moving / total).toFixed(2)} of the time`);
  });

  QUnit.test("the kinds it is under are in the order they were put on", (assert) => {
    const status = new Status();
    status.apply("burn");
    status.apply("slow");

    assert.deepEqual(status.kinds, ["burn", "slow"]);
  });
});
