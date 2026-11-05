// Clips that are just a name and a length, so that the arithmetic of a sequence can be done in the head.
const fakeInfo = (seconds) => ({ from: 0, to: seconds * 60, fps: 60, frames: seconds * 60, seconds });
const FAKE_CLIPS = { A: fakeInfo(2), B: fakeInfo(1), C: fakeInfo(2) };
const infoOfFake = (name) => FAKE_CLIPS[name] || null;
const stepsOf = (...names) => names.map((name) => makeStep(name));
const near = (a, b) => Math.abs(a - b) < 1e-9;

QUnit.module("makeStep", () => {
  QUnit.test("has a clip, one play of it, and the normal speed, unless it is told otherwise", (assert) => {
    assert.deepEqual(makeStep("A"), { clip: "A", repeat: 1, speed: 1 });
    assert.deepEqual(makeStep("A", 3, 1.5), { clip: "A", repeat: 3, speed: 1.5 });
  });

  QUnit.test("holds the repeat and the speed between their limits, and the repeat is a whole number", (assert) => {
    assert.strictEqual(makeStep("A", 0).repeat, SEQUENCE_LIMITS.repeat.min);
    assert.strictEqual(makeStep("A", 99).repeat, SEQUENCE_LIMITS.repeat.max);
    assert.strictEqual(makeStep("A", 2.6).repeat, 3);
    assert.strictEqual(makeStep("A", 1, 99).speed, PLAYER_LIMITS.speed.max);
    assert.strictEqual(makeStep("A", NaN, NaN).repeat, SEQUENCE_LIMITS.repeat.start);
    assert.strictEqual(makeStep("A", 1, NaN).speed, PLAYER_LIMITS.speed.start);
  });
});

QUnit.module("stepSeconds and fadeBetween", () => {
  QUnit.test("a step lasts the clip's length, as many times as it repeats, shorter at a higher speed", (assert) => {
    assert.strictEqual(stepSeconds(fakeInfo(2), makeStep("A")), 2);
    assert.strictEqual(stepSeconds(fakeInfo(2), makeStep("A", 3)), 6);
    assert.strictEqual(stepSeconds(fakeInfo(2), makeStep("A", 3, 2)), 3);
  });

  QUnit.test("a fade is what was asked for, but never more than half of either step", (assert) => {
    const long = { clip: "A", duration: 10 };
    const short = { clip: "B", duration: 1 };
    assert.strictEqual(fadeBetween(long, { clip: "C", duration: 10 }, 0.5), 0.5);
    assert.strictEqual(fadeBetween({ clip: "A", duration: 10 }, short, 0.8), 0.5);
    assert.strictEqual(fadeBetween(short, { clip: "A", duration: 10 }, 0.8), 0.5);
  });

  QUnit.test("there is no fade between two steps of the same clip, and a fade is never less than nothing", (assert) => {
    assert.strictEqual(fadeBetween({ clip: "A", duration: 4 }, { clip: "A", duration: 4 }, 1), 0);
    assert.strictEqual(fadeBetween({ clip: "A", duration: 4 }, { clip: "B", duration: 4 }, -1), 0);
  });
});

QUnit.module("planSequence", () => {
  QUnit.test("with a fade, each step begins before the one before it ends", (assert) => {
    const plan = planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, false);
    assert.deepEqual(plan.steps.map((step) => [step.start, step.end, step.fadeIn]), [[0, 2, 0], [1.5, 2.5, 0.5], [2, 4, 0.5]]);
    assert.strictEqual(plan.total, 4);
  });

  QUnit.test("with no fade, the steps follow each other exactly", (assert) => {
    const plan = planSequence(stepsOf("A", "B", "C"), infoOfFake, 0, false);
    assert.deepEqual(plan.steps.map((step) => [step.start, step.end]), [[0, 2], [2, 3], [3, 5]]);
    assert.strictEqual(plan.total, 5);
  });

  QUnit.test("a step that repeats or runs at another speed is as long as that makes it", (assert) => {
    const plan = planSequence([makeStep("A", 2), makeStep("B", 1, 2)], infoOfFake, 0, false);
    assert.strictEqual(plan.steps[0].duration, 4);
    assert.strictEqual(plan.steps[1].duration, 0.5);
    assert.strictEqual(plan.total, 4.5);
  });

  QUnit.test("a step whose clip is not there is left out, and the others keep their numbers", (assert) => {
    const plan = planSequence(stepsOf("A", "Z", "B"), infoOfFake, 0, false);
    assert.deepEqual(plan.steps.map((step) => step.index), [0, 2]);
  });

  QUnit.test("no steps is a plan with no length", (assert) => {
    const plan = planSequence([], infoOfFake, 0.5, true);
    assert.strictEqual(plan.total, 0);
    assert.strictEqual(plan.cycle, 0);
  });

  QUnit.test("a sequence that loops fades from its last step into its first, and goes round in a little less than its length", (assert) => {
    const plan = planSequence(stepsOf("A", "B"), infoOfFake, 0.4, true);
    assert.strictEqual(plan.loopFade, 0.4);
    assert.ok(near(plan.cycle, plan.total - 0.4));
  });

  QUnit.test("a loop of one step, or of a clip that begins and ends the same, has nothing to fade", (assert) => {
    assert.strictEqual(planSequence(stepsOf("A"), infoOfFake, 0.4, true).loopFade, 0);
    assert.strictEqual(planSequence(stepsOf("A", "B", "A"), infoOfFake, 0.4, true).loopFade, 0);
  });

  QUnit.test("a sequence that does not loop has no loop fade", (assert) => {
    const plan = planSequence(stepsOf("A", "B"), infoOfFake, 0.4, false);
    assert.strictEqual(plan.loopFade, 0);
    assert.strictEqual(plan.cycle, plan.total);
  });
});

