# Tutorial: Model Lab, Sequencer -- Chain Clips Together

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

In the [Animations tutorial](../model_lab_animations/TUTORIAL.md) you played one clip at a time, and cross-faded when *you* clicked another. A character in a game does not wait to be clicked: it walks, then runs, then attacks, then settles into an idle, and it should do the whole thing by itself, smoothly. That is a **sequence**: a list of clips that play one after another, with a cross-fade built into each join. This tutorial builds a sequencer: a list of steps that you can edit (which clip, how many times, how fast), a timeline that draws the steps as bars so that you can *see* the overlaps, and play, pause, stop and scrub controls for the whole sequence.

You write the code; this document tells you what to write, and why.

By the end you'll have a page where you can:

- **Build a sequence**: add steps, choose each one's clip, how many **times** it plays and its **speed**, move steps up and down, and take them away. A button suggests a sequence that suits whatever model is open (a walk, a run, something to do, an idle)
- **See it**: a timeline draws every step as a bar as wide as the step is long. Where one step fades into the next, the bars **overlap**, on different rows, and a red line (the playhead) moves along as it plays
- **Play it**: play, pause, stop, and a scrubber that jumps to any moment of the *whole* sequence
- **Loop it**: the last step fades into the first, so that a loop has no jump
- Unit tests for all of it: **271 passing tests**, 81 of them new, including one that checks that a blended pose is exactly halfway between the two clips that make it

**What you'll learn:** the three ways to combine clips (cross-fade, chain, layer), how to plan a timeline where every step overlaps the one before it, why a plan that is a **function of time** can be scrubbed, played and tested at any moment, why the weights have to add up to 1 at *every* moment (and how a test checks thousands of them), how Babylon.js blends clips that you move by hand (and the trap: a *paused* clip ignores its weight), and how two things that control the same model (the clip player and the sequencer) take turns without fighting.

