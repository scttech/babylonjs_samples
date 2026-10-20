QUnit.module("Scout", () => {
  QUnit.test("starts where it is told to, and by default at 0", (assert) => {
    assert.strictEqual(new Scout().z, 0);
    assert.strictEqual(new Scout({ z: -9 }).z, -9);
  });

  QUnit.test("move(1) goes forward at its speed", (assert) => {
    const scout = new Scout({ speed: 10 });

    scout.move(1, 0.5);

    assert.strictEqual(scout.z, 5);
  });

  QUnit.test("move(-1) goes back", (assert) => {
    const scout = new Scout({ z: 20, speed: 10 });

    scout.move(-1, 0.5);

    assert.strictEqual(scout.z, 15);
  });

  QUnit.test("move(0) stands still", (assert) => {
    const scout = new Scout({ z: 3 });

    scout.move(0, 1);

    assert.strictEqual(scout.z, 3);
  });

  QUnit.test("can't go back past the start of the street", (assert) => {
    const scout = new Scout({ z: -9, min: -9, speed: 10 });

    scout.move(-1, 1);

    assert.strictEqual(scout.z, -9);
  });

  QUnit.test("can't go forward past the end of the street", (assert) => {
    const scout = new Scout({ z: 95, max: 100, speed: 10 });

    scout.move(1, 1);

    assert.strictEqual(scout.z, 100);
  });

  QUnit.test("reset() goes back to where it started", (assert) => {
    const scout = new Scout({ z: -9, speed: 10 });
    scout.move(1, 3);

    scout.reset();

    assert.strictEqual(scout.z, -9);
  });
});
