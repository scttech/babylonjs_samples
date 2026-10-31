QUnit.module("hitPlane", () => {
  QUnit.test("a ray that goes down meets the floor", (assert) => {
    const hit = hitPlane([0, 1.4, 0], [0, -1, 1], 0);
    assert.deepEqual(hit.point.map((n) => Math.round(n * 1000) / 1000), [0, 0, 1.4]);
    assert.true(Math.abs(hit.distance - Math.hypot(1.4, 1.4)) < 1e-9);
  });

  QUnit.test("the length of the direction does not matter", (assert) => {
    const a = hitPlane([0, 1.4, 0], [0, -1, 1], 0);
    const b = hitPlane([0, 1.4, 0], [0, -10, 10], 0);
    assert.true(Math.abs(a.distance - b.distance) < 1e-9);
    assert.true(Math.abs(a.point[2] - b.point[2]) < 1e-9);
  });

  QUnit.test("a ray that runs level or upwards never does", (assert) => {
    assert.strictEqual(hitPlane([0, 1.4, 0], [0, 0, 1], 0), null);
    assert.strictEqual(hitPlane([0, 1.4, 0], [0, 1, 1], 0), null);
  });

  QUnit.test("a plane above the eye is met by a ray that goes up", (assert) => {
    assert.true(hitPlane([0, 1.4, 0], [0, 1, 0], 2.8) !== null);
  });
});

QUnit.module("findFloor", () => {
  QUnit.test("looking down at the floor gives a flat level surface", (assert) => {
    const floor = findFloor([0, 1.4, 0], [0, -0.7071, 0.7071]);
    assert.deepEqual(floor.normal, [0, 1, 0]);
    assert.true(floor.guessed);
    assert.true(Math.abs(floor.point[2] - 1.4) < 1e-3);
    assert.strictEqual(floor.point[1], 0);
  });

  QUnit.test("looking along the room gives nothing: that is not the floor", (assert) => {
    assert.strictEqual(findFloor([0, 1.4, 0], [0, 0, 1]), null);
    assert.strictEqual(findFloor([0, 1.4, 0], [0, -0.05, 1]), null);
    assert.strictEqual(findFloor([0, 1.4, 0], [0, 0.5, 1]), null);
  });

  QUnit.test("a floor too far away is not believed", (assert) => {
    const forward = [0, -Math.sin((SURFACE.minDownDegrees + 1) * Math.PI / 180), Math.cos((SURFACE.minDownDegrees + 1) * Math.PI / 180)];
    assert.strictEqual(findFloor([0, 1.4, 0], forward), null, "a shallow look meets the floor far away");
    assert.true(findFloor([0, 1.4, 0], forward, { ...SURFACE, maxDistance: 100 }) !== null);
  });

  QUnit.test("the numbers are the table's: a floor at another height", (assert) => {
    const floor = findFloor([0, 3, 0], [0, -1, 1], { ...SURFACE, floorY: 1 });
    assert.strictEqual(floor.point[1], 1);
    assert.true(Math.abs(floor.point[2] - 2) < 1e-9);
  });
});

QUnit.module("rotateByQuaternion and surfaceFromPose", () => {
  const near = (assert, got, want) => got.forEach((n, i) => assert.true(Math.abs(n - want[i]) < 1e-9, `${got} should be ${want}`));

  QUnit.test("no rotation changes nothing", (assert) => {
    near(assert, rotateByQuaternion([1, 2, 3], { x: 0, y: 0, z: 0, w: 1 }), [1, 2, 3]);
  });

  QUnit.test("a quarter turn about z turns x into y", (assert) => {
    const s = Math.SQRT1_2;
    near(assert, rotateByQuaternion([1, 0, 0], { x: 0, y: 0, z: s, w: s }), [0, 1, 0]);
  });

  QUnit.test("it agrees with Babylon.js", (assert) => {
    const q = BABYLON.Quaternion.RotationYawPitchRoll(0.7, -0.4, 1.1);
    const want = new BABYLON.Vector3(0.3, 1, -0.6).applyRotationQuaternion(q);
    const got = rotateByQuaternion([0.3, 1, -0.6], q);
    got.forEach((n, i) => assert.true(Math.abs(n - [want.x, want.y, want.z][i]) < 1e-5));
  });

  QUnit.test("a pose that is not turned is a floor, and one on its side is a wall", (assert) => {
    const floor = surfaceFromPose([1, 0, 2], { x: 0, y: 0, z: 0, w: 1 });
    assert.deepEqual(floor.normal, [0, 1, 0]);
    assert.false(floor.guessed);
    assert.true(isFloor(floor));
    const s = Math.SQRT1_2;
    const wall = surfaceFromPose([1, 1, 2], { x: s, y: 0, z: 0, w: s }); // a quarter turn about x
    assert.false(isFloor(wall));
  });

  QUnit.test("nothing is not a floor", (assert) => {
    assert.false(isFloor(null));
  });
});

QUnit.module("isTap", () => {
  const press = { x: 100, y: 100, time: 1000 };

  QUnit.test("a short press that does not move is a tap", (assert) => {
    assert.true(isTap(press, { x: 103, y: 102, time: 1150 }));
  });

  QUnit.test("a press that moves is a drag", (assert) => {
    assert.false(isTap(press, { x: 160, y: 100, time: 1150 }));
  });

  QUnit.test("a press that is held is not a tap", (assert) => {
    assert.false(isTap(press, { x: 100, y: 100, time: 2000 }));
  });

  QUnit.test("the numbers are the table's", (assert) => {
    assert.true(isTap(press, { x: 150, y: 100, time: 1100 }, { ...SURFACE, tapPixels: 80 }));
  });
});
