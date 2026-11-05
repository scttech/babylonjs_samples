# Tutorial: Model Lab, Animations -- Play a Clip

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

The [Skeleton tutorial](../model_lab_skeleton/TUTORIAL.md) found the bones and drew them. This tutorial makes them move. Every character that comes with the lab has between four and twelve **animation clips** (Walking, Running, Punch_Combo, Idle...), and here you will build a **player** for them, like the one in a music or video app: pick a clip, play and pause, step a frame at a time, drag a scrubber to any moment, slow it down, loop it, and **fade from one clip into the next** without a jump. You will also open a clip and see what it is actually made of.

You write the code; this document tells you what to write, and why.

By the end you'll have a page where you can:

- **Pick a clip** from a list that shows how long each one is, and play it, with the skeleton from the last tutorial moving with it
- **Control it**: play, pause, stop (back to the rest pose), step one frame forward or back, **scrub** to any part of the clip, change the speed from a tenth to double, and loop or not
- **Cross-fade** between clips: click another clip while one is playing and the model *flows* from one into the other over a time that you choose (or cuts, if you set it to nothing)
- **Look inside a clip**: how many tracks it has, what each one moves, and how many keyframes
- Unit tests for all of it: **190 passing tests**, 75 of them new, including some that prove a fact that the next tutorials depend on: **every clip needs exactly the bones of the skeleton, and nothing else**

**What you'll learn:** what an animation clip is made of (tracks, keyframes, frames and a frame rate), how weights blend two clips into one pose, why a cross-fade has to add up to exactly 1, how to put a model back in its rest pose (Babylon.js does not), how to build a player that has no buttons in it so that a test can press them, and how to keep a slider in step with something that moves by itself.

