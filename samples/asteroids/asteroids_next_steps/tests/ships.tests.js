QUnit.module("SHIPS", () => {
  QUnit.test("there is more than one ship to choose from", (assert) => {
    assert.true(SHIPS.length >= 2);
  });

  QUnit.test("every ship has an id, a name, a model file, and a correction rotation", (assert) => {
    for (const ship of SHIPS) {
      assert.true(typeof ship.id === "string" && ship.id.length > 0, `${ship.name}: id`);
      assert.true(typeof ship.name === "string" && ship.name.length > 0, `${ship.id}: name`);
      assert.true(/\.glb$/.test(ship.file), `${ship.id}: a .glb file`);
      for (const axis of ["x", "y", "z"]) {
        assert.true(Number.isFinite(ship.rotation[axis]), `${ship.id}: rotation.${axis} is a number`);
      }
    }
  });

  QUnit.test("ids and files are all different", (assert) => {
    assert.strictEqual(new Set(SHIPS.map((s) => s.id)).size, SHIPS.length, "ids");
    assert.strictEqual(new Set(SHIPS.map((s) => s.file)).size, SHIPS.length, "files");
  });
});

QUnit.module("ShipPicker", () => {
  const THREE = [{ id: "a" }, { id: "b" }, { id: "c" }];

  QUnit.test("starts on the first ship", (assert) => {
    const picker = new ShipPicker(THREE);

    assert.strictEqual(picker.index, 0);
    assert.strictEqual(picker.current.id, "a");
  });

  QUnit.test("can start somewhere else", (assert) => {
    assert.strictEqual(new ShipPicker(THREE, 2).current.id, "c");
  });

  QUnit.test("step(1) moves to the next ship and returns it", (assert) => {
    const picker = new ShipPicker(THREE);

    assert.strictEqual(picker.step(1).id, "b");
    assert.strictEqual(picker.current.id, "b");
  });

  QUnit.test("stepping forward past the last ship wraps to the first", (assert) => {
    const picker = new ShipPicker(THREE, 2);

    picker.step(1);

    assert.strictEqual(picker.current.id, "a");
  });

  QUnit.test("stepping back from the first ship wraps to the last", (assert) => {
    const picker = new ShipPicker(THREE);

    picker.step(-1);

    assert.strictEqual(picker.current.id, "c");
  });

  QUnit.test("stepping all the way around lands back where it started", (assert) => {
    const picker = new ShipPicker(THREE, 1);

    for (let i = 0; i < THREE.length; i++) picker.step(1);

    assert.strictEqual(picker.index, 1);
  });

  QUnit.test("with only one ship, stepping stays on it", (assert) => {
    const picker = new ShipPicker([{ id: "only" }]);

    picker.step(1);
    picker.step(-1);

    assert.strictEqual(picker.current.id, "only");
  });

  QUnit.test("by default it chooses from the real SHIPS table", (assert) => {
    assert.strictEqual(new ShipPicker().current, SHIPS[0]);
  });
});
