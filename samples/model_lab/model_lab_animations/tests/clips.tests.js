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
