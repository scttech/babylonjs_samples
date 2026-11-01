QUnit.module("seededRandom", () => {
  const take = (random, n) => Array.from({ length: n }, () => random());

  QUnit.test("the same seed gives the same numbers, every time", (assert) => {
    assert.deepEqual(take(seededRandom(5), 20), take(seededRandom(5), 20));
  });

  QUnit.test("a different seed gives different numbers", (assert) => {
    assert.notDeepEqual(take(seededRandom(5), 20), take(seededRandom(6), 20));
  });

  QUnit.test("every number is from 0 up to, but not including, 1", (assert) => {
    for (const n of take(seededRandom(1), 2000)) assert.true(n >= 0 && n < 1);
  });

  QUnit.test("the numbers are spread out evenly: a thousand of them average about a half", (assert) => {
    const numbers = take(seededRandom(3), 1000);
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;

    assert.true(Math.abs(mean - 0.5) < 0.05);
  });

  QUnit.test("each number is the next in a list, so two functions with the same seed do not share it", (assert) => {
    const a = seededRandom(9);
    const b = seededRandom(9);
    a();
    a();

    assert.strictEqual(b(), take(seededRandom(9), 1)[0]);
  });
});
