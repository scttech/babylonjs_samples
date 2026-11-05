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
