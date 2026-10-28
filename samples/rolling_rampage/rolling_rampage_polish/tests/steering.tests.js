QUnit.module("clampStick", () => {
  QUnit.test("leaves a stick that is not too long as it is", (assert) => {
    assert.deepEqual(clampStick({ x: 0.3, y: -0.4 }), { x: 0.3, y: -0.4 });
  });

  QUnit.test("shortens one that is longer than 1 to exactly 1, keeping its direction", (assert) => {
    const stick = clampStick({ x: 3, y: 4 });

    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
    assert.true(Math.abs(stick.x / stick.y - 0.75) < 1e-9);
  });

  QUnit.test("a stick pushed into a corner is only as long as one pushed straight", (assert) => {
    const corner = clampStick({ x: 1, y: 1 });

    assert.true(Math.abs(Math.hypot(corner.x, corner.y) - 1) < 1e-9);
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const stick = { x: 3, y: 4 };

    clampStick(stick);

    assert.deepEqual(stick, { x: 3, y: 4 });
  });
});

QUnit.module("keyboardStick", () => {
  const held = (...codes) => new Set(codes);

  QUnit.test("no keys is no stick", (assert) => {
    assert.deepEqual(keyboardStick(held()), NO_STICK);
  });

  QUnit.test("each arrow key is a push the way it says", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowRight")), { x: 1, y: 0 });
    assert.deepEqual(keyboardStick(held("ArrowLeft")), { x: -1, y: 0 });
    assert.deepEqual(keyboardStick(held("ArrowUp")), { x: 0, y: 1 });
    assert.deepEqual(keyboardStick(held("ArrowDown")), { x: 0, y: -1 });
  });

  QUnit.test("W, A, S and D do the same", (assert) => {
    assert.deepEqual(keyboardStick(held("KeyD")), keyboardStick(held("ArrowRight")));
    assert.deepEqual(keyboardStick(held("KeyA")), keyboardStick(held("ArrowLeft")));
    assert.deepEqual(keyboardStick(held("KeyW")), keyboardStick(held("ArrowUp")));
    assert.deepEqual(keyboardStick(held("KeyS")), keyboardStick(held("ArrowDown")));
  });

  QUnit.test("opposite keys cancel", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowLeft", "ArrowRight")), NO_STICK);
    assert.deepEqual(keyboardStick(held("KeyW", "KeyS")), NO_STICK);
  });

  QUnit.test("two keys that mean the same thing aren't twice as strong", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowUp", "KeyW")), { x: 0, y: 1 });
  });

  QUnit.test("a diagonal is as strong as a straight push, not stronger", (assert) => {
    const stick = keyboardStick(held("ArrowUp", "ArrowRight"));

    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
    assert.true(stick.x > 0 && stick.y > 0);
  });

  QUnit.test("other keys do nothing", (assert) => {
    assert.deepEqual(keyboardStick(held("KeyR", "Space", "KeyC")), NO_STICK);
  });

  QUnit.test("the keys for each direction are all different, so none steals another's", (assert) => {
    const all = Object.values(KEYS).flat();

    assert.strictEqual(new Set(all).size, all.length);
  });
});

QUnit.module("combineSticks", () => {
  QUnit.test("two pushes the same way are one push, no stronger than a full one", (assert) => {
    assert.deepEqual(combineSticks({ x: 1, y: 0 }, { x: 1, y: 0 }), { x: 1, y: 0 });
  });

  QUnit.test("two pushes against each other cancel", (assert) => {
    assert.deepEqual(combineSticks({ x: 1, y: 0 }, { x: -1, y: 0 }), NO_STICK);
  });

  QUnit.test("one stick on its own comes through", (assert) => {
    assert.deepEqual(combineSticks({ x: 0.5, y: 0.25 }, NO_STICK), { x: 0.5, y: 0.25 });
  });

  QUnit.test("a push this way and a push that way make one diagonal", (assert) => {
    const stick = combineSticks({ x: 1, y: 0 }, { x: 0, y: 1 });

    assert.true(stick.x > 0 && stick.y > 0);
    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
  });
});

