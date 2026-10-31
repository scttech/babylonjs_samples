QUnit.module("lookFromAngles", () => {
  const near = (assert, got, want, message, tolerance = 1e-9) => {
    for (let i = 0; i < 3; i++) assert.true(Math.abs(got[i] - want[i]) < tolerance, `${message}: ${got.map((n) => n.toFixed(3))} should be ${want}`);
  };

  QUnit.test("a phone held upright looks along the ground, with the top of the screen up", (assert) => {
    const { forward, up } = lookFromAngles(0, 90, 0);
    near(assert, forward, [0, 0, 1], "forward");
    near(assert, up, [0, 1, 0], "up");
  });

  QUnit.test("turning the phone to the left (alpha) turns the view to the left", (assert) => {
    near(assert, lookFromAngles(90, 90, 0).forward, [-1, 0, 0], "a quarter turn left");
    near(assert, lookFromAngles(180, 90, 0).forward, [0, 0, -1], "half a turn");
    near(assert, lookFromAngles(270, 90, 0).forward, [1, 0, 0], "a quarter turn right");
  });

  QUnit.test("a phone lying face up looks at the floor, and face down at the ceiling", (assert) => {
    near(assert, lookFromAngles(0, 0, 0).forward, [0, -1, 0], "face up");
    near(assert, lookFromAngles(0, 180, 0).forward, [0, 1, 0], "face down");
  });

  QUnit.test("tipping the top of the phone back (beta over 90) looks up", (assert) => {
    assert.true(lookFromAngles(0, 120, 0).forward[1] > 0.4);
    assert.true(lookFromAngles(0, 60, 0).forward[1] < -0.4);
  });

  QUnit.test("a phone turned on its side has the top of its screen to the side", (assert) => {
    const left = lookFromAngles(0, 90, 0, 90); // the phone turned a quarter turn one way
    near(assert, left.forward, [0, 0, 1], "it still looks the same way");
    near(assert, left.up, [1, 0, 0], "but the top of the screen is the phone's right edge");
    near(assert, lookFromAngles(0, 90, 0, 270).up, [-1, 0, 0], "and the other way");
  });

  QUnit.test("the two directions are always at right angles, and the length of one", (assert) => {
    for (const [a, b, g, s] of [[10, 80, 5, 0], [200, 100, -20, 90], [330, 45, 30, 270], [90, 170, -80, 180]]) {
      const { forward, up } = lookFromAngles(a, b, g, s);
      const dot = forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2];
      assert.true(Math.abs(dot) < 1e-9, `at right angles for ${a}, ${b}, ${g}, ${s}`);
      assert.true(Math.abs(Math.hypot(...forward) - 1) < 1e-9);
      assert.true(Math.abs(Math.hypot(...up) - 1) < 1e-9);
    }
  });

  QUnit.test("the same directions make the camera of Babylon.js face the same way", (assert) => {
    for (const angles of [[0, 90, 0], [90, 100, 10], [200, 70, -15]]) {
      const { forward, up } = lookFromAngles(...angles);
      const axes = lookAxes(forward, up);
      const matrix = new BABYLON.Matrix();
      BABYLON.Matrix.FromXYZAxesToRef(new BABYLON.Vector3(...axes.right), new BABYLON.Vector3(...axes.up), new BABYLON.Vector3(...axes.forward), matrix);
      const rotation = BABYLON.Quaternion.FromRotationMatrix(matrix);
      const faces = new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(rotation);
      const top = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(rotation);
      near(assert, [faces.x, faces.y, faces.z], forward, "facing", 1e-5); // Babylon.js works in single precision
      near(assert, [top.x, top.y, top.z], up, "top of the screen", 1e-5);
    }
  });
});

QUnit.module("lookAxes", () => {
  QUnit.test("makes three directions at right angles, of length one, with the right on the right", (assert) => {
    const { right, up, forward } = lookAxes([0, 0, 1], [0, 1, 0]);
    assert.deepEqual(right.map((n) => Math.round(n)), [1, 0, 0]);
    assert.deepEqual(up.map((n) => Math.round(n)), [0, 1, 0]);
    assert.deepEqual(forward.map((n) => Math.round(n)), [0, 0, 1]);
  });

  QUnit.test("turned to the right, the right goes round with it", (assert) => {
    const { right } = lookAxes([1, 0, 0], [0, 1, 0]);
    assert.deepEqual(right.map((n) => Math.round(n)), [0, 0, -1]);
  });

  QUnit.test("squares up an up that is only roughly up", (assert) => {
    const { right, up, forward } = lookAxes([0, 0, 2], [0, 1, 0.5]);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    assert.true(Math.abs(dot(right, up)) < 1e-9);
    assert.true(Math.abs(dot(up, forward)) < 1e-9);
    assert.true(Math.abs(dot(right, forward)) < 1e-9);
    for (const v of [right, up, forward]) assert.true(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  });
});

QUnit.module("lookFromDrag, bearingOf and pitchOf", () => {
  QUnit.test("no turn looks straight ahead, and a turn to the right looks to the right", (assert) => {
    assert.deepEqual(lookFromDrag(0, 0).forward.map((n) => Math.round(n)), [0, 0, 1]);
    assert.deepEqual(lookFromDrag(Math.PI / 2, 0).forward.map((n) => Math.round(n)), [1, 0, 0]);
  });

  QUnit.test("looking up has the top of the screen leaning back", (assert) => {
    const { forward, up } = lookFromDrag(0, toRadians(45));
    assert.true(forward[1] > 0.7);
    assert.true(up[2] < -0.7);
    assert.true(Math.abs(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]) < 1e-9);
  });

  QUnit.test("the bearing is 0 straight ahead, 90 to the right and 270 to the left", (assert) => {
    assert.strictEqual(Math.round(bearingOf([0, 0, 1])), 0);
    assert.strictEqual(Math.round(bearingOf([1, 0, 0])), 90);
    assert.strictEqual(Math.round(bearingOf([0, 0, -1])), 180);
    assert.strictEqual(Math.round(bearingOf([-1, 0, 0])), 270);
  });

  QUnit.test("the pitch is positive looking up and negative looking down", (assert) => {
    assert.strictEqual(Math.round(pitchOf([0, 1, 0])), 90);
    assert.strictEqual(Math.round(pitchOf([0, 0, 1])), 0);
    assert.strictEqual(Math.round(pitchOf([0, -1, 1])), -45);
  });

  QUnit.test("turnAboutUp turns a direction to the right", (assert) => {
    const turned = turnAboutUp([0, 0, 1], Math.PI / 2);
    assert.deepEqual(turned.map((n) => Math.round(n)), [1, 0, 0]);
    assert.deepEqual(turnAboutUp([0, 1, 0], 1), [0, 1, 0], "up stays up");
  });
});

