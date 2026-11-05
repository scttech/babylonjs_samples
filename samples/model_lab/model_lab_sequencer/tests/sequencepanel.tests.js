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
