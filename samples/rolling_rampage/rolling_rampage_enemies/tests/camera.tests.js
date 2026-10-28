QUnit.module("the isometric angles", () => {
  // The direction from the target to the camera, for the angles ArcRotateCamera uses.
  const direction = (alpha, beta) => ({
    x: Math.cos(alpha) * Math.sin(beta),
    y: Math.cos(beta),
    z: Math.sin(alpha) * Math.sin(beta),
  });

  QUnit.test("the camera is turned 45 degrees about the vertical, to look from a corner", (assert) => {
    assert.true(Math.abs(Math.abs(ISO_ALPHA) - Math.PI / 4) < 1e-9);
  });

  QUnit.test("it is tipped down by about 35 degrees, which is 54.7 degrees from straight up", (assert) => {
    assert.true(Math.abs((ISO_BETA * 180) / Math.PI - 54.7356) < 1e-3);
  });

  QUnit.test("that is what makes it isometric: the three axes all slope the same", (assert) => {
    const d = direction(ISO_ALPHA, ISO_BETA);

    assert.true(Math.abs(Math.abs(d.x) - Math.abs(d.y)) < 1e-9);
    assert.true(Math.abs(Math.abs(d.y) - Math.abs(d.z)) < 1e-9);
    assert.true(Math.abs(Math.abs(d.x) - 1 / Math.sqrt(3)) < 1e-9);
  });

  QUnit.test("the camera is far enough back to see over the whole course", (assert) => {
    assert.true(CAMERA_RADIUS > 30);
  });
});

