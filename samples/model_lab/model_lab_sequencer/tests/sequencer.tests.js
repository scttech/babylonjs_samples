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