QUnit.module("worldDirection", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("no stick is no direction", (assert) => {
    const d = worldDirection(NO_STICK, ISO_ALPHA);

    assert.true(near(d.x, 0) && near(d.y, 0) && near(d.z, 0));
  });

  QUnit.test("is flat: a push never lifts the marble", (assert) => {
    assert.strictEqual(worldDirection({ x: 0.3, y: 0.9 }, ISO_ALPHA).y, 0);
  });

  QUnit.test("is as long as the stick", (assert) => {
    for (const stick of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0.6, y: 0.8 }, { x: 0.2, y: -0.1 }]) {
      const d = worldDirection(stick, ISO_ALPHA);
      assert.true(near(Math.hypot(d.x, d.z), Math.hypot(stick.x, stick.y)), JSON.stringify(stick));
    }
  });

  QUnit.test("up on the screen is away from the camera: the camera sits at (+x, -z), so up is toward (-x, +z)", (assert) => {
    const d = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);

    assert.true(d.x < 0 && d.z > 0);
    assert.true(near(Math.abs(d.x), Math.abs(d.z)), "along the diagonal");
  });

  QUnit.test("right on the screen is a quarter turn from up, toward (+x, +z)", (assert) => {
    const d = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);

    assert.true(d.x > 0 && d.z > 0);
  });

  QUnit.test("right and up are at right angles", (assert) => {
    const right = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);
    const up = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);

    assert.true(near(right.x * up.x + right.z * up.z, 0));
  });

  QUnit.test("down is the opposite of up, and left the opposite of right", (assert) => {
    const up = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);
    const down = worldDirection({ x: 0, y: -1 }, ISO_ALPHA);
    const right = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);
    const left = worldDirection({ x: -1, y: 0 }, ISO_ALPHA);

    assert.true(near(up.x, -down.x) && near(up.z, -down.z));
    assert.true(near(right.x, -left.x) && near(right.z, -left.z));
  });

  QUnit.test("turning the camera turns the directions with it", (assert) => {
    // A camera at alpha = 0 sits on the +x side, looking toward -x: up is -x.
    const d = worldDirection({ x: 0, y: 1 }, 0);

    assert.true(near(d.x, -1) && near(d.z, 0));
  });

  QUnit.test("a stick that is a mix is the same mix of the two directions", (assert) => {
    const mix = worldDirection({ x: 0.5, y: 0.5 }, ISO_ALPHA);
    const right = worldDirection({ x: 0.5, y: 0 }, ISO_ALPHA);
    const up = worldDirection({ x: 0, y: 0.5 }, ISO_ALPHA);

    assert.true(near(mix.x, right.x + up.x) && near(mix.z, right.z + up.z));
  });
});