QUnit.module("viewHalfExtents", () => {
  QUnit.test("a wide screen shows the least height, and more width than the least", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(16 / 9);

    assert.strictEqual(halfHeight, VIEW_HEIGHT / 2);
    assert.true(halfWidth > VIEW_WIDTH / 2);
  });

  QUnit.test("a tall screen, a phone held upright, shows the least width, and more height than the least", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(9 / 19.5);

    assert.true(Math.abs(halfWidth - VIEW_WIDTH / 2) < 1e-9);
    assert.true(halfHeight > VIEW_HEIGHT / 2);
  });

  QUnit.test("the shape of the view is the shape of the screen, so nothing is stretched", (assert) => {
    for (const aspect of [0.46, 0.75, 1, 1.6, 2.1]) {
      const { halfWidth, halfHeight } = viewHalfExtents(aspect);
      assert.true(Math.abs(halfWidth / halfHeight - aspect) < 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("it always shows at least the least width and the least height, whatever the shape", (assert) => {
    for (const aspect of [0.3, 0.46, 0.75, 1, 1.33, 1.6, 2.1, 3]) {
      const { halfWidth, halfHeight } = viewHalfExtents(aspect);
      assert.true(halfWidth * 2 >= VIEW_WIDTH - 1e-9, `width at ${aspect}`);
      assert.true(halfHeight * 2 >= VIEW_HEIGHT - 1e-9, `height at ${aspect}`);
    }
  });

  QUnit.test("takes the least width and height as arguments", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(2, 10, 20);

    assert.strictEqual(halfHeight, 10);
    assert.strictEqual(halfWidth, 20);
  });
});

QUnit.module("follow", () => {
  const at = (x, y, z) => ({ x, y, z });

  QUnit.test("moves toward the target, but not all the way", (assert) => {
    const next = follow(at(0, 0, 0), at(10, 0, 0), FOLLOW_RATE, 0.016);

    assert.true(next.x > 0 && next.x < 10);
  });

  QUnit.test("moves every coordinate toward its own", (assert) => {
    const next = follow(at(0, 10, -4), at(8, 2, 6), 3, 0.1);

    assert.true(next.x > 0 && next.y < 10 && next.z > -4);
  });

  QUnit.test("with no time passing it hasn't moved", (assert) => {
    assert.deepEqual(follow(at(1, 2, 3), at(9, 9, 9), 4, 0), at(1, 2, 3));
  });

  QUnit.test("it gets nearer and nearer, and never overshoots", (assert) => {
    let p = at(0, 0, 0);

    for (let i = 0; i < 200; i++) {
      p = follow(p, at(10, 0, 0), 4, 1 / 60);
      assert.true(p.x <= 10);
    }

    assert.true(p.x > 9.99, `${p.x}`);
  });

  QUnit.test("takes the same time at any frame rate: two half steps are one whole step", (assert) => {
    const whole = follow(at(0, 0, 0), at(10, 0, 0), 4, 0.1);
    const halves = follow(follow(at(0, 0, 0), at(10, 0, 0), 4, 0.05), at(10, 0, 0), 4, 0.05);

    assert.true(Math.abs(whole.x - halves.x) < 1e-9);
  });

  QUnit.test("a bigger rate catches up faster", (assert) => {
    assert.true(follow(at(0, 0, 0), at(10, 0, 0), 8, 0.1).x > follow(at(0, 0, 0), at(10, 0, 0), 2, 0.1).x);
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const current = at(1, 2, 3);

    follow(current, at(9, 9, 9), 4, 0.1);

    assert.deepEqual(current, at(1, 2, 3));
  });
});

QUnit.module("sunPosition", () => {
  const at = (x, y, z) => ({ x, y, z });
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("is the given distance from the target", (assert) => {
    const sun = sunPosition(at(3, 1, -2), at(0.6, -1, -0.45), 40);

    assert.true(near(Math.hypot(sun.x - 3, sun.y - 1, sun.z + 2), 40));
  });

  QUnit.test("is on the side the sun shines from: above the target when the sun points down", (assert) => {
    assert.true(sunPosition(at(0, 0, 0), at(0, -1, 0), 40).y > 0);
  });

  QUnit.test("straight down is straight above", (assert) => {
    assert.deepEqual(sunPosition(at(5, 2, 7), at(0, -1, 0), 10), at(5, 12, 7));
  });

  QUnit.test("a sun that shines toward +x is placed back at -x", (assert) => {
    const sun = sunPosition(at(0, 0, 0), at(1, 0, 0), 10);

    assert.true(near(sun.x, -10) && near(sun.y, 0) && near(sun.z, 0));
  });

  QUnit.test("shining from the spot it is put at, along its direction, reaches the target", (assert) => {
    const direction = at(0.6, -1, -0.45);
    const target = at(4, 0.5, 1);
    const sun = sunPosition(target, direction, 25);
    const length = Math.hypot(direction.x, direction.y, direction.z);

    assert.true(near(sun.x + (direction.x / length) * 25, target.x));
    assert.true(near(sun.y + (direction.y / length) * 25, target.y));
    assert.true(near(sun.z + (direction.z / length) * 25, target.z));
  });

  QUnit.test("the direction doesn't have to be a unit length: only which way it points counts", (assert) => {
    const a = sunPosition(at(0, 0, 0), at(0.6, -1, -0.45), 30);
    const b = sunPosition(at(0, 0, 0), at(6, -10, -4.5), 30);

    assert.true(near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z));
  });

  QUnit.test("moves with the target", (assert) => {
    const first = sunPosition(at(0, 0, 0), at(0.6, -1, -0.45), 40);
    const second = sunPosition(at(10, 0, 0), at(0.6, -1, -0.45), 40);

    assert.true(near(second.x - first.x, 10) && near(second.y, first.y) && near(second.z, first.z));
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const target = at(1, 2, 3);
    const direction = at(0.6, -1, -0.45);

    sunPosition(target, direction, 40);

    assert.deepEqual(target, at(1, 2, 3));
    assert.deepEqual(direction, at(0.6, -1, -0.45));
  });

  QUnit.test("the area that gets shadows is wide enough for the marble and what is near it, and the sun is further back than that", (assert) => {
    assert.true(SHADOW_AREA >= 20);
    assert.true(SUN_DISTANCE > SHADOW_AREA / 2);
  });
});