**Before you start:** do the [Skeleton tutorial](../model_lab_skeleton/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Words you'll meet

| Word | What it means |
|------|---------------|
| **Animation clip** | A recording of movement: "walk", "run", "punch". It says where every moving part should be at every moment. In Babylon.js, a clip is called an **animation group**. |
| **Track** | One part of a clip: **one thing moving in one way**. "The left forearm's rotation" is a track; "the hips' position" is another. A clip is a bundle of tracks that play together. |
| **Keyframe** | One point on a track: a moment, and the value at that moment. A track does not store every moment: it stores a few, and the values between two keyframes are **blended** (interpolated) for you. |
| **Frame** and **frame rate** | A clip counts time in **frames**, like a film, and says how many go by each second (the **frame rate**, or **fps**). The same number of frames is a different length of time at a different rate, so a clip's length in seconds is its frames divided by its fps. The lab's clips run at 60. |
| **Morph target** | A shape that a mesh can blend towards, such as a smile. It has an **influence** (0 is none of the shape, 1 is all of it), and a clip can animate it, as it does a bone. |
| **Rest pose** | Where the bones (and anything else a clip moves) are before any clip moves them. A clip's first frame is *not* the rest pose: a walk begins in the middle of a stride. |
| **Loop** | A clip that goes back to its start when it reaches its end, so a walk can go on for ever. A clip that does not loop stops at its last frame. |
| **Speed ratio** | How fast a clip plays compared to how it was made: 1 is as it was made, 2 is twice as fast, 0.5 is half. |
| **Scrubbing** | Dragging along a clip's timeline to look at any moment, as you do in a video. |
| **Weight** | How much a clip counts in the pose of the model, from 0 (none of it) to 1 (all of it). One clip at weight 1 is the whole pose. |
| **Blending** | Mixing the poses of clips that have a weight. Two clips at weight 0.5 each are a pose halfway between them. |
| **Cross-fade** | Changing from one clip to another by blending: for a short time both play, the old clip's weight falls from 1 to 0 while the new one's rises from 0 to 1. Without it, a model would jump from one pose to the other in a single frame. |
| **Easing** | Starting and stopping a change gently instead of at full speed. A fade that eases has no sudden start and no sudden stop. |

## Where you're starting

This folder is a copy of the finished Skeleton sample, plus placeholders for the new files:

```
model_lab_animations/
├── index.html, tests.html   (already list the new files)
├── css/
│   ├── player.css          (placeholder -- Step 5)
│   └── everything else, from the Skeleton sample
├── js/
│   ├── clips.js            (placeholder -- Step 1)
│   ├── fade.js             (placeholder -- Step 2)
│   ├── player.js           (placeholder -- Step 3)
│   ├── playerpanel.js      (placeholder -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── everything else, from the Skeleton sample
└── tests/
    ├── clips.tests.js, fade.tests.js, player.tests.js, playerpanel.tests.js   (placeholders -- Steps 1 to 4)
    └── everything else, from the Skeleton sample
```

Open `tests.html` before you change anything, through the web server (`npx serve` in the repo root). You should see **115 passing tests**.

## Step 1: What a clip is made of (`clips.js`)

A clip is a bundle of **tracks**, and a track is a list of **keyframes**. This file reads a clip into plain data, with no playing in it, so that its length, its tracks and the bones that it needs can all be looked at and tested.

The key idea is the first function. **A clip counts frames, not seconds.** `clipInfo` finds where the clip starts and ends in frames, how many frames go by each second (the track says: Mixamo's clips run at 60), and so how long the clip is: `frames / fps`. The tests use a clip with the same frames at two rates to show it.

`frameAt` and `secondsAt` turn one into the other (the scrubber thinks in seconds, but the clip thinks in frames), and both hold a time that is outside the clip to the nearest end.

`describeTracks`, `summarizeTracks` and `clipTargets` look inside. The last of them is a **list of needs**: the names of everything that a clip moves. A clip can only be played on a model that has something of each of those names. When the real clips are tested at the end of the test file, the result is the fact that the rest of the series stands on:

> **Every clip of every character needs exactly the 24 bones of the skeleton, and the three characters need the same ones.**

That is why a clip from one character can be borrowed by another (a later tutorial does it), and how a clip that does *not* fit will be spotted.

Create `js/clips.js`:

```js
// What an animation clip is made of. A clip (Babylon.js calls it an *animation group*) is a bundle of **tracks**: one track for each thing that
// moves and each way that it moves ("the left forearm's rotation", "the hips' position"). A track is a list of **keyframes**: a time, and what the
// value is at that time. Between two keyframes the value is worked out (blended) for you. This file reads clips into plain data, with
// no playing in it, so that the length, the tracks and the bones that a clip needs can all be looked at and tested. See ../tests/clips.tests.js.

// The frame rate that is assumed for a clip that has no tracks to say it.
const DEFAULT_FRAME_RATE = 60;

// A clip's timing: where it starts and ends (in frames), how fast the frames go (frames per second), and so how long it is in seconds.
// A clip counts *frames*, not seconds, and the same number of frames is a different time at a different rate.
function clipInfo(group) {
  const first = group.targetedAnimations[0];
  const fps = first ? first.animation.framePerSecond : DEFAULT_FRAME_RATE;
  const frames = group.to - group.from;
  return { name: group.name, from: group.from, to: group.to, fps, frames, seconds: frames / fps };
}

// The frame that a number of seconds into a clip is at. A time outside the clip is the nearest end of it.
function frameAt(info, seconds) {
  const inside = Math.min(Math.max(seconds, 0), info.seconds);
  return info.from + inside * info.fps;
}

// The seconds into a clip that a frame is at (the other way round from frameAt).
function secondsAt(info, frame) {
  const inside = Math.min(Math.max(frame, info.from), info.to);
  return (inside - info.from) / info.fps;
}

// The tracks of a clip, as plain data: what moves (a bone's name), how (position, rotation or scale), and how many keyframes the track has.
function describeTracks(group) {
  return group.targetedAnimations.map((targeted) => ({
    target: targeted.target.name,
    short: shortName(targeted.target.name),
    property: targeted.animation.targetProperty,
    keys: targeted.animation.getKeys().length,
  }));
}

// The tracks of a clip in a few numbers: how many tracks, how many different things they move, how many keyframes in all, and how many tracks for
// each property.
function summarizeTracks(tracks) {
  const byProperty = {};
  for (const track of tracks) byProperty[track.property] = (byProperty[track.property] || 0) + 1;
  return {
    tracks: tracks.length,
    targets: new Set(tracks.map((track) => track.target)).size,
    keys: tracks.reduce((sum, track) => sum + track.keys, 0),
    byProperty,
  };
}

// The names of the things that a clip moves, sorted, with no repeats. This is the clip's **list of needs**: it can only be played on a model that has
// something of each name. A later tutorial will use it to say whether a clip fits a skeleton.
function clipTargets(group) {
  return [...new Set(group.targetedAnimations.map((targeted) => targeted.target.name))].sort();
}

// A property as a person says it: Babylon.js names it for the code.
const PROPERTY_NAMES = {
  position: "position",
  rotationQuaternion: "rotation",
  rotation: "rotation",
  scaling: "scale",
};

function propertyName(property) {
  return Object.hasOwn(PROPERTY_NAMES, property) ? PROPERTY_NAMES[property] : property;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_FRAME_RATE, clipInfo, frameAt, secondsAt, describeTracks, summarizeTracks, clipTargets, PROPERTY_NAMES, propertyName };
} else {
  Object.assign(window, { DEFAULT_FRAME_RATE, clipInfo, frameAt, secondsAt, describeTracks, summarizeTracks, clipTargets, PROPERTY_NAMES, propertyName });
}
```

Now `tests/clips.tests.js`. It begins with `fakeClip`, a clip made of plain objects that have only what `clipInfo` and the others ask of one, so that the arithmetic can be tested on a clip you can hold in your head. The last group loads the real fire bender:

```js
// A clip made of plain objects, with the few things that the functions in clips.js ask of one.
function fakeClip(name, from, to, fps, tracks) {
  return {
    name,
    from,
    to,
    targetedAnimations: tracks.map(([target, property, keys]) => ({
      target: { name: target },
      animation: { framePerSecond: fps, targetProperty: property, getKeys: () => new Array(keys).fill({}) },
    })),
  };
}

QUnit.module("clipInfo", () => {
  QUnit.test("says how long a clip is in seconds, from its frames and its frame rate", (assert) => {
    const info = clipInfo(fakeClip("walk", 0, 90, 30, [["mixamorig:Hips", "position", 2]]));
    assert.strictEqual(info.seconds, 3);
    assert.strictEqual(info.fps, 30);
    assert.strictEqual(info.frames, 90);
  });

  QUnit.test("the same frames at twice the rate are half the time", (assert) => {
    const slow = clipInfo(fakeClip("a", 0, 60, 30, [["x", "position", 1]]));
    const fast = clipInfo(fakeClip("a", 0, 60, 60, [["x", "position", 1]]));
    assert.strictEqual(slow.seconds, 2 * fast.seconds);
  });

  QUnit.test("a clip that does not start at frame 0 counts from where it starts", (assert) => {
    assert.strictEqual(clipInfo(fakeClip("a", 10, 40, 30, [["x", "position", 1]])).seconds, 1);
  });

  QUnit.test("a clip with no tracks uses the default frame rate", (assert) => {
    assert.strictEqual(clipInfo(fakeClip("empty", 0, 60, 1, [])).fps, DEFAULT_FRAME_RATE);
  });
});

QUnit.module("frameAt and secondsAt", () => {
  const info = { from: 10, to: 70, fps: 30, frames: 60, seconds: 2 };

  QUnit.test("turn seconds into frames, counting from the first frame", (assert) => {
    assert.strictEqual(frameAt(info, 0), 10);
    assert.strictEqual(frameAt(info, 1), 40);
    assert.strictEqual(frameAt(info, 2), 70);
  });

  QUnit.test("a time outside the clip is the nearest end", (assert) => {
    assert.strictEqual(frameAt(info, -5), 10);
    assert.strictEqual(frameAt(info, 99), 70);
    assert.strictEqual(secondsAt(info, 0), 0);
    assert.strictEqual(secondsAt(info, 500), 2);
  });

  QUnit.test("go back the other way", (assert) => {
    for (const seconds of [0, 0.4, 1, 1.75, 2]) assert.ok(Math.abs(secondsAt(info, frameAt(info, seconds)) - seconds) < 1e-9, `${seconds}`);
  });
});

QUnit.module("describeTracks, summarizeTracks, clipTargets", () => {
  const clip = fakeClip("walk", 0, 60, 30, [
    ["mixamorig:Hips", "position", 5],
    ["mixamorig:Hips", "rotationQuaternion", 5],
    ["mixamorig:Spine", "rotationQuaternion", 3],
  ]);

  QUnit.test("a track says what moves, how, and how many keyframes it has", (assert) => {
    const tracks = describeTracks(clip);
    assert.strictEqual(tracks.length, 3);
    assert.deepEqual(tracks[1], { target: "mixamorig:Hips", short: "Hips", property: "rotationQuaternion", keys: 5 });
  });

  QUnit.test("the summary counts tracks, the things that move, keyframes and properties", (assert) => {
    assert.deepEqual(summarizeTracks(describeTracks(clip)), { tracks: 3, targets: 2, keys: 13, byProperty: { position: 1, rotationQuaternion: 2 } });
  });

  QUnit.test("the targets are the names of what moves, once each, sorted", (assert) => {
    assert.deepEqual(clipTargets(clip), ["mixamorig:Hips", "mixamorig:Spine"]);
  });

  QUnit.test("a property is said as a person says it, and an unknown one is left alone", (assert) => {
    assert.strictEqual(propertyName("rotationQuaternion"), "rotation");
    assert.strictEqual(propertyName("position"), "position");
    assert.strictEqual(propertyName("scaling"), "scale");
    assert.strictEqual(propertyName("opacity"), "opacity");
    assert.strictEqual(propertyName("toString"), "toString");
  });
});

QUnit.module("the real clips", (hooks) => {
  let engine, scene, fire, others;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    fire = (await loadModelFile(scene, "../assets/characters/fire.glb")).container;
    others = [(await loadModelFile(scene, "../assets/characters/air.glb")).container, (await loadModelFile(scene, "../assets/characters/heavy.glb")).container];
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("run at sixty frames a second, and the running clip is about two thirds of a second", (assert) => {
    const running = clipInfo(fire.animationGroups.find((group) => group.name === "Running"));
    assert.strictEqual(running.fps, 60);
    assert.ok(Math.abs(running.seconds - 0.633) < 0.01, `${running.seconds}`);
  });

  QUnit.test("have a position track and a rotation track for each of the 24 bones", (assert) => {
    for (const group of fire.animationGroups) {
      const summary = summarizeTracks(describeTracks(group));
      assert.strictEqual(summary.tracks, 48, group.name);
      assert.strictEqual(summary.targets, 24, group.name);
      assert.deepEqual(summary.byProperty, { position: 24, rotationQuaternion: 24 }, group.name);
    }
  });

  QUnit.test("a track has some keyframes, but not one for every frame: between two, the value is blended", (assert) => {
    const running = fire.animationGroups.find((group) => group.name === "Running");
    const { keys } = describeTracks(running)[0];
    assert.ok(keys > 2 && keys <= clipInfo(running).frames + 1, `${keys} keyframes`);
  });

  QUnit.test("need exactly the bones of the skeleton, every one of them, and nothing else", (assert) => {
    const bones = boneTree(fire.skeletons[0]).nodes.map((node) => node.name).sort();
    for (const group of fire.animationGroups) assert.deepEqual(clipTargets(group), bones, group.name);
  });

  QUnit.test("of the other characters need the same bones too: that is why they can be borrowed", (assert) => {
    const needs = clipTargets(fire.animationGroups[0]);
    for (const container of others) for (const group of container.animationGroups) assert.deepEqual(clipTargets(group), needs, group.name);
  });
});
```

Open `tests.html`: **131 passing tests**, 16 of them new.

## Step 2: How a cross-fade works (`fade.js`)

Click "Walking" and then "Punch" in a player with no fade, and the character's pose changes in a single frame: it *jumps*. A **cross-fade** is the fix. For a short time, both clips play, and each has a **weight**: the old clip's falls from 1 to 0, the new one's rises from 0 to 1, and the model's pose is a mix of the two.

Two things to get right, and both are in the tests:

- **The weights must add up to 1.** If they added up to less (0.3 and 0.3), the model would be pulled towards its rest pose in the middle of the fade, and would dip. If they added up to more, it would be pulled out of shape. `fadeWeights` makes the outgoing weight `1 - incoming`, so that it is true by the way it is made, and a test checks it at a dozen moments.
- **The fade should ease.** A straight line from 0 to 1 starts and stops suddenly, and the eye sees it. `fadeAmount` uses a curve called **smoothstep** (`3t² - 2t³`) that starts slowly, goes fastest in the middle and slows to a stop. Two tests check it: slower than a straight line at the start, faster in the middle.

This file also has a table of the controls' limits, `PLAYER_LIMITS`: how fast and slow a clip can play, and how long a fade can be. The player, the panel's sliders and the tests all read it. **Speed never reaches zero**: a clip at no speed is a still picture, and the table says so, and a test checks it.

Create `js/fade.js`:

```js
// The numbers of playing a clip: how far its controls go, and how a **cross-fade** works. A cross-fade is how one clip hands over to the next
// without a jump: for a short time both are playing, the old one's **weight** (how much it counts) falls from 1 to 0 while the new one's rises
// from 0 to 1, and the pose is a mix of the two. Weights always add up to 1, so the model is never pulled out of shape. See ../tests/fade.tests.js.

// The limits of the controls, in one table that the player, the panel and the tests all read.
const PLAYER_LIMITS = {
  speed: { min: 0.1, max: 2, step: 0.1, start: 1 }, // 1 is the speed the clip was made at, 2 is twice as fast
  fade: { min: 0, max: 1, step: 0.05, start: 0.25 }, // seconds that a cross-fade takes; 0 is a cut
};

// A number held between the ends of a limit.
function clampTo(limit, value) {
  if (!Number.isFinite(value)) return limit.start;
  return Math.min(Math.max(value, limit.min), limit.max);
}

// How far through a fade it is, from 0 (not started) to 1 (done), given how long it has been going and how long it lasts. It is not a straight line: it
// eases in and out (smoothstep, 3t² - 2t³), so the hand-over has no sudden start or stop. A fade that takes no time is done at once.
function fadeAmount(elapsed, duration) {
  if (!(duration > 0)) return 1;
  const t = Math.min(Math.max(elapsed / duration, 0), 1);
  return t * t * (3 - 2 * t);
}

// The weights of the clip that is coming in and the one that is going out, which always add up to 1.
function fadeWeights(elapsed, duration) {
  const incoming = fadeAmount(elapsed, duration);
  return { incoming, outgoing: 1 - incoming };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLAYER_LIMITS, clampTo, fadeAmount, fadeWeights };
} else {
  Object.assign(window, { PLAYER_LIMITS, clampTo, fadeAmount, fadeWeights });
}
```

Then `tests/fade.tests.js`:

```js
QUnit.module("PLAYER_LIMITS", () => {
  QUnit.test("every limit has a start that is between its ends, and a step that fits", (assert) => {
    for (const [name, limit] of Object.entries(PLAYER_LIMITS)) {
      assert.ok(limit.min <= limit.start && limit.start <= limit.max, name);
      assert.ok(limit.step > 0 && limit.step <= limit.max - limit.min, name);
    }
  });

  QUnit.test("speed never reaches nothing, because a clip at no speed is a picture", (assert) => {
    assert.ok(PLAYER_LIMITS.speed.min > 0);
  });
});

QUnit.module("clampTo", () => {
  const limit = { min: 0.5, max: 2, start: 1 };

  QUnit.test("holds a number between the ends", (assert) => {
    assert.strictEqual(clampTo(limit, 1.5), 1.5);
    assert.strictEqual(clampTo(limit, 0), 0.5);
    assert.strictEqual(clampTo(limit, 10), 2);
  });

  QUnit.test("a number that is not a number becomes the start", (assert) => {
    assert.strictEqual(clampTo(limit, NaN), 1);
    assert.strictEqual(clampTo(limit, undefined), 1);
    assert.strictEqual(clampTo(limit, Infinity), 1);
  });
});

QUnit.module("fadeAmount", () => {
  QUnit.test("is 0 at the start and 1 at the end", (assert) => {
    assert.strictEqual(fadeAmount(0, 1), 0);
    assert.strictEqual(fadeAmount(1, 1), 1);
  });

  QUnit.test("is halfway at half the time", (assert) => {
    assert.ok(Math.abs(fadeAmount(0.5, 1) - 0.5) < 1e-9);
  });

  QUnit.test("eases: it is slower than a straight line at the start, and faster in the middle", (assert) => {
    assert.ok(fadeAmount(0.1, 1) < 0.1);
    assert.ok(fadeAmount(0.9, 1) > 0.9);
  });

  QUnit.test("only ever goes up", (assert) => {
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const now = fadeAmount(t, 1);
      assert.ok(now >= last, `at ${t}`);
      last = now;
    }
  });

  QUnit.test("stays between 0 and 1 whatever the time", (assert) => {
    assert.strictEqual(fadeAmount(-3, 1), 0);
    assert.strictEqual(fadeAmount(30, 1), 1);
  });

  QUnit.test("a fade that takes no time is over at once", (assert) => {
    assert.strictEqual(fadeAmount(0, 0), 1);
    assert.strictEqual(fadeAmount(0, -1), 1);
  });
});

QUnit.module("fadeWeights", () => {
  QUnit.test("always add up to 1, so the model is never pulled out of shape", (assert) => {
    for (let t = 0; t <= 1.0001; t += 0.07) {
      const { incoming, outgoing } = fadeWeights(t, 1);
      assert.ok(Math.abs(incoming + outgoing - 1) < 1e-12, `at ${t}`);
    }
  });

  QUnit.test("begin with all the weight on the clip going out, and end with all of it on the one coming in", (assert) => {
    assert.deepEqual(fadeWeights(0, 0.5), { incoming: 0, outgoing: 1 });
    assert.deepEqual(fadeWeights(0.5, 0.5), { incoming: 1, outgoing: 0 });
  });
});
```

Open `tests.html`: **143 passing tests**, 12 of them new.

## Step 3: The player (`player.js`)

The player is the heart of this tutorial. It plays one clip at a time, with the controls of a media player and a cross-fade when it changes clips. **It has no buttons in it.** It is a class with methods (`play`, `pause`, `seek`, `step`, `stop`...) that a page, or a test, calls, so the whole thing can be tested without a screen.

A few of the choices, and why:

**The player writes down the rest pose first.** When a Babylon.js clip is stopped, the model **stays where the clip left it**: it does not go back. So `captureRestPose` records where everything that a clip moves is *before* anything is played, and `stop` puts it back. (That is why you make the player right after the model is shown, before anything plays.) A test proves that the rest pose is not the first frame of a clip.

**It does not assume that clips only move bones.** A clip can also move a **morph target**: a shape that a mesh can blend towards (a face that smiles, a cheek that puffs), with an `influence` that says how much of it there is. The cat model that you may try later has one. The player writes down each *thing and property that a track moves* (a bone's position, a bone's rotation, a morph target's influence) and puts each back in the way that suits it. An earlier version of this code asked every target for its `position` and failed on a model with a morph target: the fourth test of `captureRestPose` is there so that it cannot happen again.

**It has four states**: `stopped` (at the rest pose), `playing`, `paused`, and `ended` (a clip that does not loop, at its last frame). Everything the buttons do is a move between them, and the play button's words come from the state.

**`play` decides between a cut and a cross-fade.** If nothing is playing, or the fade time is 0, the old clip is stopped and the new one starts at full weight. If something is playing, the old clip is kept *running* (so that it does not freeze in the middle of the fade), the new one starts at weight 0, and a record of the fade is kept: how long it has gone and how long it lasts.

**`update(dt)` runs the fade.** The page calls it every frame with the time since the last frame, and it works out the two weights, sets them, and ends the fade when it is over. Because the fade is told how much time has passed (and not left to read a clock), a test can run a whole fade in four calls.

**Scrubbing pauses.** `seek` jumps to a time and pauses there, so that you can look at the pose. If the clip was stopped, it is started and paused first, because there is nothing to jump around in until it has been started.

Create `js/player.js`:

```js
// The clip player: it plays one clip of a model at a time, with the controls of a media player (play, pause, stop, step by a frame, jump to a time,
// change the speed, loop) and a cross-fade when it changes from one clip to another. It has no buttons in it: a page, or a test, tells it what to do.
// See ../tests/player.tests.js.

// The **rest pose** of a model: where everything that its clips move is, before any clip has moved it. Babylon.js does not put a model back when a
// clip is stopped (it stays where the clip left it), so the player writes the rest pose down first, and puts it back on Stop.
// It writes down each *thing and property that a track moves*, and not "every bone's position, turn and size", because a clip can move things that
// are not bones: a **morph target** (a shape, such as a face that smiles, with an `influence` that says how much of it there is) is one, and a model of
// a cat has one. Asking such a thing for its `position` would fail.
function captureRestPose(groups) {
  const moved = new Map(); // thing -> the properties of it that a track moves
  groups.forEach((group) =>
    group.targetedAnimations.forEach(({ target, animation }) => {
      if (!moved.has(target)) moved.set(target, new Set());
      moved.get(target).add(animation.targetProperty);
    })
  );
  const pose = [];
  for (const [target, properties] of moved) {
    for (const property of properties) {
      const value = target[property];
      if (value === undefined || value === null) continue;
      pose.push({ target, property, value: typeof value === "object" && value.clone ? value.clone() : value });
    }
  }
  return pose;
}

// Puts everything back as the rest pose has it: a position, a turn or a size is copied back into the one the thing has, and a plain number (such as
// an influence) is just set.
function applyRestPose(pose) {
  for (const saved of pose) {
    const now = saved.target[saved.property];
    if (now && typeof now === "object" && typeof now.copyFrom === "function") now.copyFrom(saved.value);
    else saved.target[saved.property] = saved.value;
  }
}

class ClipPlayer {
  // `groups` are the clips of a model (a container's animationGroups). Make the player before anything has been played, so that the rest pose is right.
  constructor(groups) {
    this.groups = groups;
    this.rest = captureRestPose(groups);
    this.current = null; // the clip that is chosen
    this.outgoing = null; // the clip that is fading out, if there is a cross-fade
    this.fade = null; // { elapsed, duration } while there is one
    this.state = "stopped"; // "stopped" (at the rest pose), "playing", "paused" or "ended" (a clip that does not loop, at its last frame)
    this.speed = PLAYER_LIMITS.speed.start;
    this.fadeTime = PLAYER_LIMITS.fade.start;
    this.loop = true;
    this.watchers = groups.map((group) => ({ group, observer: group.onAnimationGroupEndObservable.add(() => this.ended(group)) }));
  }

  // The clip with a name, or null.
  find(name) {
    return this.groups.find((group) => group.name === name) || null;
  }

  // The chosen clip's timing, or null when none is chosen.
  get info() {
    return this.current ? clipInfo(this.current) : null;
  }

  // Seconds into the chosen clip. A clip that is stopped is at 0, and one that has ended is at its end.
  get time() {
    if (!this.current) return 0;
    if (this.state === "stopped") return 0;
    const info = clipInfo(this.current);
    if (this.state === "ended") return info.seconds;
    const animatable = this.current.animatables[0];
    return animatable ? secondsAt(info, animatable.masterFrame) : 0;
  }

  // Starts a clip, with the player's speed and loop, at a weight (1 is the whole pose, 0 is none of it).
  begin(group, weight) {
    group.start(this.loop, this.speed, group.from, group.to, false);
    group.setWeightForAllAnimatables(weight);
  }

  // Plays a clip from its start. If another clip is playing (or paused), the new one fades in over `fadeTime` seconds while the old one fades
  // out. Answers whether there was such a clip.
  play(name) {
    const next = this.find(name);
    if (!next) return false;
    this.finishFade();
    const previous = this.current;
    const crossing = previous && previous !== next && (this.state === "playing" || this.state === "paused") && this.fadeTime > 0;
    if (crossing) {
      this.outgoing = previous;
      this.begin(next, 0);
      this.fade = { elapsed: 0, duration: this.fadeTime };
    } else {
      this.stopAll();
      this.begin(next, 1);
    }
    this.current = next;
    this.state = "playing";
    return true;
  }

  // Pauses the clip where it is.
  pause() {
    if (this.state !== "playing") return;
    this.current.pause();
    if (this.outgoing) this.outgoing.pause();
    this.state = "paused";
  }

  // Carries on from where it was paused, or plays again from the start if the clip had ended.
  resume() {
    if (!this.current) return;
    if (this.state === "ended") return void this.play(this.current.name);
    if (this.state !== "paused") return;
    this.current.play(this.loop);
    if (this.outgoing) this.outgoing.play(this.loop);
    this.state = "playing";
  }

  // The play button: pauses a clip that is playing, and plays one that is not.
  toggle() {
    if (this.state === "playing") this.pause();
    else this.resume();
  }

  // Stops, and puts the model back in its rest pose. The chosen clip stays chosen.
  stop() {
    this.finishFade();
    this.stopAll();
    applyRestPose(this.rest);
    this.state = "stopped";
  }

  // Jumps to a number of seconds into the chosen clip, and pauses there: this is scrubbing.
  seek(seconds) {
    if (!this.current) return;
    this.finishFade();
    const info = clipInfo(this.current);
    if (this.state === "stopped" || this.state === "ended") {
      this.begin(this.current, 1);
      this.current.pause();
    } else if (this.state === "playing") {
      this.current.pause();
    }
    this.current.goToFrame(frameAt(info, seconds));
    this.state = "paused";
  }

  // Moves by a number of frames (a negative number goes back) and pauses there.
  step(frames) {
    if (!this.current) return;
    const info = clipInfo(this.current);
    this.seek(this.time + frames / info.fps);
  }

  setSpeed(value) {
    this.speed = clampTo(PLAYER_LIMITS.speed, value);
    [this.current, this.outgoing].forEach((group) => {
      if (group) group.speedRatio = this.speed;
    });
  }

  setLoop(value) {
    this.loop = !!value;
    if (this.current) this.current.loopAnimation = this.loop;
  }

  setFadeTime(value) {
    this.fadeTime = clampTo(PLAYER_LIMITS.fade, value);
  }

  // Called every frame with the seconds since the last one. It runs the cross-fade, if there is one.
  update(dt) {
    if (!this.fade) return;
    this.fade.elapsed += dt;
    const weights = fadeWeights(this.fade.elapsed, this.fade.duration);
    this.current.setWeightForAllAnimatables(weights.incoming);
    this.outgoing.setWeightForAllAnimatables(weights.outgoing);
    if (this.fade.elapsed >= this.fade.duration) this.finishFade();
  }

  // Ends a cross-fade at once: the old clip stops and the new one has all the weight.
  finishFade() {
    if (!this.fade) return;
    this.outgoing.stop();
    this.current.setWeightForAllAnimatables(1);
    this.outgoing = null;
    this.fade = null;
  }

  stopAll() {
    this.groups.forEach((group) => group.stop());
  }

  // A clip that does not loop has reached its end. Only the chosen one counts.
  ended(group) {
    if (group === this.current && this.state === "playing" && !this.fade) this.state = "ended";
  }

  // Stops listening, and stops everything (the model is going).
  dispose() {
    this.watchers.forEach(({ group, observer }) => group.onAnimationGroupEndObservable.remove(observer));
    this.watchers = [];
    this.stopAll();
    this.current = null;
    this.outgoing = null;
    this.fade = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { captureRestPose, applyRestPose, ClipPlayer };
} else {
  Object.assign(window, { captureRestPose, applyRestPose, ClipPlayer });
}
```

Then `tests/player.tests.js`. They use the real fire bender and the player's real behaviour, with a `NullEngine` and a camera (the scene has to be rendered for the bones to take the pose of a clip):

```js
QUnit.module("captureRestPose and applyRestPose", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const track = (target, property) => ({ target, animation: { targetProperty: property } });

  QUnit.test("write down where things are, and put them back", (assert) => {
    const node = new BABYLON.TransformNode("bone", scene);
    node.position.set(1, 2, 3);
    node.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0.1, 0.2, 0.3);
    const rest = captureRestPose([{ targetedAnimations: [track(node, "position"), track(node, "rotationQuaternion"), track(node, "position")] }]);
    assert.strictEqual(rest.length, 2, "one for each thing that a track moves, once");
    node.position.set(9, 9, 9);
    node.rotationQuaternion = BABYLON.Quaternion.Identity();
    applyRestPose(rest);
    assert.deepEqual(node.position.asArray(), [1, 2, 3]);
    assert.ok(Math.abs(node.rotationQuaternion.x - BABYLON.Quaternion.FromEulerAngles(0.1, 0.2, 0.3).x) < 1e-9);
  });

  QUnit.test("only write down what a track moves: a bone that is only turned has no position written down", (assert) => {
    const node = new BABYLON.TransformNode("bone", scene);
    node.rotationQuaternion = BABYLON.Quaternion.Identity();
    const rest = captureRestPose([{ targetedAnimations: [track(node, "rotationQuaternion")] }]);
    assert.deepEqual(rest.map((saved) => saved.property), ["rotationQuaternion"]);
  });

  QUnit.test("a clip can move something that is not a bone, such as a morph target's influence, and that is put back too", (assert) => {
    const smile = { name: "smile", influence: 0.2 };
    const rest = captureRestPose([{ targetedAnimations: [track(smile, "influence")] }]);
    smile.influence = 1;
    applyRestPose(rest);
    assert.strictEqual(smile.influence, 0.2);
  });

  QUnit.test("something that has no value for the property to write down is left out, not a failure", (assert) => {
    assert.deepEqual(captureRestPose([{ targetedAnimations: [track({ name: "odd" }, "influence")] }]), []);
  });
});

QUnit.module("ClipPlayer", (hooks) => {
  let engine, scene, container, player;
  const hipsNode = () => scene.getTransformNodeByName("mixamorig:Hips");

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    new BABYLON.ArcRotateCamera("camera", 0, 1, 5, BABYLON.Vector3.Zero(), scene);
    ({ container } = await loadModelFile(scene, "../assets/characters/fire.glb"));
    showModel(container);
    player = new ClipPlayer(container.animationGroups);
  });
  hooks.afterEach(() => {
    player.dispose();
    scene.dispose();
    engine.dispose();
  });

  const started = () => container.animationGroups.filter((group) => group.isStarted);
  const weightOf = (name) => player.find(name).animatables[0].weight;

  QUnit.test("begins stopped, with nothing chosen, and the starting speed, fade and loop", (assert) => {
    assert.strictEqual(player.state, "stopped");
    assert.strictEqual(player.current, null);
    assert.strictEqual(player.info, null);
    assert.strictEqual(player.time, 0);
    assert.strictEqual(player.speed, PLAYER_LIMITS.speed.start);
    assert.strictEqual(player.fadeTime, PLAYER_LIMITS.fade.start);
    assert.true(player.loop);
  });

  QUnit.test("finds a clip by name, and plays nothing for a name it does not have", (assert) => {
    assert.strictEqual(player.find("Walking").name, "Walking");
    assert.strictEqual(player.find("Moonwalk"), null);
    assert.false(player.play("Moonwalk"));
    assert.strictEqual(player.state, "stopped");
  });

  QUnit.test("play starts a clip at the whole of its weight", (assert) => {
    assert.true(player.play("Walking"));
    assert.strictEqual(player.state, "playing");
    assert.strictEqual(player.current.name, "Walking");
    assert.deepEqual(started().map((group) => group.name), ["Walking"]);
    assert.strictEqual(weightOf("Walking"), 1);
  });

  QUnit.test("with a fade of nothing, the next clip is a cut: the first stops at once", (assert) => {
    player.setFadeTime(0);
    player.play("Walking");
    player.play("Running");
    assert.deepEqual(started().map((group) => group.name), ["Running"]);
    assert.strictEqual(player.fade, null);
  });

  QUnit.test("with a fade, both clips play, the old one at all of its weight and the new one at none", (assert) => {
    player.setFadeTime(0.5);
    player.play("Walking");
    player.play("Running");
    assert.deepEqual(started().map((group) => group.name).sort(), ["Running", "Walking"]);
    assert.strictEqual(weightOf("Walking"), 1);
    assert.strictEqual(weightOf("Running"), 0);
    assert.strictEqual(player.outgoing.name, "Walking");
  });

  QUnit.test("the fade hands the weight over, and the weights always add up to 1", (assert) => {
    player.setFadeTime(0.5);
    player.play("Walking");
    player.play("Running");
    for (let step = 0; step < 4; step++) {
      player.update(0.1);
      assert.ok(Math.abs(weightOf("Walking") + weightOf("Running") - 1) < 1e-9, `step ${step}`);
    }
    assert.ok(weightOf("Running") > 0 && weightOf("Running") < 1);
  });

  QUnit.test("when the fade is over the old clip has stopped and the new one has all the weight", (assert) => {
    player.setFadeTime(0.5);
    player.play("Walking");
    player.play("Running");
    player.update(0.3);
    player.update(0.3);
    assert.strictEqual(player.fade, null);
    assert.strictEqual(player.outgoing, null);
    assert.deepEqual(started().map((group) => group.name), ["Running"]);
    assert.strictEqual(weightOf("Running"), 1);
  });

  QUnit.test("a third clip in the middle of a fade finishes the first fade and begins another", (assert) => {
    player.setFadeTime(0.5);
    player.play("Walking");
    player.play("Running");
    player.update(0.1);
    player.play("Idle_11");
    assert.deepEqual(started().map((group) => group.name).sort(), ["Idle_11", "Running"]);
    assert.strictEqual(player.outgoing.name, "Running");
  });

  QUnit.test("the same clip again starts it over, with no fade", (assert) => {
    player.play("Walking");
    player.seek(0.3);
    player.play("Walking");
    assert.strictEqual(player.fade, null);
    assert.strictEqual(player.state, "playing");
    assert.ok(player.time < 0.1);
  });

  QUnit.test("pause, resume and toggle move between playing and paused", (assert) => {
    player.play("Walking");
    player.pause();
    assert.strictEqual(player.state, "paused");
    player.resume();
    assert.strictEqual(player.state, "playing");
    player.toggle();
    assert.strictEqual(player.state, "paused");
    player.toggle();
    assert.strictEqual(player.state, "playing");
  });

  QUnit.test("seek jumps to a time in the chosen clip and pauses there", (assert) => {
    player.play("Walking");
    player.seek(0.5);
    assert.strictEqual(player.state, "paused");
    assert.ok(Math.abs(player.time - 0.5) < 1e-6, `${player.time}`);
  });

  QUnit.test("seek holds the time inside the clip", (assert) => {
    player.play("Running");
    player.seek(999);
    assert.ok(Math.abs(player.time - player.info.seconds) < 1e-6);
    player.seek(-3);
    assert.ok(Math.abs(player.time) < 1e-6);
  });

  QUnit.test("seek on a clip that is stopped starts it, paused, at that time", (assert) => {
    player.play("Walking");
    player.stop();
    player.seek(0.4);
    assert.strictEqual(player.state, "paused");
    assert.ok(Math.abs(player.time - 0.4) < 1e-6);
  });

  QUnit.test("seek with no clip chosen does nothing", (assert) => {
    player.seek(1);
    assert.strictEqual(player.state, "stopped");
  });

  QUnit.test("step moves by one frame, either way, and pauses", (assert) => {
    player.play("Walking");
    player.seek(0.5);
    player.step(1);
    assert.ok(Math.abs(player.time - (0.5 + 1 / 60)) < 1e-6);
    player.step(-2);
    assert.ok(Math.abs(player.time - (0.5 - 1 / 60)) < 1e-6);
    assert.strictEqual(player.state, "paused");
  });

  QUnit.test("step cannot go back past the start", (assert) => {
    player.play("Walking");
    player.seek(0);
    player.step(-5);
    assert.ok(Math.abs(player.time) < 1e-6);
  });

  QUnit.test("a clip puts the bones out of their rest pose, and stop puts them back", (assert) => {
    const rest = hipsNode().position.clone();
    player.play("Walking");
    player.seek(0.5);
    scene.render();
    assert.ok(hipsNode().position.subtract(rest).length() > 0.01, "the clip moved the hips");
    player.stop();
    assert.strictEqual(player.state, "stopped");
    assert.strictEqual(player.time, 0);
    assert.ok(hipsNode().position.subtract(rest).length() < 1e-9, "stop put the hips back");
  });

  QUnit.test("the rest pose is not the first frame of a clip", (assert) => {
    const rest = hipsNode().position.clone();
    player.play("Walking");
    player.seek(0);
    scene.render();
    assert.ok(hipsNode().position.subtract(rest).length() > 0.001);
  });

  QUnit.test("stop leaves the clip chosen, so that the scrubber can start from it", (assert) => {
    player.play("Walking");
    player.stop();
    assert.strictEqual(player.current.name, "Walking");
  });

  QUnit.test("speed is held between its limits and goes to the clips that are playing", (assert) => {
    player.play("Walking");
    player.setSpeed(1.5);
    assert.strictEqual(player.current.speedRatio, 1.5);
    player.setSpeed(99);
    assert.strictEqual(player.speed, PLAYER_LIMITS.speed.max);
    player.setSpeed(0);
    assert.strictEqual(player.speed, PLAYER_LIMITS.speed.min);
    player.setSpeed(NaN);
    assert.strictEqual(player.speed, PLAYER_LIMITS.speed.start);
  });

  QUnit.test("a clip that is played next uses the speed that was set", (assert) => {
    player.setSpeed(2);
    player.play("Running");
    assert.strictEqual(player.current.speedRatio, 2);
  });

  QUnit.test("loop is passed to the clip, and the fade time is held between its limits", (assert) => {
    player.play("Walking");
    player.setLoop(false);
    assert.false(player.current.loopAnimation);
    player.setFadeTime(50);
    assert.strictEqual(player.fadeTime, PLAYER_LIMITS.fade.max);
  });

  QUnit.test("a clip that reaches its end is ended, at its last frame, and resume plays it again", (assert) => {
    player.setLoop(false);
    player.play("Running");
    player.ended(player.current);
    assert.strictEqual(player.state, "ended");
    assert.ok(Math.abs(player.time - player.info.seconds) < 1e-9);
    player.resume();
    assert.strictEqual(player.state, "playing");
  });

  QUnit.test("only the chosen clip ending counts", (assert) => {
    player.play("Running");
    player.ended(player.find("Walking"));
    assert.strictEqual(player.state, "playing");
  });

  QUnit.test("dispose stops everything and lets go", (assert) => {
    player.play("Walking");
    player.dispose();
    assert.strictEqual(started().length, 0);
    assert.strictEqual(player.current, null);
    assert.strictEqual(player.watchers.length, 0);
  });

  QUnit.test("update with no fade does nothing", (assert) => {
    player.play("Walking");
    player.update(1);
    assert.strictEqual(weightOf("Walking"), 1);
  });
});
```

Open `tests.html`: **173 passing tests**, 30 of them new.

## Step 4: The controls (`playerpanel.js`)

The panel makes the player something a person can use: a list of clips (a button for each, with its length), the transport buttons, a scrubber, the readout, the sliders for speed and fade, a loop box, and a section that shows what the chosen clip is made of.

Two things to notice:

**The words are small functions** (`timeReadout`, `speedLabel`, `fadeLabel`, `playLabel`), so that "what does the button say when the clip has ended?" is tested without a page.

**The scrubber has to be in step with a clip that moves by itself.** `refresh` runs every frame and moves the scrubber to where the clip is. But if you are *holding* the scrubber, it must not jump out of your hand: so while you drag, `scrubbing` is true and `refresh` leaves it alone. A test checks both. (The scrubber works in thousandths of the clip, so that it is the same at any length.)

Like the rest of the panel, it puts every name on the page with `textContent`, never as HTML, and the test renames a clip to `<img src=x onerror=alert(1)>` to check.

Create `js/playerpanel.js`:

```js
// The player's controls on the page: a list of the model's clips (click one to play it), the buttons of a media player, a scrubber, sliders for the
// speed and the fade, and a look inside the chosen clip at the tracks it is made of. Like the rest of the panel it puts text on the page with
// textContent only, because a clip's name comes from someone else's file. See ../tests/playerpanel.tests.js.

// The words on the controls, as small functions so that they can be tested without a page.
function timeReadout(info, seconds) {
  if (!info) return "No clip chosen";
  const frame = Math.round(seconds * info.fps);
  return `${seconds.toFixed(2)} / ${info.seconds.toFixed(2)} s, frame ${frame} of ${Math.round(info.frames)}`;
}

function speedLabel(value) {
  return `Speed x${value.toFixed(1)}`;
}

function fadeLabel(value) {
  return value === 0 ? "Fade: none (a cut)" : `Fade ${value.toFixed(2)} s`;
}

// What the play button says: it pauses a clip that is playing, replays one that has ended, and plays anything else.
function playLabel(state) {
  if (state === "playing") return "Pause";
  return state === "ended" ? "Replay" : "Play";
}

// The scrubber works in thousandths of the clip, so that it is the same at any length.
const SCRUBBER_STEPS = 1000;

// A slider made from a limit of PLAYER_LIMITS, and the line of words above it.
function makeSlider(limit, value, label, onInput) {
  const row = el("div", null, "slider");
  const words = el("span", label(value));
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(limit.min);
  input.max = String(limit.max);
  input.step = String(limit.step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const number = Number(input.value);
    words.textContent = label(number);
    onInput(number);
  });
  row.append(words, input);
  return { row, input, words };
}

// A button.
function makeButton(text, className, onClick) {
  const button = el("button", text, className);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

class PlayerPanel {
  constructor(container) {
    this.container = container;
    this.player = null;
    this.clipButtons = [];
    this.shown = null; // the clip whose tracks are shown
    this.scrubbing = false;
  }

  // Builds the controls for a player (a model's clips).
  show(player) {
    this.player = player;
    this.shown = null;
    this.clipButtons = [];
    if (player.groups.length === 0) {
      this.container.replaceChildren(el("p", "This model has no animation clips.", "message"));
      return;
    }

    const list = el("div", null, "clip-list");
    for (const group of player.groups) {
      const info = clipInfo(group);
      const button = makeButton(`${info.name}  ${formatSeconds(info.seconds)}`, "clip", () => {
        player.play(info.name);
        this.refresh();
      });
      button.dataset.name = info.name;
      this.clipButtons.push(button);
      list.append(button);
    }

    this.stopButton = makeButton("Stop", "transport", () => {
      player.stop();
      this.refresh();
    });
    this.backButton = makeButton("-1 frame", "transport", () => {
      player.step(-1);
      this.refresh();
    });
    this.playButton = makeButton("Play", "transport primary", () => {
      player.toggle();
      this.refresh();
    });
    this.forwardButton = makeButton("+1 frame", "transport", () => {
      player.step(1);
      this.refresh();
    });
    const transport = el("div", null, "transport-row");
    transport.append(this.stopButton, this.backButton, this.playButton, this.forwardButton);

    this.scrubber = document.createElement("input");
    this.scrubber.type = "range";
    this.scrubber.min = "0";
    this.scrubber.max = String(SCRUBBER_STEPS);
    this.scrubber.value = "0";
    this.scrubber.addEventListener("input", () => {
      this.scrubbing = true;
      if (player.info) player.seek((Number(this.scrubber.value) / SCRUBBER_STEPS) * player.info.seconds);
    });
    this.scrubber.addEventListener("change", () => {
      this.scrubbing = false;
    });
    this.readout = el("div", null, "readout");

    const speed = makeSlider(PLAYER_LIMITS.speed, player.speed, speedLabel, (value) => player.setSpeed(value));
    const fade = makeSlider(PLAYER_LIMITS.fade, player.fadeTime, fadeLabel, (value) => player.setFadeTime(value));
    const loop = el("label", null, "option");
    const loopBox = document.createElement("input");
    loopBox.type = "checkbox";
    loopBox.checked = player.loop;
    loopBox.addEventListener("change", () => player.setLoop(loopBox.checked));
    loop.append(loopBox, el("span", "Loop"));

    const controls = el("div", null, "player-controls");
    controls.append(transport, this.scrubber, this.readout, speed.row, fade.row, loop);
    this.inside = el("div", null, "inside");
    this.container.replaceChildren(makeSection("Clips", player.groups.length, list, true), makeSection("Player", null, controls, true), makeSection("Inside the clip", null, this.inside, false));
    this.refresh();
  }

  // Brings the controls up to date with the player: called every frame, so that the scrubber moves as the clip plays.
  refresh() {
    const player = this.player;
    if (!player || player.groups.length === 0) return;
    const info = player.info;
    const current = player.current ? player.current.name : null;
    for (const button of this.clipButtons) button.classList.toggle("selected", button.dataset.name === current);
    this.playButton.textContent = playLabel(player.state);
    for (const button of [this.stopButton, this.backButton, this.playButton, this.forwardButton, this.scrubber]) button.disabled = !info;
    const seconds = player.time;
    if (!this.scrubbing && info) this.scrubber.value = String(Math.round((seconds / info.seconds) * SCRUBBER_STEPS));
    this.readout.textContent = timeReadout(info, seconds);
    if (player.current !== this.shown) this.showTracks(player.current);
  }

  // Shows what the chosen clip is made of: a summary, and a table with a row for each track.
  showTracks(group) {
    this.shown = group;
    if (!group) {
      this.inside.replaceChildren(el("p", "Choose a clip.", "message"));
      return;
    }
    const tracks = describeTracks(group);
    const summary = summarizeTracks(tracks);
    const kinds = Object.entries(summary.byProperty)
      .map(([property, count]) => `${count} ${propertyName(property)}`)
      .join(", ");
    const table = makeTable(["Moves", "How", "Keyframes"], tracks.map((track) => [track.short, propertyName(track.property), track.keys]));
    const scroller = el("div", null, "track-table");
    scroller.append(table);
    this.inside.replaceChildren(
      makeFact("Tracks", `${summary.tracks} (${kinds})`),
      makeFact("Things that move", String(summary.targets)),
      makeFact("Keyframes in all", formatCount(summary.keys)),
      scroller
    );
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { timeReadout, speedLabel, fadeLabel, playLabel, SCRUBBER_STEPS, makeSlider, makeButton, PlayerPanel };
} else {
  Object.assign(window, { timeReadout, speedLabel, fadeLabel, playLabel, SCRUBBER_STEPS, makeSlider, makeButton, PlayerPanel });
}
```

Then `tests/playerpanel.tests.js`:

```js
QUnit.module("the words on the controls", () => {
  const info = { fps: 60, frames: 120, seconds: 2 };

  QUnit.test("timeReadout says the time, the length and the frame", (assert) => {
    assert.strictEqual(timeReadout(info, 0.5), "0.50 / 2.00 s, frame 30 of 120");
  });

  QUnit.test("timeReadout says so when no clip is chosen", (assert) => {
    assert.strictEqual(timeReadout(null, 0), "No clip chosen");
  });

  QUnit.test("speedLabel and fadeLabel say their number, and a fade of nothing is a cut", (assert) => {
    assert.strictEqual(speedLabel(1.5), "Speed x1.5");
    assert.strictEqual(fadeLabel(0.25), "Fade 0.25 s");
    assert.strictEqual(fadeLabel(0), "Fade: none (a cut)");
  });

  QUnit.test("the play button pauses what plays, replays what ended, and plays the rest", (assert) => {
    assert.strictEqual(playLabel("playing"), "Pause");
    assert.strictEqual(playLabel("ended"), "Replay");
    assert.strictEqual(playLabel("paused"), "Play");
    assert.strictEqual(playLabel("stopped"), "Play");
  });
});

QUnit.module("PlayerPanel", (hooks) => {
  let engine, scene, container, player, holder, panel;
  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    ({ container } = await loadModelFile(scene, "../assets/characters/fire.glb"));
    showModel(container);
    player = new ClipPlayer(container.animationGroups);
    holder = document.createElement("div");
    panel = new PlayerPanel(holder);
  });
  hooks.afterEach(() => {
    player.dispose();
    scene.dispose();
    engine.dispose();
  });

  const clipButton = (name) => [...holder.querySelectorAll("button.clip")].find((button) => button.dataset.name === name);

  QUnit.test("has a button for each clip, with its length", (assert) => {
    panel.show(player);
    assert.strictEqual(holder.querySelectorAll("button.clip").length, 12);
    assert.ok(clipButton("Running").textContent.includes("0.63 s"));
  });

  QUnit.test("a model with no clips says so", (assert) => {
    panel.show({ groups: [] });
    assert.strictEqual(holder.querySelectorAll("button").length, 0);
    assert.ok(holder.textContent.includes("no animation clips"));
  });

  QUnit.test("the controls are switched off until a clip is chosen", (assert) => {
    panel.show(player);
    assert.true(panel.playButton.disabled);
    assert.true(panel.scrubber.disabled);
    clipButton("Walking").click();
    assert.false(panel.playButton.disabled);
    assert.false(panel.scrubber.disabled);
  });

  QUnit.test("a click on a clip plays it, and marks it", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    assert.strictEqual(player.current.name, "Walking");
    assert.strictEqual(player.state, "playing");
    assert.true(clipButton("Walking").classList.contains("selected"));
    assert.strictEqual(holder.querySelectorAll("button.clip.selected").length, 1);
  });

  QUnit.test("the play button pauses and plays", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    assert.strictEqual(panel.playButton.textContent, "Pause");
    panel.playButton.click();
    assert.strictEqual(player.state, "paused");
    assert.strictEqual(panel.playButton.textContent, "Play");
  });

  QUnit.test("stop and the frame buttons work the player", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    panel.forwardButton.click();
    assert.strictEqual(player.state, "paused");
    assert.ok(Math.abs(player.time - 1 / 60) < 0.02);
    panel.stopButton.click();
    assert.strictEqual(player.state, "stopped");
  });

  QUnit.test("moving the scrubber jumps to that part of the clip", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    panel.scrubber.value = "500";
    panel.scrubber.dispatchEvent(new Event("input"));
    assert.ok(Math.abs(player.time - player.info.seconds / 2) < 0.02);
    assert.strictEqual(player.state, "paused");
  });

  QUnit.test("the scrubber follows the clip, except while it is being held", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    player.seek(player.info.seconds / 4);
    panel.refresh();
    assert.ok(Math.abs(Number(panel.scrubber.value) - 250) <= 1);
    panel.scrubbing = true;
    player.seek(player.info.seconds / 2);
    panel.refresh();
    assert.ok(Math.abs(Number(panel.scrubber.value) - 250) <= 1);
  });

  QUnit.test("the readout says where the clip is", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    player.seek(0.5);
    panel.refresh();
    assert.ok(panel.readout.textContent.startsWith("0.50 / 1.03 s"));
  });

  QUnit.test("the speed slider sets the speed, and its words follow", (assert) => {
    panel.show(player);
    const slider = holder.querySelector('.slider input[type="range"]');
    slider.value = "1.5";
    slider.dispatchEvent(new Event("input"));
    assert.strictEqual(player.speed, 1.5);
    assert.strictEqual(holder.querySelector(".slider span").textContent, "Speed x1.5");
  });

  QUnit.test("the loop box sets the loop", (assert) => {
    panel.show(player);
    const box = holder.querySelector('label.option input[type="checkbox"]');
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    assert.false(player.loop);
  });

  QUnit.test("inside the clip, it says what the chosen clip is made of", (assert) => {
    panel.show(player);
    clipButton("Walking").click();
    const text = holder.querySelector(".inside").textContent;
    assert.ok(text.includes("48 (24 rotation, 24 position)"));
    assert.ok(text.includes("1,536"));
    assert.strictEqual(holder.querySelectorAll(".inside table tr").length, 49);
  });

  QUnit.test("a clip's name is shown as text and never as HTML", (assert) => {
    player.groups[0].name = "<img src=x onerror=alert(1)>";
    panel.show(player);
    clipButton("<img src=x onerror=alert(1)>").click();
    assert.strictEqual(holder.querySelector("img"), null);
    assert.ok(holder.textContent.includes("<img src=x"));
  });
});
```

Open `tests.html`: **190 passing tests**, 17 of them new. That is all of them.

## Step 5: The page

Everything is ready, and `index.html` already has a place for the player (a `div` with the id `player`, above the bones) and lists the new scripts. Two things are left: the styles, and four small changes to `js/main.js`.

Create `css/player.css`:

```css
/* The player: a list of clips, the buttons of a media player, a scrubber and two sliders, and the table of tracks. */
#player {
  display: grid;
  gap: 8px;
}
.clip-list {
  display: grid;
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
}
button.clip {
  padding: 4px 8px;
  text-align: left;
  background: transparent;
  color: var(--ink);
  border: 0;
  border-left: 4px solid var(--panel-edge);
  border-radius: 3px;
  font: 13px / 1.3 var(--font);
  cursor: pointer;
}
button.clip:hover {
  background: var(--bg);
}
button.clip.selected {
  background: var(--bg);
  border-left-color: #ffd35a;
  color: #ffd35a;
  font-weight: 700;
}
.player-controls {
  display: grid;
  gap: 8px;
}
.transport-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
button.transport {
  padding: 7px 4px;
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--panel-edge);
  border-radius: 6px;
  font: 13px / 1 var(--font);
  cursor: pointer;
}
button.transport.primary {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}
button.transport:hover:not(:disabled) {
  border-color: var(--accent);
}
button.transport:disabled {
  opacity: 0.4;
  cursor: default;
}
.player-controls input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}
.readout {
  font: 12px / 1.3 var(--mono);
  color: var(--ink-dim);
}
.slider {
  display: grid;
  gap: 2px;
  color: var(--ink-dim);
}
.track-table {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 6px;
}
```

Now `js/main.js`. The line numbers are for the file as you have it now; each change adds lines, so each of the later ones is a few lines further down by the time you get to it (look for the code, which is quoted).

**1. Make the panel.** Find the line that makes `bonePanel` (line 22). Add a line after it:

```js
const playerPanel = new PlayerPanel(document.getElementById("player"));
```

**2. Keep the player.** Find `let current = null;` (line 26, now 27) and add a line after it:

```js
let player = null;
```

**3. Make a player for each model.** In `openModel`, find the two lines that take the old model away and show the new one (lines 39 and 40, now 41 and 42):

```js
    if (current) removeModel(current);
    current = showModel(container);
```

The old player is stopped *before* its model is thrown away, and the new one is made *after* the new model is shown, and before anything has been played. Make them:

```js
    if (player) player.dispose();
    if (current) removeModel(current);
    current = showModel(container);
    player = new ClipPlayer(container.animationGroups);
    playerPanel.show(player);
```

**4. Run it every frame.** Near the end, find the two lines that follow the skeleton's picture (lines 107 and 108, now 112 and 113):

```js
// Each frame, the skeleton's picture follows the bones.
scene.onBeforeRenderObservable.add(() => skeletonView.update(viewer.state.bones));
```

Replace them with:

```js
// Each frame, the player runs any cross-fade and the controls catch up with it, and the skeleton's picture follows the bones.
scene.onBeforeRenderObservable.add(() => {
  if (player) player.update(engine.getDeltaTime() / 1000);
  playerPanel.refresh();
  skeletonView.update(viewer.state.bones);
});
```

Open `index.html` through the web server. The fire bender stands in its rest pose, and there is a list of twelve clips. Try these:

1. **Click "Running".** The model runs on the spot, and the blue skeleton runs with it. Watch the readout: the time and the frame count go round and round (it loops).
2. **Pause, and step.** Press *Pause*, then *+1 frame* a few times. This is how you see what a clip does between its keyframes. Then drag the scrubber to any part of it.
3. **Press Stop.** The model goes back to its rest pose: arms a little out, standing. This is not the first frame of any clip.
4. **Change the speed.** Run it at 0.2 and look at the legs; run it at 2.
5. **Cross-fade.** Play "Walking", and while it plays click "Flying_Fist_Kick". The model flows into the kick. Now set the *Fade* slider to nothing and do it again: it jumps. Set it to a full second and watch the middle of the fade: a pose that is neither clip.
6. **Open "Inside the clip".** Every clip has 48 tracks: a position and a rotation for each of the 24 bones. Open another character and look again: the same.
7. **Turn Loop off** and play "Running": it stops on its last frame and the button says *Replay*.
8. **Open the heavy enemy** and play "Dead". It has only four clips, but the same bones as the others.

## Troubleshooting

| Problem | Likely cause |
|---------|--------------|
| `Stop` leaves the model in a strange pose | The rest pose was recorded after something had played. Make the `ClipPlayer` right after `showModel`, before any `play` |
| A test says `No camera defined` | A test that renders the scene needs a camera in it, as the player tests have in `beforeEach` |
| The fade never finishes | `player.update` is not called each frame, or `main.js` passes it the time in milliseconds (it wants seconds) |
| The model dips towards its rest pose in the middle of a fade | The two weights do not add up to 1: check `fadeWeights` |
| The scrubber jumps back while you drag it | `refresh` should leave the scrubber alone while `scrubbing` is true |
| The clip list is empty | `ClipPlayer` was given the wrong thing: it wants `container.animationGroups` |
| Everything plays at the wrong speed | A clip's length is `frames / fps`, and the fps is read from its tracks: check `clipInfo` |

## What you've built

A clip player: play, pause, stop, step, scrub, speed, loop, and cross-fades that hand the weight from one clip to the next. And a look inside a clip that shows what it is made of, with a test that says every clip needs exactly the bones of the skeleton. Everything it knows is plain data, and the player has no buttons in it, so all of it was tested.

## Next

**The sequencer**: a cross-fade changes from one clip to another when *you* click. A sequence plays several clips one after another by itself (walk, then punch, then idle), and the next tutorial builds one, explaining the difference between a cross-fade, a chain, and playing two clips at once on different parts of the body.
