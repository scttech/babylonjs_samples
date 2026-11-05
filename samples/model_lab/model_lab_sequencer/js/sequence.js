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