QUnit.module("steeringForce", () => {
  const still = { x: 0, y: 0, z: 0 };
  const east = { x: 1, y: 0, z: 0 };

  QUnit.test("no direction is no force", (assert) => {
    assert.deepEqual(steeringForce({ x: 0, y: 0, z: 0 }, still, true), { x: 0, y: 0, z: 0 });
  });

  QUnit.test("a marble that isn't moving is pushed with the full force, the way the stick points", (assert) => {
    const f = steeringForce(east, still, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
    assert.strictEqual(f.z, 0);
  });

  QUnit.test("it never pushes up or down", (assert) => {
    assert.strictEqual(steeringForce({ x: 0.3, y: 0, z: 0.4 }, still, true).y, 0);
  });

  QUnit.test("a half-strength stick is a half-strength push", (assert) => {
    assert.true(Math.abs(steeringForce({ x: 0.5, y: 0, z: 0 }, still, true).x - STEER_FORCE / 2) < 1e-9);
  });

  QUnit.test("the push fades as the marble nears top speed in that direction", (assert) => {
    const slow = steeringForce(east, { x: 2, y: 0, z: 0 }, true).x;
    const fast = steeringForce(east, { x: 8, y: 0, z: 0 }, true).x;

    assert.true(fast < slow);
  });

  QUnit.test("at top speed in that direction there is no push at all, and above it, none either", (assert) => {
    assert.strictEqual(steeringForce(east, { x: TOP_SPEED, y: 0, z: 0 }, true).x, 0);
    assert.strictEqual(steeringForce(east, { x: TOP_SPEED * 3, y: 0, z: 0 }, true).x, 0);
  });

  QUnit.test("a marble going the other way is pushed harder, so it can turn round, but no more than twice as hard", (assert) => {
    const back = steeringForce(east, { x: -TOP_SPEED / 2, y: 0, z: 0 }, true).x;
    const way = steeringForce(east, { x: -TOP_SPEED * 5, y: 0, z: 0 }, true).x;

    assert.true(back > STEER_FORCE);
    assert.true(Math.abs(way - STEER_FORCE * 2) < 1e-9);
  });

  QUnit.test("speed across the push doesn't make it fade: only speed along it counts", (assert) => {
    const f = steeringForce(east, { x: 0, y: 0, z: TOP_SPEED * 2 }, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
  });

  QUnit.test("falling doesn't make it fade either: only the flat speed counts", (assert) => {
    const f = steeringForce(east, { x: 0, y: -50, z: 0 }, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
  });

  QUnit.test("in the air there is only AIR_CONTROL of the push", (assert) => {
    const ground = steeringForce(east, still, true).x;
    const air = steeringForce(east, still, false).x;

    assert.true(Math.abs(air - ground * AIR_CONTROL) < 1e-9);
    assert.true(AIR_CONTROL > 0 && AIR_CONTROL < 1);
  });

  QUnit.test("the force points the way of the direction, whatever its length", (assert) => {
    const f = steeringForce({ x: 0.6, y: 0, z: 0.8 }, still, true);

    assert.true(Math.abs(f.x / f.z - 0.75) < 1e-9);
  });
});

QUnit.module("stickRadiusFor", () => {
  QUnit.test("is a fraction of the smaller side of the screen", (assert) => {
    assert.true(Math.abs(stickRadiusFor(1000, 800) - 800 * STICK_RADIUS_FRACTION) < 1e-9);
    assert.true(Math.abs(stickRadiusFor(800, 1000) - 800 * STICK_RADIUS_FRACTION) < 1e-9);
  });

  QUnit.test("is never less than the minimum, however small the screen", (assert) => {
    assert.strictEqual(stickRadiusFor(100, 100), STICK_MIN_RADIUS);
    assert.strictEqual(stickRadiusFor(0, 0), STICK_MIN_RADIUS);
  });

  QUnit.test("is bigger on a bigger screen", (assert) => {
    assert.true(stickRadiusFor(2000, 1500) > stickRadiusFor(800, 600));
  });
});

QUnit.module("TouchStick", () => {
  const make = () => new TouchStick({ radius: 100, deadZone: 0.1 });
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("isn't being made by a finger to begin with, and the stick is not pushed", (assert) => {
    const stick = make();

    assert.false(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("a finger going down starts it, and its first touch is the middle", (assert) => {
    const stick = make();

    assert.true(stick.start(1, 300, 400));

    assert.true(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("a second finger is ignored while the first is down", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    assert.false(stick.start(2, 100, 100));
    assert.false(stick.move(2, 500, 400));
    assert.false(stick.end(2));
    assert.true(stick.active);
  });

  QUnit.test("moving right pushes the stick right", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 400, 400);

    assert.true(near(stick.value.x, 1) && near(stick.value.y, 0));
  });

  QUnit.test("moving UP the screen pushes the stick up, though y on a screen gets smaller going up", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 300, 300);

    assert.true(near(stick.value.x, 0) && near(stick.value.y, 1));
  });

  QUnit.test("moving down and to the left pushes it down and left", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 250, 450);

    assert.true(stick.value.x < 0 && stick.value.y < 0);
  });

  QUnit.test("a thumb that goes further than the radius pushes no harder than full strength", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 900, 400);

    assert.true(near(Math.hypot(stick.value.x, stick.value.y), 1));
  });

  QUnit.test("halfway to the radius is a push a little under half, because of the dead zone", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 350, 400);

    const strength = Math.hypot(stick.value.x, stick.value.y);
    assert.true(strength > 0.4 && strength < 0.5, `${strength}`);
  });

  QUnit.test("a thumb that hardly moves is no push, because of the dead zone", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 305, 398);

    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("the push grows smoothly from the dead zone's edge: just past it is almost nothing, not a jump", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 311, 400); // 0.11 of the radius, just past a dead zone of 0.1

    assert.true(stick.value.x > 0 && stick.value.x < 0.05, `${stick.value.x}`);
  });

  QUnit.test("the knob follows the thumb, but stays within the radius", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 340, 430);
    assert.deepEqual(stick.knob, { x: 40, y: 30 });

    stick.move(1, 700, 400);
    assert.true(near(Math.hypot(stick.knob.x, stick.knob.y), 100));
    assert.true(stick.knob.x > 0 && near(stick.knob.y, 0));
  });

  QUnit.test("the knob is drawn in screen directions: down is positive y, as on a screen", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 300, 450);

    assert.deepEqual(stick.knob, { x: 0, y: 50 });
  });

  QUnit.test("lifting the finger lets go: no push, and the knob goes back", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);
    stick.move(1, 400, 400);

    assert.true(stick.end(1));

    assert.false(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
    assert.deepEqual(stick.knob, { x: 0, y: 0 });
  });

  QUnit.test("after it is let go, the next touch starts a new stick with its own middle", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);
    stick.end(1);

    assert.true(stick.start(2, 50, 60));
    stick.move(2, 150, 60);

    assert.true(near(stick.value.x, 1));
  });

  QUnit.test("a move or a lift from a finger that isn't the one making the stick does nothing", (assert) => {
    const stick = make();

    assert.false(stick.move(7, 100, 100));
    assert.false(stick.end(7));
  });

  QUnit.test("takes its radius and dead zone as options, with sensible ones if not given", (assert) => {
    const stick = new TouchStick();

    assert.true(stick.radius > 0);
    assert.strictEqual(stick.deadZone, STICK_DEAD_ZONE);
  });
});

