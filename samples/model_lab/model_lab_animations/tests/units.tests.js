QUnit.module("formatBytes", () => {
  QUnit.test("says small numbers in bytes", (assert) => {
    assert.strictEqual(formatBytes(0), "0 B");
    assert.strictEqual(formatBytes(512), "512 B");
  });

  QUnit.test("says larger ones in kilobytes and megabytes, a thousand and twenty-four at a time", (assert) => {
    assert.strictEqual(formatBytes(1024), "1.0 KB");
    assert.strictEqual(formatBytes(1536), "1.5 KB");
    assert.strictEqual(formatBytes(4 * 1024 * 1024), "4.0 MB");
  });

  QUnit.test("does not make up an answer for a number that is not one", (assert) => {
    assert.strictEqual(formatBytes(NaN), "unknown");
    assert.strictEqual(formatBytes(-5), "unknown");
    assert.strictEqual(formatBytes(undefined), "unknown");
  });
});

QUnit.module("formatCount", () => {
  QUnit.test("puts commas in big numbers", (assert) => {
    assert.strictEqual(formatCount(10014), "10,014");
    assert.strictEqual(formatCount(7), "7");
  });

  QUnit.test("says unknown for what is not a number", (assert) => {
    assert.strictEqual(formatCount(NaN), "unknown");
  });
});

QUnit.module("guessUnits", () => {
  QUnit.test("a person that is about two tall is in metres", (assert) => {
    assert.strictEqual(guessUnits(1.8).name, "metres");
    assert.strictEqual(guessUnits(1.8).toMetres, 1);
  });

  QUnit.test("a person that is about two hundred tall is in centimetres", (assert) => {
    assert.strictEqual(guessUnits(180).name, "centimetres");
    assert.strictEqual(guessUnits(180).toMetres, 0.01);
  });

  QUnit.test("a person that is about two thousand tall is in millimetres", (assert) => {
    assert.strictEqual(guessUnits(1800).name, "millimetres");
    assert.strictEqual(guessUnits(1800).toMetres, 0.001);
  });

  QUnit.test("a size that no person has is a guess that says it cannot tell", (assert) => {
    for (const height of [0, -1, 0.01, 20, 20000, NaN]) {
      assert.strictEqual(guessUnits(height).sure, false, `height ${height}`);
      assert.strictEqual(guessUnits(height).toMetres, 1);
    }
  });

  QUnit.test("the table's ranges do not overlap", (assert) => {
    for (let i = 1; i < UNIT_GUESSES.length; i++) assert.ok(UNIT_GUESSES[i].from > UNIT_GUESSES[i - 1].to, UNIT_GUESSES[i].name);
  });
});

QUnit.module("heightInMetres", () => {
  QUnit.test("turns the file's numbers into metres by the guess", (assert) => {
    assert.strictEqual(heightInMetres(1.8), 1.8);
    assert.ok(Math.abs(heightInMetres(180) - 1.8) < 1e-9);
    assert.ok(Math.abs(heightInMetres(1800) - 1.8) < 1e-9);
  });
});

QUnit.module("formatSize", () => {
  QUnit.test("writes the three sides, with no spare zeros", (assert) => {
    assert.strictEqual(formatSize({ x: 0.9, y: 1.8, z: 0.4 }), "0.9 x 1.8 x 0.4 m");
    assert.strictEqual(formatSize({ x: 1, y: 2, z: 3 }, "cm"), "1 x 2 x 3 cm");
  });

  QUnit.test("big numbers have no decimals", (assert) => {
    assert.strictEqual(formatSize({ x: 104.6, y: 180.2, z: 140.9 }, "cm"), "105 x 180 x 141 cm");
  });
});

QUnit.module("formatSeconds", () => {
  QUnit.test("short times are seconds, and long ones are minutes and seconds", (assert) => {
    assert.strictEqual(formatSeconds(0.633), "0.63 s");
    assert.strictEqual(formatSeconds(125), "2:05");
  });

  QUnit.test("says unknown for what is not a time", (assert) => {
    assert.strictEqual(formatSeconds(-1), "unknown");
    assert.strictEqual(formatSeconds(NaN), "unknown");
  });
});
