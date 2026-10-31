QUnit.module("staticMotion", () => {
  const motion = { sway: 0.07, lean: 0.12, bob: 0.025, squash: 0.08 };
  const base = { state: "stalk", gait: 0, time: 0, moving: 0, reach: 0, dying: 0 };

  QUnit.test("a model that stands still sways a little, and does not lean or bob much", (assert) => {
    for (let t = 0; t < 10; t += 0.2) {
      const m = staticMotion({ ...base, state: "lurk", time: t }, motion);
      assert.true(Math.abs(m.roll) <= motion.sway * 0.4 + 1e-9);
      assert.strictEqual(m.pitch, 0);
      assert.true(m.lift <= motion.bob * 0.3 + 1e-9);
    }
  });

  QUnit.test("a walk rocks from side to side with each step, and bobs twice a step", (assert) => {
    const a = staticMotion({ ...base, moving: 1, gait: 0.25 }, motion);
    const b = staticMotion({ ...base, moving: 1, gait: 0.75 }, motion);
    assert.true(a.roll > 0.9 * motion.sway && b.roll < -0.9 * motion.sway, "one way, then the other");
    assert.true(Math.abs(a.lift - b.lift) < 1e-9, "the bob is up at both");
    assert.true(a.pitch > 0, "leaning forward as it goes");
  });

  QUnit.test("a lunge leans well forward, stretches and narrows", (assert) => {
    const walk = staticMotion({ ...base, moving: 1 }, motion);
    const lunge = staticMotion({ ...base, state: "lunge", moving: 1, reach: 1 }, motion);
    assert.true(lunge.pitch > walk.pitch * 2);
    assert.true(lunge.stretch > 1 && lunge.wide < 1);
  });

  QUnit.test("a death topples it backwards, flat, and fades the last of it", (assert) => {
    const early = staticMotion({ ...base, state: "dying", dying: 0.2 }, motion);
    const late = staticMotion({ ...base, state: "dying", dying: 1 }, motion);
    assert.true(early.pitch < 0 && late.pitch === -Math.PI / 2);
    assert.strictEqual(early.opacity, 1);
    assert.strictEqual(late.opacity, 0);
    assert.strictEqual(late.lift, 0);
  });

  QUnit.test("every number is finite for every state, including the no motion at all that a model with bones uses for its death", (assert) => {
    for (const [name, entry] of Object.entries({ shambling: { motion }, stiff: { motion: { sway: 0, lean: 0, bob: 0, squash: 0 } } })) {
      for (const state of ["lurk", "stalk", "lunge", "recover", "dying"]) for (const moving of [0, 1]) for (const dying of [0, 0.5, 1]) {
        const m = staticMotion({ state, gait: 3.3, time: 7.1, moving, reach: state === "lunge" ? 1 : 0, dying }, entry.motion);
        assert.true(Object.values(m).every(Number.isFinite), `${name} ${state}`);
        assert.true(m.stretch > 0 && m.wide > 0);
      }
    }
  });
});