**Before you start:** do the [Animations tutorial](../model_lab_animations/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Words you'll meet

| Word | What it means |
|------|---------------|
| **Sequence** (or **chain**) | A list of clips that play one after another, by themselves: walk, then run, then punch, then idle. |
| **Step** | One entry in a sequence: a clip, how many times it plays, and how fast. |
| **Repeat** | How many times a step plays its clip, one after another, before the next step begins. A walk that repeats three times is three strides' worth of walking. |
| **Overlap** | The short time at a join where the old step is fading out and the new one is fading in, so that both are playing. Without it, a sequence jumps at every join. |
| **Timeline** | A picture of time as a line from left to right, with each step drawn as a bar from where it starts to where it ends. |
| **Playhead** | The mark on a timeline that shows where the sequence is now. |
| **Function of time** | Something that is worked out from *one number* (the time), and nothing else. Ask it about the same time twice and it gives the same answer. That means it can be played, paused, scrubbed or run backwards, with no extra work. The sequence's pose is one. |
| **Weight** | How much a clip counts in the pose (see the Animations tutorial). The weights of the clips that are playing always add up to 1. |
| **Layering** | Playing two clips *at the same time* on *different parts of the body*: an upper-body throw while the legs run. Not this tutorial, but it is how this one differs from the next paragraph. |

**Three ways to combine clips**, which are easy to mix up:

| | What it is | Who chooses | Built in |
|---|---|---|---|
| **Cross-fade** | Changing from the clip that is playing to another one, blending over a moment | You, when you click | The [Animations tutorial](../model_lab_animations/TUTORIAL.md) |
| **Chain** (a sequence) | A list of clips, each cross-faded into the next, that plays on its own | The list | **This tutorial** |
| **Layer** | Two clips playing *at once*, each on its own part of the body | The designer | Tutorial 10, with *bone masks* |

## Where you're starting

This folder is a copy of the finished Animations sample, plus placeholders for the new files:

```
model_lab_sequencer/
├── index.html, tests.html   (already list the new files)
├── css/
│   ├── sequence.css        (placeholder -- Step 4)
│   └── everything else, from the Animations sample
├── js/
│   ├── sequence.js         (placeholder -- Step 1)
│   ├── sequencer.js        (placeholder -- Step 2)
│   ├── sequencepanel.js    (placeholder -- Step 3)
│   ├── main.js             (changes -- Step 4)
│   └── everything else, from the Animations sample
└── tests/
    ├── sequence.tests.js, sequencer.tests.js, sequencepanel.tests.js   (placeholders -- Steps 1 to 3)
    └── everything else, from the Animations sample
```

Open `tests.html` before you change anything, through the web server (`npx serve` in the repo root). You should see **190 passing tests**.

## Step 1: The plan of a sequence (`sequence.js`)

This file has no Babylon.js in it and plays nothing. It is the **plan**: given a list of steps, the clips' lengths and a fade time, it works out when each step starts and ends, and, for *any moment* of the sequence, which clips are playing, how far into each, and how much each counts.

**A step's length** is the clip's length times its repeats, divided by its speed (`stepSeconds`). A 2-second clip, three times, at double speed, is 3 seconds.

**The overlap.** Each step begins `fadeIn` seconds *before* the one before it ends, so the two are playing together for that long (`planSequence`). Why before, and not after? Because a clip that has reached its end has nowhere to go: if the fade began at the end, the old clip would have to hold its last frame while the new one faded in, and the model would freeze for a moment. The fade is held to **half of the shorter of the two steps** (`fadeBetween`), so that a fade can never reach back past the start of the step before it. And between **two steps of the same clip there is no fade at all**, because a clip cannot be blended with itself: it would have to be in two places at once.

**The pose at a time** (`poseAt`) is where the work is. For a moment, it finds the steps whose window includes it (one, or two during a fade), says how many seconds into its clip each one is (`(moment - start) * speed`, wrapped round for a repeat), and gives each a weight. A step's weight is its **fade in** (rising, over the overlap at its start) times its **fade out** (falling, over the overlap at its end), and they are made from the *same* `fadeAmount` curve as the Animations tutorial, one as `1 - amount`, so they add up to 1 in the same way. One test checks the sum at 80 moments of a sequence; another does it with fades of every length, steps that repeat and run fast, and loops.

**A loop** fades from the last step into the first. That means that when the sequence is going round, the end of the last step is still fading out while the first step is already fading in, and `poseAt` has to include the tail of the last step *and* the head of the first at once. (On the very first time round there is no "last step before it", so the first step is simply at full weight.) The loop's length (`cycle`) is a little less than the sequence's, by the length of the fade.

Smaller pieces: `timelineBars` turns the plan into bars (a left edge and a width as percents, and alternating rows so that the two bars of an overlap do not sit on top of each other); `sequenceProblems` says in sentences what would stop a sequence from playing; and `suggestSequence` picks a sequence from a model's clip names, using a small table of patterns (a walk, a run, anything that is not those or an idle, then an idle or a breath).

Create `js/sequence.js`:

```js
// A sequence is a list of clips that play one after another by themselves: walk, then run, then punch, then idle. This file is the *plan* of one, with no
// playing in it: how long each step lasts, when it starts (a step begins a little before the one before it ends, so that they cross-fade), and,
// for any moment in the sequence, which clips are playing, how far into each, and how much each one counts. Because the plan is a function of
// *time*, a sequence can be scrubbed, played backwards, tested at any moment, and always gives the same pose. See ../tests/sequence.tests.js.

// The limits of a step, and of a sequence. A step's speed is the player's.
const SEQUENCE_LIMITS = {
  repeat: { min: 1, max: 10, step: 1, start: 1 }, // times that a step plays its clip, one after another
  steps: { max: 12 }, // steps in a sequence
};

// A step as the lab keeps it: the clip's name, how many times it plays, and how fast.
function makeStep(clip, repeat = SEQUENCE_LIMITS.repeat.start, speed = PLAYER_LIMITS.speed.start) {
  return { clip, repeat: clampTo(SEQUENCE_LIMITS.repeat, Math.round(repeat)), speed: clampTo(PLAYER_LIMITS.speed, speed) };
}

// How long a step lasts, in seconds: the clip's length, as many times as it repeats, faster or slower by the speed.
function stepSeconds(info, step) {
  return (info.seconds * step.repeat) / step.speed;
}

// How long a cross-fade between two steps can be. It is what was asked for, but never more than half of either step (so that a fade never reaches
// back past the start of the step before, or on past the end of the one after), and nothing between two steps that are the same clip: a clip cannot be
// blended with itself, and a clip that is the same is a cut that nobody can see.
function fadeBetween(before, after, fade) {
  if (before.clip === after.clip) return 0;
  return Math.max(0, Math.min(fade, before.duration / 2, after.duration / 2));
}

// The plan of a sequence. `infoOf` gives a clip's timing from its name (see clips.js) or null for a clip that is not there; steps with no clip are left
// out. `fade` is how long the fades between steps are, and `loop` is whether the sequence goes round again (fading from its last step into its first).
// It gives back each step's start and end, and the length of the whole.
function planSequence(steps, infoOf, fade, loop) {
  const planned = [];
  steps.forEach((step, index) => {
    const info = infoOf(step.clip);
    if (!info) return;
    planned.push({ index, clip: step.clip, info, speed: step.speed, repeat: step.repeat, duration: stepSeconds(info, step), start: 0, end: 0, fadeIn: 0 });
  });
  planned.forEach((step, at) => {
    if (at === 0) {
      step.start = 0;
    } else {
      step.fadeIn = fadeBetween(planned[at - 1], step, fade);
      step.start = planned[at - 1].end - step.fadeIn;
    }
    step.end = step.start + step.duration;
  });
  const total = planned.length > 0 ? planned[planned.length - 1].end : 0;
  const loopFade = loop && planned.length > 1 ? fadeBetween(planned[planned.length - 1], planned[0], fade) : 0;
  return { steps: planned, total, loop: !!loop, loopFade, cycle: total - loopFade };
}

// How much a step counts at a moment `at` (in the plan's own seconds): it fades in over its `fadeIn` (the end of the step before it), and fades out
// again as the next step fades in.
function weightOfStep(plan, at, position, wrapped) {
  const step = plan.steps[position];
  const next = plan.steps[position + 1];
  let weight = 1;
  const fadeIn = position === 0 ? (wrapped ? plan.loopFade : 0) : step.fadeIn;
  if (fadeIn > 0 && at < step.start + fadeIn) weight *= fadeAmount(at - step.start, fadeIn);
  if (next && next.fadeIn > 0 && at >= next.start) weight *= 1 - fadeAmount(at - next.start, next.fadeIn);
  if (!next && plan.loopFade > 0 && at >= plan.cycle) weight *= 1 - fadeAmount(at - plan.cycle, plan.loopFade);
  return weight;
}

// The pose of a sequence at a moment: which clips play, how many seconds into each one, and how much each counts (the weights add up to 1).
// `done` says that a sequence that does not loop has come to its end. A time before the start is the start.
function poseAt(plan, time) {
  const pose = { time: 0, done: false, items: [] };
  if (plan.steps.length === 0) return { ...pose, done: true };
  let at = Math.max(time, 0);
  let wrapped = false;
  const moments = [];
  if (plan.loop && plan.cycle > 0) {
    wrapped = at >= plan.cycle;
    moments.push({ moment: at % plan.cycle, tail: false });
    if (wrapped) moments.push({ moment: (at % plan.cycle) + plan.cycle, tail: true }); // the end of the last step, still fading out into the first
  } else {
    if (at >= plan.total) {
      at = plan.total;
      pose.done = true;
    }
    moments.push({ moment: at, tail: false });
  }
  pose.time = at;
  for (const { moment, tail } of moments) {
    plan.steps.forEach((step, position) => {
      if (tail && position !== plan.steps.length - 1) return;
      const isLastMoment = pose.done && position === plan.steps.length - 1;
      if (!(moment >= step.start && (moment < step.end || (isLastMoment && moment <= step.end)))) return;
      const weight = weightOfStep(plan, moment, position, wrapped);
      const into = (moment - step.start) * step.speed;
      const seconds = moment >= step.end ? step.info.seconds : into % step.info.seconds;
      pose.items.push({ step: step.index, clip: step.clip, seconds, weight });
    });
  }
  return pose;
}

// The steps as bars on a timeline, with where they begin and how wide they are as a number from 0 to 100 (a percent of the whole sequence). A bar is on
// row 0 or row 1, in turn, so that two steps that overlap (the fade between them) are above and below each other and not on top of each other.
function timelineBars(plan) {
  if (plan.total <= 0) return [];
  return plan.steps.map((step, position) => ({
    index: step.index,
    clip: step.clip,
    left: (step.start / plan.total) * 100,
    width: (step.duration / plan.total) * 100,
    row: position % 2,
  }));
}

// Problems with a list of steps, as sentences: what would stop it from playing as it was written.
function sequenceProblems(steps, clipNames) {
  const problems = [];
  if (steps.length === 0) problems.push("There are no steps yet: add a clip.");
  if (steps.length > SEQUENCE_LIMITS.steps.max) problems.push(`A sequence can have up to ${SEQUENCE_LIMITS.steps.max} steps.`);
  steps.forEach((step, index) => {
    if (!clipNames.includes(step.clip)) problems.push(`Step ${index + 1} is "${step.clip}", and this model has no clip of that name.`);
  });
  return problems;
}

// A sequence to start from, for whatever clips a model has: a walk, a run, something to do, and an idle to settle into, taking the first clip whose
// name fits each, and using none twice. A model with none of those gets its first three clips.
const SUGGESTIONS = [/walk/i, /run/i, /^(?!.*(idle|walk|run|breath)).+/i, /idle|breath/i];

function suggestSequence(clipNames) {
  const chosen = [];
  for (const pattern of SUGGESTIONS) {
    const found = clipNames.find((name) => pattern.test(name) && !chosen.includes(name));
    if (found) chosen.push(found);
  }
  const names = chosen.length >= 2 ? chosen : clipNames.slice(0, 3);
  return names.map((name) => makeStep(name));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SEQUENCE_LIMITS, makeStep, stepSeconds, fadeBetween, planSequence, weightOfStep, poseAt, timelineBars, sequenceProblems, SUGGESTIONS, suggestSequence };
} else {
  Object.assign(window, { SEQUENCE_LIMITS, makeStep, stepSeconds, fadeBetween, planSequence, weightOfStep, poseAt, timelineBars, sequenceProblems, SUGGESTIONS, suggestSequence });
}
```

Now `tests/sequence.tests.js`. It begins with three clips that are only a name and a length (2, 1 and 2 seconds), so that the plan can be worked out on paper and checked, and then tests the real thing against it:

```js
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
```

Open `tests.html`: **229 passing tests**, 39 of them new.

## Step 2: Playing it (`sequencer.js`)

The sequencer applies the plan to a real model. Every frame it asks `poseAt` what the pose should be at *this* moment of the sequence, and puts each clip there, with its weight.

**It does not let Babylon.js play the clips.** In the Animations tutorial, the player started a clip and Babylon.js ran it on its own clock. Here the sequencer owns the clock (`time`), and holds each clip where the plan says. There was a trap in making that work, found by trying it:

> A clip that is **paused** *ignores its weight*. Two paused clips, each at weight 0.5, gave the pose of one of them at full weight.
>
> A clip that is **playing at almost no speed** (`HOLD_SPEED`, one hundred-thousandth of normal) and moved to a frame by hand every frame *does* blend: the hips came out at exactly the average.

That is why `apply` starts each clip at `HOLD_SPEED` and then calls `goToFrame`. One test proves the result: it plays Walking into Punch_Combo, stops in the middle of the fade, renders, and checks that the hips are exactly halfway between where each clip puts them on its own.

**It takes turns with the clip player.** Both control the same model's clips, so they must not fight. The rule is simple: `play` first stops the clip player; and every frame, `update` checks whether the clip player is *not* stopped. If someone has clicked a clip, the player has the clips now, and the sequence lets go and stops. (It does not stop the clips it was holding: the player already took them.)

**A clip that reaches its last frame is stopped by Babylon.js**, so `apply` starts any clip that is in the plan but is not running. A test plays a sequence to its end and plays it again.

**Editing while it plays** (`changed`) just keeps the time inside the new length. It is the simplest rule that is never wrong.

Create `js/sequencer.js`:

```js
// The sequencer: it plays a sequence (see sequence.js) on a model, with the controls of a media player (play, pause, stop, jump to a time) and
// the list of steps to edit. It has no buttons in it: a page, or a test, tells it what to do. See ../tests/sequencer.tests.js.
//
// Unlike the clip player, it does **not** let Babylon.js play the clips. Every frame it works out what the pose should be at this moment of the sequence
// (poseAt), and puts each clip at that point with that weight itself. A clip that is told to play at almost no speed, and is moved to a frame by hand
// each time, is the way to be sure of blending clips (a clip that is *paused* ignores its weight). The cost is nothing: the work was already a
// function of time, and the gain is that scrubbing a whole sequence and playing it are the same thing.

// The speed that clips are held at while the sequencer moves them by hand: not zero (a clip at zero is paused, and ignores its weight), but too slow to
// move by itself in any time that anyone would watch.
const HOLD_SPEED = 0.00001;

class Sequencer {
  // `player` is the model's ClipPlayer (player.js): it has the clips and the rest pose, and it yields to it when someone uses it.
  constructor(player) {
    this.player = player;
    this.steps = [];
    this.fade = PLAYER_LIMITS.fade.start;
    this.loop = false;
    this.time = 0;
    this.state = "stopped"; // "stopped" (at the rest pose), "playing", "paused" or "ended"
    this.active = new Set(); // the clips that it is holding now
    this.cached = null;
  }

  // The names of the clips the model has.
  get clipNames() {
    return this.player.groups.map((group) => group.name);
  }

  // The plan of the sequence as it is now (see planSequence). It is made again whenever the steps, the fade or the loop change.
  get plan() {
    if (!this.cached) {
      const infoOf = (name) => {
        const group = this.player.find(name);
        return group ? clipInfo(group) : null;
      };
      this.cached = planSequence(this.steps, infoOf, this.fade, this.loop);
    }
    return this.cached;
  }

  // Editing the sequence changes the plan under the time that it is at. The simplest rule that is never wrong is to keep the time as it is, held
  // inside the new length (and, for a sequence that loops, round again), and to put the pose where the plan now says it is.
  changed() {
    this.cached = null;
    const end = this.plan.loop ? this.plan.cycle : this.plan.total;
    if (this.plan.loop && end > 0) this.time = this.time % end;
    else this.time = Math.min(this.time, end);
    if (this.state !== "stopped") this.apply();
  }

  setSteps(steps) {
    this.steps = steps.slice(0, SEQUENCE_LIMITS.steps.max).map((step) => makeStep(step.clip, step.repeat, step.speed));
    this.changed();
  }

  // Adds a step at the end. Answers whether there was room.
  addStep(clip) {
    if (this.steps.length >= SEQUENCE_LIMITS.steps.max) return false;
    this.steps.push(makeStep(clip));
    this.changed();
    return true;
  }

  removeStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.steps.splice(index, 1);
    this.changed();
  }

  // Moves a step up (-1) or down (+1) the list.
  moveStep(index, delta) {
    const to = index + delta;
    if (index < 0 || index >= this.steps.length || to < 0 || to >= this.steps.length) return;
    [this.steps[index], this.steps[to]] = [this.steps[to], this.steps[index]];
    this.changed();
  }

  // Changes a step's clip, repeat or speed. Anything else in the patch is ignored, and the numbers are held between their limits.
  setStep(index, patch) {
    const step = this.steps[index];
    if (!step) return;
    this.steps[index] = makeStep(patch.clip ?? step.clip, patch.repeat ?? step.repeat, patch.speed ?? step.speed);
    this.changed();
  }

  setFade(value) {
    this.fade = clampTo(PLAYER_LIMITS.fade, value);
    this.changed();
  }

  setLoop(value) {
    this.loop = !!value;
    this.changed();
  }

  // Where the pose is now (see poseAt).
  get pose() {
    return poseAt(this.plan, this.time);
  }

  // How long the sequence is (one time round, if it loops).
  get length() {
    return this.plan.loop ? this.plan.cycle : this.plan.total;
  }

  // Plays from where it is, or from the start if it had ended. The clip player is stopped first, so that it is not holding the clips too.
  play() {
    if (this.plan.steps.length === 0) return false;
    this.player.stop();
    if (this.state === "ended" || (!this.plan.loop && this.time >= this.plan.total)) this.time = 0;
    this.state = "playing";
    this.apply();
    return true;
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  toggle() {
    if (this.state === "playing") this.pause();
    else this.play();
  }

  // Stops, goes back to the start, and puts the model in its rest pose.
  stop() {
    this.release();
    applyRestPose(this.player.rest);
    this.time = 0;
    this.state = "stopped";
  }

  // Jumps to a time in the sequence and pauses there: scrubbing.
  seek(seconds) {
    if (this.plan.steps.length === 0) return;
    this.player.stop();
    this.time = Math.min(Math.max(seconds, 0), this.plan.loop ? this.plan.cycle : this.plan.total);
    this.state = "paused";
    this.apply();
  }

  // Called every frame with the seconds since the last one.
  update(dt) {
    if (this.state === "stopped") return;
    // If someone has used the clip player, it has the clips now: the sequence lets go and stops.
    if (this.player.state !== "stopped") {
      this.active.clear();
      this.state = "stopped";
      this.time = 0;
      return;
    }
    if (this.state !== "playing") return;
    this.time += dt;
    if (!this.plan.loop && this.time >= this.plan.total) {
      this.time = this.plan.total;
      this.state = "ended";
    }
    this.apply();
  }

  // Puts the clips where the sequence says they are at this moment, with the weights it says.
  apply() {
    const pose = this.pose;
    const wanted = new Set();
    for (const item of pose.items) {
      const group = this.player.find(item.clip);
      if (!group) continue;
      wanted.add(group);
      // A clip that is moved to its very last frame ends, and Babylon.js stops it: so it is started again if it is not running.
      if (!this.active.has(group) || !group.isStarted) {
        group.start(false, HOLD_SPEED, group.from, group.to, false);
        this.active.add(group);
      }
      group.goToFrame(frameAt(clipInfo(group), item.seconds));
      group.setWeightForAllAnimatables(item.weight);
    }
    for (const group of [...this.active]) {
      if (wanted.has(group)) continue;
      group.stop();
      this.active.delete(group);
    }
  }

  // Lets go of the clips that it is holding.
  release() {
    this.active.forEach((group) => group.stop());
    this.active.clear();
  }

  dispose() {
    this.release();
    this.state = "stopped";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HOLD_SPEED, Sequencer };
} else {
  Object.assign(window, { HOLD_SPEED, Sequencer });
}
```

Then `tests/sequencer.tests.js`, which uses the real fire bender (Walking is 1.03 seconds, Running 0.63, Punch_Combo 2.47):

```js
QUnit.module("Sequencer", (hooks) => {
  let engine, scene, container, player, sequencer;
  const hips = () => scene.getTransformNodeByName("mixamorig:Hips");
  const started = () => container.animationGroups.filter((group) => group.isStarted).map((group) => group.name).sort();
  const weightOf = (name) => player.find(name).animatables[0].weight;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    new BABYLON.ArcRotateCamera("camera", 0, 1, 5, BABYLON.Vector3.Zero(), scene);
    ({ container } = await loadModelFile(scene, "../assets/characters/fire.glb"));
    showModel(container);
    player = new ClipPlayer(container.animationGroups);
    sequencer = new Sequencer(player);
  });
  hooks.afterEach(() => {
    sequencer.dispose();
    player.dispose();
    scene.dispose();
    engine.dispose();
  });

  // Walking is 1.03 s, Running 0.63 s and Punch_Combo 2.47 s.
  const walkRun = () => {
    sequencer.setFade(0.2);
    sequencer.setSteps(stepsOf("Walking", "Running"));
  };

  QUnit.test("begins stopped, with no steps, the starting fade, and no loop", (assert) => {
    assert.strictEqual(sequencer.state, "stopped");
    assert.deepEqual(sequencer.steps, []);
    assert.strictEqual(sequencer.fade, PLAYER_LIMITS.fade.start);
    assert.false(sequencer.loop);
    assert.strictEqual(sequencer.time, 0);
  });

  QUnit.test("knows the model's clips by name", (assert) => {
    assert.ok(sequencer.clipNames.includes("Walking"));
    assert.strictEqual(sequencer.clipNames.length, 12);
  });

  QUnit.test("its plan is as long as the steps and the fade make it", (assert) => {
    walkRun();
    const walking = clipInfo(player.find("Walking")).seconds;
    const running = clipInfo(player.find("Running")).seconds;
    assert.ok(near(sequencer.length, walking + running - 0.2));
  });

  QUnit.test("steps can be added up to the limit, taken away, and moved", (assert) => {
    sequencer.setSteps(stepsOf("Walking", "Running"));
    assert.true(sequencer.addStep("Idle_11"));
    assert.deepEqual(sequencer.steps.map((step) => step.clip), ["Walking", "Running", "Idle_11"]);
    sequencer.moveStep(2, -1);
    assert.deepEqual(sequencer.steps.map((step) => step.clip), ["Walking", "Idle_11", "Running"]);
    sequencer.moveStep(0, -1);
    sequencer.moveStep(2, 1);
    assert.deepEqual(sequencer.steps.map((step) => step.clip), ["Walking", "Idle_11", "Running"], "moving off the end does nothing");
    sequencer.removeStep(1);
    assert.deepEqual(sequencer.steps.map((step) => step.clip), ["Walking", "Running"]);
    sequencer.removeStep(9);
    assert.strictEqual(sequencer.steps.length, 2);
    while (sequencer.addStep("Walking"));
    assert.strictEqual(sequencer.steps.length, SEQUENCE_LIMITS.steps.max);
    assert.false(sequencer.addStep("Walking"));
  });

  QUnit.test("a step can be changed, and its numbers are held between their limits", (assert) => {
    sequencer.setSteps(stepsOf("Walking"));
    sequencer.setStep(0, { repeat: 99, speed: 0.01, clip: "Running", colour: "red" });
    assert.deepEqual(sequencer.steps[0], { clip: "Running", repeat: SEQUENCE_LIMITS.repeat.max, speed: PLAYER_LIMITS.speed.min });
    sequencer.setStep(5, { repeat: 2 });
    assert.strictEqual(sequencer.steps.length, 1);
  });

  QUnit.test("the fade is held between its limits", (assert) => {
    sequencer.setFade(50);
    assert.strictEqual(sequencer.fade, PLAYER_LIMITS.fade.max);
  });

  QUnit.test("with no steps, play does nothing", (assert) => {
    assert.false(sequencer.play());
    assert.strictEqual(sequencer.state, "stopped");
  });

  QUnit.test("a sequence of clips that the model does not have is no sequence", (assert) => {
    sequencer.setSteps(stepsOf("Moonwalk"));
    assert.false(sequencer.play());
  });

  QUnit.test("play puts the first clip at all of its weight, held so that it can be moved by hand", (assert) => {
    walkRun();
    assert.true(sequencer.play());
    assert.strictEqual(sequencer.state, "playing");
    assert.deepEqual(started(), ["Walking"]);
    assert.strictEqual(weightOf("Walking"), 1);
    assert.strictEqual(player.find("Walking").speedRatio, HOLD_SPEED);
  });

  QUnit.test("update moves the clock on, and the clip with it", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.update(0.3);
    assert.ok(near(sequencer.time, 0.3));
    const animatable = player.find("Walking").animatables[0];
    assert.ok(Math.abs(animatable.masterFrame - 0.3 * 60) < 0.01, `${animatable.masterFrame}`);
  });

  QUnit.test("in the fade between two steps, both clips are held and their weights add up to 1", (assert) => {
    walkRun();
    sequencer.play();
    const walking = clipInfo(player.find("Walking")).seconds;
    sequencer.update(walking - 0.1);
    assert.deepEqual(started(), ["Running", "Walking"]);
    assert.ok(near(weightOf("Walking") + weightOf("Running"), 1));
    assert.ok(weightOf("Running") > 0 && weightOf("Running") < 1);
  });

  QUnit.test("after the fade, the first clip is let go", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.update(clipInfo(player.find("Walking")).seconds + 0.05);
    assert.deepEqual(started(), ["Running"]);
    assert.strictEqual(weightOf("Running"), 1);
  });

  QUnit.test("the blended pose is the pose halfway between the clips, with nothing pulled out of shape", (assert) => {
    sequencer.setFade(1);
    sequencer.setSteps(stepsOf("Walking", "Punch_Combo"));
    // The fade is held to half of the shorter clip, so the middle of it is worked out from the plan.
    const second = sequencer.plan.steps[1];
    sequencer.seek(second.start + second.fadeIn / 2);
    scene.render();
    const blended = hips().position.clone();
    const pose = sequencer.pose;
    assert.strictEqual(pose.items.length, 2);
    assert.ok(near(pose.items[0].weight, 0.5));
    // The same two poses, one at a time.
    const alone = (item) => {
      sequencer.release();
      const group = player.find(item.clip);
      group.start(false, HOLD_SPEED, group.from, group.to, false);
      group.goToFrame(frameAt(clipInfo(group), item.seconds));
      group.setWeightForAllAnimatables(1);
      scene.render();
      const place = hips().position.clone();
      group.stop();
      return place;
    };
    const a = alone(pose.items[0]);
    const b = alone(pose.items[1]);
    const middle = a.add(b).scale(0.5);
    assert.ok(blended.subtract(middle).length() < 1e-3, `${blended.asArray()} vs ${middle.asArray()}`);
  });

  QUnit.test("a sequence that does not loop ends at its last frame, and play starts it again", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.update(99);
    assert.strictEqual(sequencer.state, "ended");
    assert.ok(near(sequencer.time, sequencer.length));
    sequencer.play();
    assert.strictEqual(sequencer.state, "playing");
    assert.strictEqual(sequencer.time, 0);
  });

  QUnit.test("after it has ended, play shows the first clip again from its start, even though Babylon.js stopped the last one", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.update(99);
    sequencer.play();
    sequencer.update(0.2);
    assert.deepEqual(started(), ["Walking"]);
    assert.ok(Math.abs(player.find("Walking").animatables[0].masterFrame - 0.2 * 60) < 0.01);
  });

  QUnit.test("a sequence that loops goes on past its length, and never ends", (assert) => {
    walkRun();
    sequencer.setLoop(true);
    sequencer.play();
    sequencer.update(sequencer.length + 0.5);
    assert.strictEqual(sequencer.state, "playing");
    assert.ok(sequencer.time > sequencer.length);
  });

  QUnit.test("pause stops the clock, and play carries on from there", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.update(0.4);
    sequencer.pause();
    sequencer.update(5);
    assert.ok(near(sequencer.time, 0.4));
    assert.strictEqual(sequencer.state, "paused");
    sequencer.play();
    assert.ok(near(sequencer.time, 0.4));
    assert.strictEqual(sequencer.state, "playing");
  });

  QUnit.test("seek jumps to a moment and pauses there, held inside the sequence", (assert) => {
    walkRun();
    sequencer.seek(0.7);
    assert.ok(near(sequencer.time, 0.7));
    assert.strictEqual(sequencer.state, "paused");
    sequencer.seek(999);
    assert.ok(near(sequencer.time, sequencer.length));
    sequencer.seek(-4);
    assert.strictEqual(sequencer.time, 0);
  });

  QUnit.test("stop goes back to the start and puts the model in its rest pose", (assert) => {
    const rest = hips().position.clone();
    walkRun();
    sequencer.seek(0.5);
    scene.render();
    assert.ok(hips().position.subtract(rest).length() > 0.01);
    sequencer.stop();
    assert.strictEqual(sequencer.state, "stopped");
    assert.strictEqual(sequencer.time, 0);
    assert.ok(hips().position.subtract(rest).length() < 1e-9);
    assert.deepEqual(started(), []);
  });

  QUnit.test("taking a step away while it plays keeps the time inside the shorter sequence", (assert) => {
    sequencer.setFade(0);
    sequencer.setSteps(stepsOf("Walking", "Punch_Combo"));
    sequencer.seek(3);
    sequencer.removeStep(1);
    assert.ok(sequencer.time <= sequencer.length + 1e-9);
    assert.strictEqual(sequencer.state, "paused");
  });

  QUnit.test("when someone uses the clip player, the sequence lets go and stops", (assert) => {
    walkRun();
    sequencer.play();
    player.play("Walking");
    sequencer.update(0.1);
    assert.strictEqual(sequencer.state, "stopped");
    assert.strictEqual(player.state, "playing");
    assert.deepEqual(started(), ["Walking"]);
  });

  QUnit.test("playing the sequence stops the clip player first", (assert) => {
    walkRun();
    player.play("Running");
    sequencer.play();
    assert.strictEqual(player.state, "stopped");
    assert.deepEqual(started(), ["Walking"]);
  });

  QUnit.test("dispose lets go of every clip", (assert) => {
    walkRun();
    sequencer.play();
    sequencer.dispose();
    assert.deepEqual(started(), []);
    assert.strictEqual(sequencer.state, "stopped");
  });
});
```

Open `tests.html`: **252 passing tests**, 23 of them new.

## Step 3: The controls (`sequencepanel.js`)

The panel makes the sequencer something to use. It is the biggest piece of page code so far, and it follows the pattern of the earlier panels:

- **`build`** draws the list of steps and the timeline *again* after every edit. A row has a clip menu, two number boxes (the repeat and the speed, with their limits from the tables), and the buttons to move or remove it. Every edit goes through the sequencer (`sequencer.setStep(...)`) and then the panel is rebuilt from what the sequencer now says: **the sequencer is the truth, and the panel only shows it**.
- **`drawTimeline`** makes a bar for each step from `timelineBars`.
- **`refresh`** runs every frame: it moves the playhead and the scrubber, says in the readout where it is and which step is playing, and marks the bars of the steps that are playing. As in the Animations tutorial, it leaves the scrubber alone while you are holding it.

A step whose clip the model does not have (you opened a different model, say) is shown as "(not here)", and the sentence from `sequenceProblems` says so, and the step is **not lost**: nothing a person has built is thrown away without being asked.

As always, every name goes on the page as text and never as HTML.

Create `js/sequencepanel.js`:

```js
// The sequencer's controls on the page: the list of steps (each with its clip, how many times it repeats, and its speed, and buttons to move it or take
// it away), a place to add one, the fade and loop, the buttons of a media player and a scrubber over the whole sequence, and a **timeline** that draws each step
// as a bar so that you can see where they overlap. Like the rest of the panel it puts text on the page with textContent only.
// See ../tests/sequencepanel.tests.js.

// The words of the readout: where the sequence is, and which step.
function sequenceReadout(sequencer) {
  const plan = sequencer.plan;
  if (plan.steps.length === 0) return "No steps";
  const pose = sequencer.pose;
  const main = pose.items.reduce((best, item) => (!best || item.weight > best.weight ? item : best), null);
  const where = `${sequencer.time.toFixed(2)} / ${sequencer.length.toFixed(2)} s`;
  return main ? `${where}, step ${main.step + 1} of ${sequencer.steps.length}: ${main.clip}` : where;
}

// What the play button says.
function sequencePlayLabel(state) {
  if (state === "playing") return "Pause";
  return state === "ended" ? "Replay" : "Play sequence";
}

// A number box with limits (from a table of limits), which calls back with its number.
function makeNumber(limit, value, label, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(limit.min);
  input.max = String(limit.max);
  input.step = String(limit.step);
  input.value = String(value);
  input.setAttribute("aria-label", label);
  input.addEventListener("change", () => onChange(Number(input.value)));
  return input;
}

class SequencePanel {
  constructor(container) {
    this.container = container;
    this.sequencer = null;
    this.rows = [];
    this.bars = [];
    this.scrubbing = false;
  }

  // Builds the controls for a sequencer.
  show(sequencer) {
    this.sequencer = sequencer;
    if (sequencer.clipNames.length === 0) {
      this.container.replaceChildren(el("p", "This model has no animation clips, so there is nothing to sequence.", "message"));
      return;
    }
    this.list = el("div", null, "steps");
    this.timeline = el("div", null, "timeline");
    this.problems = el("p", null, "message error");

    // Adding a step.
    this.adder = document.createElement("select");
    this.adder.setAttribute("aria-label", "Clip to add");
    sequencer.clipNames.forEach((name) => this.adder.append(new Option(name, name)));
    const add = makeButton("Add step", "transport", () => {
      sequencer.addStep(this.adder.value);
      this.build();
    });
    const suggest = makeButton("Suggest one", "transport", () => {
      sequencer.setSteps(suggestSequence(sequencer.clipNames));
      this.build();
    });
    const adding = el("div", null, "adding");
    adding.append(this.adder, add, suggest);

    // How the steps join, and whether it goes round.
    const fade = makeSlider(PLAYER_LIMITS.fade, sequencer.fade, fadeLabel, (value) => {
      sequencer.setFade(value);
      this.drawTimeline();
    });
    const loop = el("label", null, "option");
    const loopBox = document.createElement("input");
    loopBox.type = "checkbox";
    loopBox.checked = sequencer.loop;
    loopBox.addEventListener("change", () => {
      sequencer.setLoop(loopBox.checked);
      this.drawTimeline();
    });
    loop.append(loopBox, el("span", "Loop the sequence"));

    // Playing it.
    this.playButton = makeButton("Play sequence", "transport primary", () => {
      sequencer.toggle();
      this.refresh();
    });
    this.stopButton = makeButton("Stop", "transport", () => {
      sequencer.stop();
      this.refresh();
    });
    const transport = el("div", null, "transport-row two");
    transport.append(this.playButton, this.stopButton);
    this.scrubber = document.createElement("input");
    this.scrubber.type = "range";
    this.scrubber.min = "0";
    this.scrubber.max = String(SCRUBBER_STEPS);
    this.scrubber.value = "0";
    this.scrubber.addEventListener("input", () => {
      this.scrubbing = true;
      sequencer.seek((Number(this.scrubber.value) / SCRUBBER_STEPS) * sequencer.length);
    });
    this.scrubber.addEventListener("change", () => {
      this.scrubbing = false;
    });
    this.readout = el("div", null, "readout");

    const controls = el("div", null, "player-controls");
    controls.append(this.list, adding, fade.row, loop, this.timeline, transport, this.scrubber, this.readout, this.problems);
    this.container.replaceChildren(makeSection("Sequence", null, controls, true));
    this.build();
  }

  // Draws the list of steps and the timeline again (after an edit).
  build() {
    const sequencer = this.sequencer;
    this.rows = [];
    const rows = sequencer.steps.map((step, index) => {
      const row = el("div", null, "step");
      row.append(el("span", String(index + 1), "number"));
      const clip = document.createElement("select");
      clip.setAttribute("aria-label", `Clip of step ${index + 1}`);
      sequencer.clipNames.forEach((name) => clip.append(new Option(name, name)));
      if (!sequencer.clipNames.includes(step.clip)) clip.append(new Option(`${step.clip} (not here)`, step.clip));
      clip.value = step.clip;
      clip.addEventListener("change", () => {
        sequencer.setStep(index, { clip: clip.value });
        this.build();
      });
      const repeat = makeNumber(SEQUENCE_LIMITS.repeat, step.repeat, `Times to play step ${index + 1}`, (value) => {
        sequencer.setStep(index, { repeat: value });
        this.build();
      });
      const speed = makeNumber(PLAYER_LIMITS.speed, step.speed, `Speed of step ${index + 1}`, (value) => {
        sequencer.setStep(index, { speed: value });
        this.build();
      });
      const up = makeButton("^", "small", () => {
        sequencer.moveStep(index, -1);
        this.build();
      });
      const down = makeButton("v", "small", () => {
        sequencer.moveStep(index, 1);
        this.build();
      });
      const remove = makeButton("x", "small", () => {
        sequencer.removeStep(index);
        this.build();
      });
      up.title = "Move up";
      down.title = "Move down";
      remove.title = "Take away";
      const rest = el("div", null, "rest");
      rest.append(el("span", "times", "unit"), repeat, el("span", "speed", "unit"), speed, up, down, remove);
      row.append(clip, rest);
      this.rows.push(row);
      return row;
    });
    this.list.replaceChildren(...rows);
    this.drawTimeline();
    this.refresh();
  }

  // Draws each step as a bar. The bars are as wide as the steps are long, and where two overlap (the fade) they are on different rows.
  drawTimeline() {
    const sequencer = this.sequencer;
    const bars = timelineBars(sequencer.plan);
    this.bars = bars.map((bar) => {
      const element = el("div", bar.clip, `bar row-${bar.row}`);
      element.style.left = `${bar.left}%`;
      element.style.width = `${bar.width}%`;
      element.title = `Step ${bar.index + 1}: ${bar.clip}`;
      element.dataset.index = String(bar.index);
      return element;
    });
    this.playhead = el("div", null, "playhead");
    this.timeline.replaceChildren(...this.bars, this.playhead);
    this.problems.textContent = sequenceProblems(sequencer.steps, sequencer.clipNames).join(" ");
  }

  // Brings the controls up to date: called every frame, so that the playhead and the scrubber move as the sequence plays.
  refresh() {
    const sequencer = this.sequencer;
    if (!sequencer || !this.playButton) return;
    this.playButton.textContent = sequencePlayLabel(sequencer.state);
    const empty = sequencer.plan.steps.length === 0;
    this.playButton.disabled = empty;
    this.stopButton.disabled = empty;
    this.scrubber.disabled = empty;
    const length = sequencer.length;
    const fraction = length > 0 ? sequencer.time / length : 0;
    if (!this.scrubbing) this.scrubber.value = String(Math.round(fraction * SCRUBBER_STEPS));
    this.playhead.style.left = `${Math.min(fraction, 1) * 100}%`;
    this.readout.textContent = sequenceReadout(sequencer);
    const playing = new Set(sequencer.state === "stopped" ? [] : sequencer.pose.items.map((item) => String(item.step)));
    this.bars.forEach((bar) => bar.classList.toggle("playing", playing.has(bar.dataset.index)));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { sequenceReadout, sequencePlayLabel, makeNumber, SequencePanel };
} else {
  Object.assign(window, { sequenceReadout, sequencePlayLabel, makeNumber, SequencePanel });
}
```

Then `tests/sequencepanel.tests.js`:

```js
QUnit.module("the words of the sequence controls", () => {
  QUnit.test("the play button says what it will do", (assert) => {
    assert.strictEqual(sequencePlayLabel("playing"), "Pause");
    assert.strictEqual(sequencePlayLabel("ended"), "Replay");
    assert.strictEqual(sequencePlayLabel("stopped"), "Play sequence");
    assert.strictEqual(sequencePlayLabel("paused"), "Play sequence");
  });

  QUnit.test("makeNumber is a number box with limits that calls back with a number", (assert) => {
    let got = null;
    const input = makeNumber({ min: 1, max: 10, step: 1 }, 3, "Times", (value) => (got = value));
    assert.strictEqual(input.type, "number");
    assert.strictEqual(input.max, "10");
    assert.strictEqual(input.value, "3");
    input.value = "7";
    input.dispatchEvent(new Event("change"));
    assert.strictEqual(got, 7);
  });
});

QUnit.module("SequencePanel", (hooks) => {
  let engine, scene, container, player, sequencer, holder, panel;
  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    new BABYLON.ArcRotateCamera("camera", 0, 1, 5, BABYLON.Vector3.Zero(), scene);
    ({ container } = await loadModelFile(scene, "../assets/characters/fire.glb"));
    showModel(container);
    player = new ClipPlayer(container.animationGroups);
    sequencer = new Sequencer(player);
    sequencer.setSteps(suggestSequence(sequencer.clipNames));
    holder = document.createElement("div");
    panel = new SequencePanel(holder);
    panel.show(sequencer);
  });
  hooks.afterEach(() => {
    sequencer.dispose();
    player.dispose();
    scene.dispose();
    engine.dispose();
  });

  const rows = () => holder.querySelectorAll(".step");
  const clips = () => sequencer.steps.map((step) => step.clip);
  const buttonNamed = (text) => [...holder.querySelectorAll("button")].find((button) => button.textContent === text);

  QUnit.test("shows a row for each step, and a bar for each on the timeline", (assert) => {
    assert.strictEqual(rows().length, 4);
    assert.strictEqual(holder.querySelectorAll(".timeline .bar").length, 4);
  });

  QUnit.test("a row says its clip, how many times it plays, and its speed", (assert) => {
    const row = rows()[0];
    assert.strictEqual(row.querySelector("select").value, "Walking");
    const numbers = row.querySelectorAll('input[type="number"]');
    assert.strictEqual(numbers[0].value, "1");
    assert.strictEqual(numbers[1].value, "1");
  });

  QUnit.test("add step puts the chosen clip at the end", (assert) => {
    holder.querySelector(".adding select").value = "Leg_Sweep";
    buttonNamed("Add step").click();
    assert.strictEqual(rows().length, 5);
    assert.strictEqual(clips()[4], "Leg_Sweep");
  });

  QUnit.test("suggest one puts the suggested steps back", (assert) => {
    sequencer.setSteps([makeStep("Idle_11")]);
    panel.build();
    buttonNamed("Suggest one").click();
    assert.deepEqual(clips(), ["Walking", "Running", "Elbow_Strike", "Idle_11"]);
  });

  QUnit.test("the buttons of a row move it and take it away", (assert) => {
    rows()[1].querySelector('button[title="Move up"]').click();
    assert.deepEqual(clips(), ["Running", "Walking", "Elbow_Strike", "Idle_11"]);
    rows()[0].querySelector('button[title="Move down"]').click();
    assert.deepEqual(clips(), ["Walking", "Running", "Elbow_Strike", "Idle_11"]);
    rows()[3].querySelector('button[title="Take away"]').click();
    assert.strictEqual(rows().length, 3);
  });

  QUnit.test("changing a row's clip, repeat or speed changes the step", (assert) => {
    const clip = rows()[0].querySelector("select");
    clip.value = "High_Kick";
    clip.dispatchEvent(new Event("change"));
    assert.strictEqual(sequencer.steps[0].clip, "High_Kick");
    const numbers = rows()[1].querySelectorAll('input[type="number"]');
    numbers[0].value = "3";
    numbers[0].dispatchEvent(new Event("change"));
    assert.strictEqual(sequencer.steps[1].repeat, 3);
    const again = rows()[1].querySelectorAll('input[type="number"]');
    again[1].value = "2";
    again[1].dispatchEvent(new Event("change"));
    assert.strictEqual(sequencer.steps[1].speed, 2);
  });

  QUnit.test("the timeline is drawn again when the fade changes, and the bars of a fade overlap", (assert) => {
    const first = () => holder.querySelectorAll(".timeline .bar");
    const slider = holder.querySelector('.slider input[type="range"]');
    slider.value = "0";
    slider.dispatchEvent(new Event("input"));
    assert.strictEqual(sequencer.fade, 0);
    const bars = [...first()];
    assert.ok(parseFloat(bars[1].style.left) >= parseFloat(bars[0].style.left) + parseFloat(bars[0].style.width) - 1e-6);
    slider.value = "0.5";
    slider.dispatchEvent(new Event("input"));
    const overlapping = [...first()];
    assert.ok(parseFloat(overlapping[1].style.left) < parseFloat(overlapping[0].style.left) + parseFloat(overlapping[0].style.width));
  });

  QUnit.test("the loop box sets the loop", (assert) => {
    const box = holder.querySelector('label.option input[type="checkbox"]');
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    assert.true(sequencer.loop);
  });

  QUnit.test("the play button plays and pauses the sequence, and stop stops it", (assert) => {
    buttonNamed("Play sequence").click();
    assert.strictEqual(sequencer.state, "playing");
    assert.strictEqual(panel.playButton.textContent, "Pause");
    panel.playButton.click();
    assert.strictEqual(sequencer.state, "paused");
    panel.stopButton.click();
    assert.strictEqual(sequencer.state, "stopped");
  });

  QUnit.test("the scrubber jumps to that part of the whole sequence", (assert) => {
    panel.scrubber.value = "500";
    panel.scrubber.dispatchEvent(new Event("input"));
    assert.ok(near(sequencer.time, sequencer.length / 2) || Math.abs(sequencer.time - sequencer.length / 2) < 0.01);
    assert.strictEqual(sequencer.state, "paused");
  });

  QUnit.test("the playhead and the scrubber follow the clock, except while the scrubber is held", (assert) => {
    sequencer.play();
    sequencer.update(sequencer.length / 4);
    panel.refresh();
    assert.ok(Math.abs(Number(panel.scrubber.value) - 250) <= 1);
    assert.ok(Math.abs(parseFloat(panel.playhead.style.left) - 25) < 0.2);
    panel.scrubbing = true;
    sequencer.update(sequencer.length / 4);
    panel.refresh();
    assert.ok(Math.abs(Number(panel.scrubber.value) - 250) <= 1);
  });

  QUnit.test("the bar of a step that is playing is marked", (assert) => {
    sequencer.seek(0.1);
    panel.refresh();
    const playing = holder.querySelectorAll(".timeline .bar.playing");
    assert.strictEqual(playing.length, 1);
    assert.strictEqual(playing[0].dataset.index, "0");
  });

  QUnit.test("the readout says the time, and which step", (assert) => {
    sequencer.seek(0.1);
    panel.refresh();
    assert.ok(/^0\.10 \/ \d+\.\d\d s, step 1 of 4: Walking$/.test(panel.readout.textContent), panel.readout.textContent);
  });

  QUnit.test("with no steps, it says so, and the buttons are off", (assert) => {
    sequencer.setSteps([]);
    panel.build();
    assert.true(panel.playButton.disabled);
    assert.ok(holder.textContent.includes("no steps yet"));
    assert.strictEqual(panel.readout.textContent, "No steps");
  });

  QUnit.test("a step whose clip is not on the model says so, and is not lost", (assert) => {
    sequencer.setSteps([makeStep("Walking"), makeStep("Moonwalk")]);
    panel.build();
    assert.ok(holder.querySelector(".message.error").textContent.includes("Moonwalk"));
    assert.strictEqual(rows()[1].querySelector("select").value, "Moonwalk");
  });

  QUnit.test("a model with no clips says so", (assert) => {
    const empty = document.createElement("div");
    new SequencePanel(empty).show({ clipNames: [] });
    assert.ok(empty.textContent.includes("no animation clips"));
  });

  QUnit.test("a clip's name is shown as text and never as HTML", (assert) => {
    player.groups[0].name = "<img src=x onerror=alert(1)>";
    sequencer.setSteps([makeStep("<img src=x onerror=alert(1)>")]);
    panel.show(sequencer);
    assert.strictEqual(holder.querySelector("img"), null);
    assert.ok(holder.querySelector(".bar").textContent.includes("<img src=x"));
  });
});
```

Open `tests.html`: **271 passing tests**, 19 of them new. That is all of them.

## Step 4: The page

Everything is ready, and `index.html` already has a place for the sequencer (a `div` with the id `sequence`, under the player) and lists the new scripts. Two things are left: the styles, and five small changes to `js/main.js`.

Create `css/sequence.css`:

```css
/* The sequencer: the list of steps, and the timeline that draws them as bars. */
#sequence {
  display: grid;
  gap: 8px;
}
.steps {
  display: grid;
  gap: 6px;
}
.step {
  display: grid;
  grid-template-columns: 22px 1fr;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--bg);
  border: 1px solid var(--panel-edge);
  border-radius: 6px;
}
.step .number {
  width: 18px;
  color: var(--accent);
  font: 700 13px var(--mono);
  text-align: center;
}
.step select {
  min-width: 0;
}
.step .rest {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 4px;
}
.step .unit {
  color: var(--ink-dim);
  font-size: 11px;
}
.step input[type="number"] {
  width: 46px;
}
.step select,
.step input[type="number"],
.adding select {
  padding: 3px 4px;
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  font: 12px var(--font);
}
button.small {
  width: 24px;
  padding: 3px 0;
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  font: 12px var(--mono);
  cursor: pointer;
}
button.small:hover {
  border-color: var(--accent);
}
.adding {
  display: flex;
  gap: 4px;
}
.adding select {
  flex: 1;
  min-width: 0;
}
.adding button.transport {
  padding: 5px 8px;
}
.transport-row.two {
  grid-template-columns: 2fr 1fr;
}
.timeline {
  position: relative;
  height: 52px;
  background: var(--bg);
  border: 1px solid var(--panel-edge);
  border-radius: 6px;
  overflow: hidden;
}
.timeline .bar {
  position: absolute;
  height: 22px;
  box-sizing: border-box;
  padding: 0 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: #2b4a73;
  border: 1px solid #5ab0ff;
  border-radius: 4px;
  font: 11px / 20px var(--font);
}
.timeline .bar.row-0 {
  top: 3px;
}
.timeline .bar.row-1 {
  top: 27px;
}
.timeline .bar.playing {
  background: #7a5a12;
  border-color: #ffd35a;
}
.timeline .playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff8a7a;
  pointer-events: none;
}
.message.error:empty {
  display: none;
}
```

Now `js/main.js`. The line numbers are for the file as you have it now; each change adds lines, so each of the later ones is further down by the time you get to it (look for the code, which is quoted).

**1. Make the panel.** Find the line that makes `playerPanel` (line 23). Add a line after it:

```js
const sequencePanel = new SequencePanel(document.getElementById("sequence"));
```

**2. Keep the sequencer.** Find `let player = null;` (line 28, now 29) and add a line after it:

```js
let sequencer = null;
```

**3. Let go of the old one.** In `openModel`, find the line that disposes of the old player (line 41, now 43):

```js
    if (player) player.dispose();
```

and add a line *before* it, so that the sequencer lets go of the clips before the player does:

```js
    if (sequencer) sequencer.dispose();
```

**4. Make a sequencer for each model.** A little lower, find the line that shows the player's controls (line 45, now 48):

```js
    playerPanel.show(player);
```

and add three lines after it. The sequencer starts with a suggestion that suits the model:

```js
    sequencer = new Sequencer(player);
    sequencer.setSteps(suggestSequence(sequencer.clipNames));
    sequencePanel.show(sequencer);
```

**5. Run it every frame.** Near the end, find the comment and the five lines that follow it (lines 112 to 117, now 118 to 123):

```js
// Each frame, the player runs any cross-fade and the controls catch up with it, and the skeleton's picture follows the bones.
scene.onBeforeRenderObservable.add(() => {
  if (player) player.update(engine.getDeltaTime() / 1000);
  playerPanel.refresh();
  skeletonView.update(viewer.state.bones);
});
```

Replace them with:

```js
// Each frame, the player and the sequencer run (the player's cross-fade, the sequence's clock), the controls catch up with them, and the skeleton's picture
// follows the bones.
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;
  if (player) player.update(dt);
  if (sequencer) sequencer.update(dt);
  playerPanel.refresh();
  sequencePanel.refresh();
  skeletonView.update(viewer.state.bones);
});
```

Open `index.html` through the web server. Scroll the panel down to **Sequence**. You should see four steps already there (Walking, Running, Elbow_Strike, Idle_11), a timeline with four bars, and a *Play sequence* button. Try these:

1. **Press Play sequence.** The character walks, runs, strikes and settles into an idle, by itself, with no jump at any join. Watch the red playhead go along the timeline, and the bar of the step that is playing turn gold. Two bars are gold at once during a fade.
2. **Drag the scrubber.** Because the pose is a function of time, scrubbing the *whole sequence* is exactly the same as playing it. Pause in the middle of a fade and look at the pose: neither clip, and halfway between them.
3. **Set the fade to nothing.** Play again: the bars now touch and do not overlap, and every join is a jump. Set it to a full second: the fade is held to half of the shorter clip, so the bars overlap by as much as they can.
4. **Change a step.** Make the Elbow_Strike repeat 3 times and watch its bar grow. Set a step's speed to 2 and watch it shrink. Move a step up with `^`.
5. **Loop the sequence.** The last step fades into the first and it goes on for ever. Without the loop fade, it would jump from the idle back into the walk.
6. **Put the same clip twice in a row** (two Walkings). There is no overlap between them (the bars touch) because a clip cannot fade into itself.
7. **Click a clip in the player above.** The sequence stops: the player has the clips now. Press *Play sequence* again: the player stops and the sequence has them back.
8. **Open the air bender and the cat** (the cat is in `source_assets/model_lab/` if you have it). *Suggest one* makes a different sequence for each, from their clip names.

## Troubleshooting

| Problem | Likely cause |
|---------|--------------|
| Two clips fade, but the pose does not blend (it is just the last one) | The clips are *paused* (a paused clip ignores its weight). `apply` has to start each clip at `HOLD_SPEED` and move it with `goToFrame` |
| The model jumps at every join | The fade is 0, or the two steps are the same clip. Look at the timeline: do the bars overlap? |
| The model freezes for a moment at the join | The next step starts *after* the old one ends, instead of `fadeIn` seconds before. Check `planSequence` |
| It does not play a second time | `apply` should start a clip that is in the plan but is not running (`!group.isStarted`): Babylon.js stops a clip that reaches its last frame |
| The loop jumps at the end | `loopFade` is missing, so the last step is not fading into the first. Check `poseAt`'s second moment |
| The sequence and the player fight | `play` should stop the player, and `update` should let go when the player is not stopped |
| A test says `makeStep is not defined` | `sequence.js` is empty or has no export block at the bottom |

## What you've built

A sequencer: a list of steps that plays clips one after another with a cross-fade built into every join, drawn as a timeline you can see, scrubbed as easily as played, and looped without a jump. Its plan is a pure function of time that was tested at thousands of moments, and the one thing that could only be found by trying (a paused clip ignores its weight) has a test of its own.

## Next

**Sockets**: attaching a thing to a bone. A sword is a model that follows a hand, and now that the skeleton moves in sequences, you will see it go with the hand through all of them. The tutorial covers the offsets, the turns, and the trap with the model's scale that the Skeleton tutorial warned about.