QUnit.module("DragLook", () => {
  QUnit.test("starts looking straight ahead", (assert) => {
    const look = new DragLook();
    assert.deepEqual(look.look().forward.map((n) => Math.round(n)), [0, 0, 1]);
  });

  QUnit.test("dragging to the right turns the view to the left, like dragging a map", (assert) => {
    const look = new DragLook();
    look.drag(100, 0);
    assert.true(look.yaw < 0);
    look.drag(-300, 0);
    assert.true(look.yaw > 0);
  });

  QUnit.test("dragging down looks up", (assert) => {
    const look = new DragLook();
    look.drag(0, 50);
    assert.true(look.pitch > 0);
  });

  QUnit.test("it cannot look further up or down than the limit", (assert) => {
    const look = new DragLook();
    look.drag(0, 100000);
    assert.strictEqual(Math.round(toDegrees(look.pitch)), LOOK.maxPitchDegrees);
    look.drag(0, -1000000);
    assert.strictEqual(Math.round(toDegrees(look.pitch)), -LOOK.maxPitchDegrees);
  });

  QUnit.test("how far a drag turns is a number of the table, not of the code", (assert) => {
    const look = new DragLook({ ...LOOK, dragRadiansPerPixel: 0.01, dragDirection: 1 });
    look.drag(100, 0);
    assert.strictEqual(look.yaw, 1);
  });

  QUnit.test("recentre makes the way it looks now the front, and keeps the tilt", (assert) => {
    const look = new DragLook();
    look.drag(200, 30);
    look.recentre();
    assert.strictEqual(look.yaw, 0);
    assert.true(look.pitch !== 0);
  });
});

QUnit.module("GyroLook", () => {
  QUnit.test("is not ready until a reading comes", (assert) => {
    const look = new GyroLook();
    assert.false(look.ready);
    assert.true(look.feed({ alpha: 10, beta: 90, gamma: 0 }));
    assert.true(look.ready);
    assert.strictEqual(look.readings, 1);
  });

  QUnit.test("an empty reading (what a desktop sends) is not a reading", (assert) => {
    const look = new GyroLook();
    assert.false(look.feed({ alpha: null, beta: null, gamma: null }));
    assert.false(look.feed({}));
    assert.false(look.ready);
    assert.strictEqual(look.readings, 0);
  });

  QUnit.test("follows the phone: a quarter turn to the left is a bearing of 270", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 0, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 0);
    look.feed({ alpha: 90, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 270);
  });

  QUnit.test("recentre makes where the phone points now the front", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 123, beta: 90, gamma: 0 });
    look.recentre();
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 0);
    look.feed({ alpha: 123 - 90, beta: 90, gamma: 0 }); // a quarter turn to the right
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 90);
  });

  QUnit.test("recentre keeps the tilt, and turns the top of the screen with the view", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 200, beta: 110, gamma: 0 });
    look.recentre();
    const { forward, up } = look.look();
    assert.strictEqual(Math.round(bearingOf(forward)), 0);
    assert.strictEqual(Math.round(pitchOf(forward)), 20);
    assert.true(Math.abs(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]) < 1e-9);
  });

  QUnit.test("pointing at the floor has no bearing, so recentre leaves the front where it was", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 50, beta: 90, gamma: 0 });
    look.recentre();
    const offset = look.offset;
    look.feed({ alpha: 120, beta: 0, gamma: 0 });
    look.recentre();
    assert.strictEqual(look.offset, offset);
  });

  QUnit.test("the angle of the screen is asked for each time, so turning the phone on its side counts", (assert) => {
    let angle = 0;
    const look = new GyroLook(() => angle);
    look.feed({ alpha: 0, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(look.look().up[1]), 1);
    angle = 90;
    assert.strictEqual(Math.round(look.look().up[0]), 1);
  });
});
