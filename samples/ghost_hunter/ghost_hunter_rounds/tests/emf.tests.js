const dPlayer = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
const src = (kind, x, z, key = `${kind}-${x}-${z}`) => ({ key, kind, position: [x, 0, z] });

QUnit.module("nearness and the EMF meter", () => {
  QUnit.test("nearness is 1 on the spot, 0 at the range and beyond, and falls off by a power", (assert) => {
    assert.strictEqual(nearness(0, 10), 1);
    assert.strictEqual(nearness(10, 10), 0);
    assert.strictEqual(nearness(25, 10), 0);
    assert.true(nearness(2, 10, 2) > nearness(8, 10, 2));
    assert.true(nearness(5, 10, 2) < nearness(5, 10, 1), "a higher power is a steeper fall");
  });

  QUnit.test("with nothing about, the meter reads nothing", (assert) => {
    const reading = emfReading([], dPlayer);
    assert.deepEqual([reading.strength, reading.level, reading.nearest], [0, 0, null]);
  });

  QUnit.test("a ghost close by lights the meter, further away less, and out of reach not at all", (assert) => {
    const at = (distance) => emfReading([src("ghost", 0, distance)], dPlayer).level;
    assert.strictEqual(at(0.5), 5);
    assert.true(at(3) > at(6), `${at(3)} lights at 3 m and ${at(6)} at 6`);
    assert.strictEqual(at(DETECT.emf.range + 1), 0);
  });

  QUnit.test("a ghost stirs it more than a spider at the same distance, and it names what stirs it", (assert) => {
    const ghost = emfReading([src("ghost", 0, 3, "g1")], dPlayer);
    const spider = emfReading([src("spider", 0, 3, "s1")], dPlayer);
    assert.true(ghost.strength > spider.strength);
    const both = emfReading([src("spider", 0, 1, "s1"), src("ghost", 0, 5, "g1")], dPlayer);
    assert.strictEqual(both.nearest, both.strength === emfReading([src("spider", 0, 1, "s1")], dPlayer).strength ? "s1" : "g1");
  });

  QUnit.test("a kind with no weight in the table still counts a little, and the meter never reads over 1", (assert) => {
    assert.true(emfReading([src("thing", 0, 1)], dPlayer).strength > 0);
    assert.true(emfReading([src("ghost", 0, 0)], dPlayer).strength <= 1);
  });

  QUnit.test("the meter ticks faster with each light, and not at all with none", (assert) => {
    assert.strictEqual(emfTickRate(0), 0);
    for (let level = 1; level < 5; level++) assert.true(emfTickRate(level + 1) > emfTickRate(level));
  });
});
