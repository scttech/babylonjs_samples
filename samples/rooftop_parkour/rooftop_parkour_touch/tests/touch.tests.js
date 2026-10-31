QUnit.module("stickValue and stickInput", () => {
  const close = (assert, a, b, message) => assert.true(Math.abs(a - b) < 1e-9, `${message}: ${a} vs ${b}`);

  QUnit.test("a thumb that has not moved, or has moved a very little, pushes nothing", (assert) => {
    assert.deepEqual(stickValue(0, 0), { x: 0, y: 0, amount: 0 });
    assert.strictEqual(stickValue(3, 2).amount, 0, "inside the dead zone");
    assert.strictEqual(stickInput(stickValue(3, 2)).forward, 0);
  });

  QUnit.test("up the screen is forward, and right is right", (assert) => {
    const up = stickValue(0, -TOUCH.stickRadius);
    close(assert, up.y, 1, "up is forward");
    close(assert, up.x, 0, "and not sideways");
    const right = stickValue(TOUCH.stickRadius, 0);
    close(assert, right.x, 1, "right is right");
    const down = stickInput(stickValue(0, 40));
    assert.true(down.forward < 0, "down the screen is back");
  });

  QUnit.test("the dead zone is taken off and the rest stretched, so the push grows from nothing to one", (assert) => {
    const edge = TOUCH.stickRadius * TOUCH.deadZone;
    assert.strictEqual(stickValue(edge, 0).amount, 0);
    close(assert, stickValue(TOUCH.stickRadius, 0).amount, 1, "all the way");
    const half = stickValue(TOUCH.stickRadius * (TOUCH.deadZone + (1 - TOUCH.deadZone) / 2), 0).amount;
    close(assert, half, 0.5, "half way between the dead zone and the end");
  });

  QUnit.test("a thumb moved further than the reach is a push of one, no more", (assert) => {
    assert.strictEqual(stickValue(TOUCH.stickRadius * 5, 0).amount, 1);
  });

  QUnit.test("it sprints when it is pushed nearly all the way, and jogs before that", (assert) => {
    const jog = stickInput(stickValue(0, -TOUCH.stickRadius * 0.5));
    const sprint = stickInput(stickValue(0, -TOUCH.stickRadius));
    assert.false(jog.sprint);
    assert.true(sprint.sprint);
  });
});

QUnit.module("isTouchDevice and needsLandscape", () => {
  QUnit.test("a phone has a finger and touch points; a laptop has a mouse", (assert) => {
    assert.true(isTouchDevice({ coarse: true, touchPoints: 5 }));
    assert.false(isTouchDevice({ coarse: false, touchPoints: 0 }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 0 }), "no touch points: it has no screen to touch");
    assert.false(isTouchDevice({ coarse: false, touchPoints: 10 }), "a laptop with a touch screen still has a mouse as its main pointer");
  });

  QUnit.test("it can be forced on to try it with a mouse, and off on a device that has both", (assert) => {
    assert.true(isTouchDevice({ search: "?dev&touch" }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 5, search: "?touch=off" }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 5, search: "?touch=0" }));
  });

  QUnit.test("a phone that is much taller than it is wide is held upright, and a square one is not", (assert) => {
    assert.true(needsLandscape(390, 800));
    assert.false(needsLandscape(800, 390));
    assert.false(needsLandscape(500, 520), "nearly square is near enough");
  });
});

QUnit.module("mergeInput", () => {
  QUnit.test("the keys and the thumbs together: the larger push of each, and a sprint or a jump from either", (assert) => {
    const keys = { forward: 1, right: 0, sprint: false, jump: false };
    const thumbs = { forward: 0.5, right: -0.7, sprint: true, jump: false };
    assert.deepEqual(mergeInput(keys, thumbs), { forward: 1, right: -0.7, sprint: true, jump: false });
    assert.true(mergeInput(keys, { ...thumbs, jump: true }).jump);
  });
});