QUnit.module("steeringForce for a marble of a different strength", () => {
  const flat = { x: 0, y: 0, z: 0 };

  QUnit.test("with no strength given it is the usual push, as it was", (assert) => {
    assert.deepEqual(steeringForce({ x: 1, y: 0, z: 0 }, flat, true), steeringForce({ x: 1, y: 0, z: 0 }, flat, true, {}));
    assert.strictEqual(steeringForce({ x: 1, y: 0, z: 0 }, flat, true).x, STEER_FORCE);
  });

  QUnit.test("a weaker marble pushes with its own force, at rest", (assert) => {
    assert.strictEqual(steeringForce({ x: 0, y: 0, z: 1 }, flat, true, { force: 10 }).z, 10);
  });

  QUnit.test("and its push fades toward its own top speed, not the usual one", (assert) => {
    const going = { x: 5, y: 0, z: 0 }; // fast for a marble with a top speed of 6, and slow for the usual one

    const slow = steeringForce({ x: 1, y: 0, z: 0 }, going, true, { topSpeed: 6 }).x;
    const usual = steeringForce({ x: 1, y: 0, z: 0 }, going, true).x;

    assert.true(slow < usual / 2, `${slow} against ${usual}`);
    assert.strictEqual(steeringForce({ x: 1, y: 0, z: 0 }, { x: 6, y: 0, z: 0 }, true, { topSpeed: 6 }).x, 0, "nothing at its top speed");
  });
});
