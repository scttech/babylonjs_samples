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