QUnit.module("poseAt", () => {
  const plan = planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, false);
  const sum = (pose) => pose.items.reduce((total, item) => total + item.weight, 0);

  QUnit.test("at the start, the first clip is at its first moment with all the weight", (assert) => {
    const pose = poseAt(plan, 0);
    assert.deepEqual(pose.items, [{ step: 0, clip: "A", seconds: 0, weight: 1 }]);
    assert.false(pose.done);
  });

  QUnit.test("in the middle of a step, it says how far into the clip it is", (assert) => {
    const pose = poseAt(plan, 1.2);
    assert.strictEqual(pose.items.length, 1);
    assert.ok(near(pose.items[0].seconds, 1.2));
  });

  QUnit.test("during a fade, both clips play, each at its own moment, and halfway through they count the same", (assert) => {
    const pose = poseAt(plan, 1.75);
    assert.deepEqual(pose.items.map((item) => item.clip), ["A", "B"]);
    assert.ok(near(pose.items[0].seconds, 1.75));
    assert.ok(near(pose.items[1].seconds, 0.25));
    assert.ok(near(pose.items[0].weight, 0.5) && near(pose.items[1].weight, 0.5));
  });

  QUnit.test("the weights add up to 1 at every moment of the sequence", (assert) => {
    for (let t = 0; t <= 4.0001; t += 0.05) assert.ok(near(sum(poseAt(plan, t)), 1), `at ${t.toFixed(2)}`);
  });

  QUnit.test("the weights add up to 1 for a sequence that loops, round after round", (assert) => {
    const looping = planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, true);
    for (let t = 0; t <= 3 * looping.cycle; t += 0.05) assert.ok(near(sum(poseAt(looping, t)), 1), `at ${t.toFixed(2)}`);
  });

  QUnit.test("the weights add up to 1 with fades of every length, and with steps that repeat and run fast", (assert) => {
    for (const fade of [0, 0.1, 0.5, 1, 5]) {
      const odd = planSequence([makeStep("A", 2, 1.5), makeStep("B", 3), makeStep("C", 1, 2)], infoOfFake, fade, true);
      for (let t = 0; t <= 2 * odd.cycle; t += 0.07) assert.ok(near(sum(poseAt(odd, t)), 1), `fade ${fade} at ${t.toFixed(2)}`);
    }
  });

  QUnit.test("at the end it is done, with the last clip at its last moment", (assert) => {
    const pose = poseAt(plan, 4);
    assert.true(pose.done);
    assert.deepEqual(pose.items, [{ step: 2, clip: "C", seconds: 2, weight: 1 }]);
  });

  QUnit.test("after the end is the end, and before the start is the start", (assert) => {
    assert.deepEqual(poseAt(plan, 99).items, poseAt(plan, 4).items);
    assert.strictEqual(poseAt(plan, 99).time, 4);
    assert.deepEqual(poseAt(plan, -5).items, poseAt(plan, 0).items);
  });

  QUnit.test("a step that repeats goes round its clip again", (assert) => {
    const twice = planSequence([makeStep("A", 2)], infoOfFake, 0, false);
    assert.ok(near(poseAt(twice, 3).items[0].seconds, 1));
  });

  QUnit.test("a step at twice the speed is twice as far into its clip", (assert) => {
    const fast = planSequence([makeStep("A", 1, 2)], infoOfFake, 0, false);
    assert.ok(near(poseAt(fast, 0.5).items[0].seconds, 1));
  });

  QUnit.test("no steps is done at once, with nothing playing", (assert) => {
    const pose = poseAt(planSequence([], infoOfFake, 0, false), 1);
    assert.true(pose.done);
    assert.deepEqual(pose.items, []);
  });

  QUnit.test("a sequence that loops is never done, and begins its first step again at full weight", (assert) => {
    const looping = planSequence(stepsOf("A", "B"), infoOfFake, 0.4, true);
    assert.false(poseAt(looping, 1000).done);
    const first = poseAt(looping, 0);
    assert.deepEqual(first.items.map((item) => item.clip), ["A"]);
    assert.strictEqual(first.items[0].weight, 1);
  });

  QUnit.test("at the start of the second round the first step is only just coming in, from the end of the last one", (assert) => {
    const looping = planSequence(stepsOf("A", "B"), infoOfFake, 0.4, true);
    const pose = poseAt(looping, looping.cycle);
    assert.deepEqual(pose.items.map((item) => item.clip).sort(), ["A", "B"]);
    assert.ok(near(pose.items.find((item) => item.clip === "A").weight, 0));
    assert.ok(near(pose.items.find((item) => item.clip === "B").weight, 1));
  });
});

