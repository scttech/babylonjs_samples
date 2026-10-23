// The screens need a page with certain elements in it. These tests give them a stand-in
// page: elements that remember what is done to them, and a `document` that makes them.
QUnit.module("Screens", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
      this.attributes = {};
      this.style = {};
      this.textContent = "";
      this.value = "";
      this.blurred = 0;
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
      };
    }

    appendChild(child) {
      this.children.push(child);
    }
    replaceChildren() {
      this.children = [];
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    click() {
      this.listeners.click();
    }
    blur() {
      this.blurred++;
    }
    get hidden() {
      return this.classes.has("hidden");
    }
  }

  const IDS = [
    "title", "pause", "over", "name", "swatches", "title-best", "over-score", "over-best",
    "high-score", "board", "play", "resume", "again", "pause-title", "over-title",
  ];

  // A page with every element the screens look for.
  const makePage = () => {
    const elements = Object.fromEntries(IDS.map((id) => [id, new FakeElement()]));
    return { elements, getElementById: (id) => elements[id], createElement: () => new FakeElement() };
  };

  const makeScreens = () => {
    const page = makePage();
    return { page, screens: new Screens(page), els: page.elements };
  };

  const entries = [
    { name: "Ana", score: 900 },
    { name: "Ben", score: 500 },
    { name: "Cy", score: 100 },
  ];

  QUnit.test("show() shows the screen for the state and hides the others", (assert) => {
    const { screens, els } = makeScreens();

    screens.show(STATES.paused);

    assert.true(els.title.hidden);
    assert.false(els.pause.hidden);
    assert.true(els.over.hidden);
  });

  QUnit.test("each state shows its own screen", (assert) => {
    const { screens, els } = makeScreens();

    screens.show(STATES.title);
    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [false, true, true]);

    screens.show(STATES.over);
    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [true, true, false]);
  });

  QUnit.test("while playing there is no screen: show() hides them all", (assert) => {
    const { screens, els } = makeScreens();
    screens.show(STATES.title);

    screens.show(STATES.playing);

    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [true, true, true]);
  });

  QUnit.test("the name field is read and set", (assert) => {
    const { screens, els } = makeScreens();

    screens.setName("Ana");

    assert.strictEqual(els.name.value, "Ana");
    els.name.value = "Ben";
    assert.strictEqual(screens.name, "Ben");
  });

  QUnit.test("setBest() shows the best entry on the title screen, or nothing", (assert) => {
    const { screens, els } = makeScreens();

    screens.setBest({ name: "Ana", score: 900 });
    assert.strictEqual(els["title-best"].textContent, "Best: 900 by Ana");

    screens.setBest(null);
    assert.strictEqual(els["title-best"].textContent, "");
  });

  QUnit.test("renderSwatches() makes a button for each color, painted with its colors", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});

    assert.strictEqual(els.swatches.children.length, RUNNER_COLORS.length);
    const ocean = els.swatches.children[1];
    assert.strictEqual(ocean.title, "Ocean");
    assert.strictEqual(ocean.attributes["aria-label"], "Ocean");
    assert.true(ocean.style.background.includes(colorById("ocean").body));
    assert.true(ocean.style.background.includes(colorById("ocean").joints));
  });

  QUnit.test("the chosen color is marked", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "neon", () => {});

    const marked = els.swatches.children.map((b) => b.classes.has("selected"));
    assert.deepEqual(marked, RUNNER_COLORS.map((c) => c.id === "neon"));
  });

  QUnit.test("clicking a swatch tells the game which color, and moves the mark", (assert) => {
    const { screens, els } = makeScreens();
    const picked = [];
    screens.renderSwatches(RUNNER_COLORS, "sunset", (id) => picked.push(id));

    els.swatches.children[1].click();

    assert.deepEqual(picked, ["ocean"]);
    const marked = els.swatches.children.map((b) => b.classes.has("selected"));
    assert.deepEqual(marked, RUNNER_COLORS.map((c) => c.id === "ocean"));
  });

  QUnit.test("rendering again replaces the swatches instead of adding to them", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});
    screens.renderSwatches(RUNNER_COLORS, "ghost", () => {});

    assert.strictEqual(els.swatches.children.length, RUNNER_COLORS.length);
  });

  QUnit.test("renderBoard() makes a row for each entry, with the place, the name and the score", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries);

    assert.strictEqual(els.board.children.length, 3);
    const [name, points] = els.board.children[1].children;
    assert.strictEqual(name.textContent, "2. Ben");
    assert.strictEqual(points.textContent, "500");
  });

  QUnit.test("renderBoard() marks the player's own row", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries, 2);

    assert.deepEqual(els.board.children.map((row) => row.classes.has("you")), [false, true, false]);
  });

  QUnit.test("renderBoard() with no rank marks no row", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries);

    assert.true(els.board.children.every((row) => !row.classes.has("you")));
  });

  QUnit.test("an empty leaderboard says so", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard([]);

    assert.strictEqual(els.board.children.length, 1);
    assert.strictEqual(els.board.children[0].textContent, "No scores yet");
  });

  QUnit.test("a name is shown as text, never as markup", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard([{ name: "<img src=x onerror=alert(1)>", score: 5 }]);

    const [name] = els.board.children[0].children;
    assert.strictEqual(name.textContent, "1. <img src=x onerror=alert(1)>");
    assert.strictEqual(name.innerHTML, undefined, "innerHTML is never used");
  });

  QUnit.test("showResult() fills in the game over screen and shows it", (assert) => {
    const { screens, els } = makeScreens();

    screens.showResult({ score: 500, best: 900, newBest: false, rank: 2, entries });

    assert.strictEqual(els["over-score"].textContent, "Score 500");
    assert.strictEqual(els["over-best"].textContent, "Best 900");
    assert.true(els["high-score"].hidden, "no picture without a new best");
    assert.false(els.over.hidden);
    assert.true(els.title.hidden);
    assert.strictEqual(els.board.children.length, 3);
  });

  QUnit.test("a new best shows the High Score picture", (assert) => {
    const { screens, els } = makeScreens();

    screens.showResult({ score: 950, best: 950, newBest: true, rank: 1, entries });

    assert.strictEqual(els["over-best"].textContent, "New best!");
    assert.false(els["high-score"].hidden);
  });

  QUnit.test("the picture goes away again for the next, lower, score", (assert) => {
    const { screens, els } = makeScreens();
    screens.showResult({ score: 950, best: 950, newBest: true, rank: 1, entries });

    screens.showResult({ score: 100, best: 950, newBest: false, rank: 0, entries });

    assert.true(els["high-score"].hidden);
  });

  QUnit.test("bind() makes each button do its job", (assert) => {
    const { screens, els } = makeScreens();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title"]);
  });

  QUnit.test("a clicked button lets go of the keyboard, so the space bar doesn't press it again", (assert) => {
    const { screens, els } = makeScreens();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {} });

    els.play.click();

    assert.strictEqual(els.play.blurred, 1);
  });

  QUnit.test("a clicked swatch lets go of the keyboard too", (assert) => {
    const { screens, els } = makeScreens();
    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});
    const swatch = els.swatches.children[2];

    swatch.click();

    assert.strictEqual(swatch.blurred, 1);
  });
});
