QUnit.module("thermal vision", () => {
  QUnit.test("the room is its own temperature with nothing about, and colder next to a ghost", (assert) => {
    assert.strictEqual(airTemperature([], dPlayer), DETECT.thermal.room);
    const cold = airTemperature([src("ghost", 0, 0.1)], dPlayer);
    assert.true(cold < DETECT.thermal.room - 10, `${cold}`);
    assert.true(airTemperature([src("ghost", 0, 4)], dPlayer) > cold);
    assert.strictEqual(airTemperature([src("ghost", 0, 30)], dPlayer), DETECT.thermal.room);
  });

  QUnit.test("it never reads below the least, and several ghosts are not colder than the coldest", (assert) => {
    const many = Array.from({ length: 6 }, (_, i) => src("ghost", 0, 0.1, `g${i}`));
    assert.strictEqual(airTemperature(many, dPlayer), airTemperature([many[0]], dPlayer));
    const table = { ...DETECT, cold: { ...DETECT.cold, ghost: 99 } };
    assert.strictEqual(airTemperature([src("ghost", 0, 0)], dPlayer, table), DETECT.thermal.coldest);
  });

  QUnit.test("the chill goes from nothing at the room's temperature to one at the coldest", (assert) => {
    assert.strictEqual(chillOf(DETECT.thermal.room), 0);
    assert.strictEqual(chillOf(DETECT.thermal.coldest), 1);
    assert.strictEqual(chillOf(100), 0);
    assert.strictEqual(chillOf(-50), 1);
    assert.true(Math.abs(chillOf((DETECT.thermal.room + DETECT.thermal.coldest) / 2) - 0.5) < 1e-9);
  });

  QUnit.test("the cold of a ghost shows it where the light is not on it, more the nearer", (assert) => {
    assert.true(thermalReveal(src("ghost", 0, 2), dPlayer) > thermalReveal(src("ghost", 0, 6), dPlayer));
    assert.strictEqual(thermalReveal(src("ghost", 0, 30), dPlayer), 0);
  });
});