QUnit.module("timelineBars", () => {
  QUnit.test("makes a bar for each step, as wide as the step is long, as a percent of the whole", (assert) => {
    const bars = timelineBars(planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, false));
    assert.strictEqual(bars.length, 3);
    assert.ok(near(bars[0].left, 0) && near(bars[0].width, 50));
    assert.ok(near(bars[1].left, 37.5) && near(bars[1].width, 25));
  });

  QUnit.test("no bar goes past the end", (assert) => {
    for (const bar of timelineBars(planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, false))) assert.ok(bar.left + bar.width <= 100 + 1e-9);
  });

  QUnit.test("steps are on one row and the other in turn, so that the two of a fade are not on top of each other", (assert) => {
    assert.deepEqual(timelineBars(planSequence(stepsOf("A", "B", "C"), infoOfFake, 0.5, false)).map((bar) => bar.row), [0, 1, 0]);
  });

  QUnit.test("no steps is no bars", (assert) => {
    assert.deepEqual(timelineBars(planSequence([], infoOfFake, 0.5, false)), []);
  });
});

QUnit.module("sequenceProblems", () => {
  QUnit.test("says that there are no steps", (assert) => {
    assert.strictEqual(sequenceProblems([], ["A"]).length, 1);
  });

  QUnit.test("names a step whose clip the model does not have", (assert) => {
    const problems = sequenceProblems(stepsOf("A", "Z"), ["A", "B"]);
    assert.strictEqual(problems.length, 1);
    assert.ok(problems[0].includes("Step 2") && problems[0].includes("Z"));
  });

  QUnit.test("says that there are too many steps", (assert) => {
    const many = Array.from({ length: SEQUENCE_LIMITS.steps.max + 1 }, () => makeStep("A"));
    assert.ok(sequenceProblems(many, ["A"]).some((problem) => problem.includes(String(SEQUENCE_LIMITS.steps.max))));
  });

  QUnit.test("says nothing about a sequence that is fine", (assert) => {
    assert.deepEqual(sequenceProblems(stepsOf("A", "B"), ["A", "B"]), []);
  });
});

QUnit.module("suggestSequence", () => {
  const names = (steps) => steps.map((step) => step.clip);

  QUnit.test("for the fire bender, walks, runs, does something and settles into an idle", (assert) => {
    assert.deepEqual(names(suggestSequence(["Running", "Walking", "Elbow_Strike", "Idle_11"])), ["Walking", "Running", "Elbow_Strike", "Idle_11"]);
  });

  QUnit.test("for a model with no idle, it has fewer steps", (assert) => {
    assert.deepEqual(names(suggestSequence(["Running", "Walking", "Dead", "Fall_Dead"])), ["Walking", "Running", "Dead"]);
  });

  QUnit.test("for a cat, it uses a breath as the idle", (assert) => {
    assert.deepEqual(names(suggestSequence(["Bite", "Run", "Walk", "Breathing"])), ["Walk", "Run", "Bite", "Breathing"]);
  });

  QUnit.test("for names that fit nothing, it is the first three clips", (assert) => {
    assert.deepEqual(names(suggestSequence(["x1", "x2", "x3", "x4"])).sort(), ["x1", "x2", "x3"]);
  });

  QUnit.test("never uses a clip twice, and makes no steps from no clips", (assert) => {
    const picked = names(suggestSequence(["Walk", "Run", "Walk2", "Idle"]));
    assert.strictEqual(new Set(picked).size, picked.length);
    assert.deepEqual(suggestSequence([]), []);
  });
});
