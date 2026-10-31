QUnit.module("ScreenFlow", () => {
  QUnit.test("it begins loading, and the title comes when the district is ready", (assert) => {
    const flow = new ScreenFlow();
    assert.strictEqual(flow.state, "loading");
    assert.false(flow.running);
    assert.true(flow.loaded());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("the game cannot be played or paused before the title, nor paused from the title", (assert) => {
    const flow = new ScreenFlow();
    assert.false(flow.play());
    assert.false(flow.pause());
    flow.loaded();
    assert.false(flow.pause());
    assert.false(flow.resume());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("play, pause, resume, and back to the title", (assert) => {
    const flow = new ScreenFlow();
    flow.loaded();
    assert.true(flow.play());
    assert.true(flow.running);
    assert.true(flow.pause());
    assert.false(flow.running, "the world stops while paused");
    assert.true(flow.resume());
    assert.true(flow.running);
    flow.pause();
    assert.true(flow.quit());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("a screen that is already up is not put up again", (assert) => {
    const flow = new ScreenFlow();
    flow.loaded();
    flow.play();
    flow.pause();
    assert.false(flow.pause(), "paused twice is paused once");
    assert.false(flow.go("loading"));
  });

  QUnit.test("listeners are told of each change, with where it came from", (assert) => {
    const flow = new ScreenFlow();
    const told = [];
    flow.onChange((now, before) => told.push(`${before}>${now}`));
    flow.loaded();
    flow.play();
    flow.pause();
    flow.pause();
    assert.deepEqual(told, ["loading>title", "title>playing", "playing>paused"]);
  });
});

QUnit.module("bestLines", () => {
  const records = (extra = {}) => ({ runs: 0, trialBest: null, scoreBest: 0, chainBest: 0, tokensBest: 0, ...extra });

  QUnit.test("a new player is told there are no times yet", (assert) => {
    const lines = bestLines(records());
    assert.strictEqual(lines.length, 1);
    assert.true(lines[0].includes("No times yet"));
  });

  QUnit.test("a player who has run has the best of everything", (assert) => {
    const lines = bestLines(records({ runs: 3, trialBest: 41.26, scoreBest: 480, chainBest: 12, tokensBest: 9 }));
    assert.deepEqual(lines, ["Trial: 0:41.2", "Best score: 480", "Longest chain: 12", "Most tokens: 9"]);
  });

  QUnit.test("a player who has not yet run the trial is told so", (assert) => {
    assert.strictEqual(bestLines(records({ runs: 1, scoreBest: 5 }))[0], "Trial: not yet run");
  });
});

QUnit.module("Screens", () => {
  const records = { runner: "female", volume: 0.4, lookSpeed: 0.002, runs: 2, trialBest: 40, scoreBest: 100, chainBest: 6, tokensBest: 3 };
  const make = (handlers = {}) => new Screens(document, handlers);
  const gone = (screens) => {
    screens.title.remove();
    screens.pause.remove();
  };

  QUnit.test("both screens are made hidden", (assert) => {
    const screens = make();
    assert.true(screens.title.classList.contains("hidden"));
    assert.true(screens.pause.classList.contains("hidden"));
    gone(screens);
  });

  QUnit.test("the title shows the chosen runner and the bests, and the pause is away", (assert) => {
    const screens = make();
    screens.showTitle(records);
    assert.false(screens.title.classList.contains("hidden"));
    assert.true(screens.pause.classList.contains("hidden"));
    assert.true(screens.runnerButtons.female.classList.contains("chosen"));
    assert.false(screens.runnerButtons.male.classList.contains("chosen"));
    assert.strictEqual(screens.runnerButtons.female.getAttribute("aria-pressed"), "true");
    assert.strictEqual(screens.bests.children.length, 4);
    gone(screens);
  });

  QUnit.test("choosing a runner marks it and says which; Play says which runner to play", (assert) => {
    const chosen = [];
    const played = [];
    const screens = make({ onRunner: (name) => chosen.push(name), onPlay: (name) => played.push(name) });
    screens.showTitle({ ...records, runner: "male" });
    screens.runnerButtons.female.click();
    assert.deepEqual(chosen, ["female"]);
    assert.true(screens.runnerButtons.female.classList.contains("chosen"));
    screens.playButton.click();
    assert.deepEqual(played, ["female"]);
    gone(screens);
  });

  QUnit.test("the pause screen shows the settings, and the buttons say what was pressed", (assert) => {
    const told = [];
    const screens = make({ onResume: () => told.push("resume"), onRestart: () => told.push("restart"), onQuit: () => told.push("quit"), onVolume: (v) => told.push(`volume ${v}`), onLookSpeed: (v) => told.push(`look ${v}`) });
    screens.showPause(records);
    assert.false(screens.pause.classList.contains("hidden"));
    assert.strictEqual(screens.volume.value, "0.4");
    screens.resumeButton.click();
    screens.restartButton.click();
    screens.quitButton.click();
    screens.volume.value = "0.9";
    screens.volume.dispatchEvent(new Event("input"));
    screens.lookSpeed.value = "0.005";
    screens.lookSpeed.dispatchEvent(new Event("input"));
    assert.deepEqual(told, ["resume", "restart", "quit", "volume 0.9", "look 0.005"]);
    gone(screens);
  });

  QUnit.test("the title says which city it is", (assert) => {
    const screens = make();
    screens.setCity("City 12: 3 by 2 blocks, 11 buildings, 5 jumps");
    assert.strictEqual(screens.cityLine.textContent, "City 12: 3 by 2 blocks, 11 buildings, 5 jumps");
    gone(screens);
  });

  QUnit.test("hide puts both away, and the status can stop Play from being pressed while something loads", (assert) => {
    const screens = make();
    screens.showTitle(records);
    screens.setStatus("Loading the runner...", true);
    assert.true(screens.playButton.disabled);
    assert.strictEqual(screens.status.textContent, "Loading the runner...");
    screens.setStatus("");
    assert.false(screens.playButton.disabled);
    screens.hide();
    assert.true(screens.title.classList.contains("hidden"));
    gone(screens);
  });
});
