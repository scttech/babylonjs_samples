// The screens need a page with certain elements in it. These tests give them a stand-in
// page: elements that remember what is done to them, and a `document` that makes them.
QUnit.module("Screens", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
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
    "title", "pause", "over", "name", "title-best", "over-heading", "over-score", "over-best", "board",
    "play", "resume", "again", "pause-title", "over-title", "sound", "pause-button",
  ];

  // A page with every element the screens look for, and the screens made from it.
  const make = () => {
    const els = {};
    for (const id of IDS) els[id] = new FakeElement();
    const doc = {
      getElementById: (id) => els[id],
      createElement: () => new FakeElement(),
    };
    return { screens: new Screens(doc), els };
  };

  const ENTRIES = [
    { name: "Ana", score: 12500 },
    { name: "Bo", score: 4300 },
    { name: "Cy", score: 900 },
  ];

  QUnit.test("show() shows the screen for a state, and hides the others", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.paused);

    assert.true(els.title.hidden);
    assert.false(els.pause.hidden);
    assert.true(els.over.hidden);
  });

  QUnit.test("playing has no screen, so showing it hides them all", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.playing);

    assert.true(els.title.hidden && els.pause.hidden && els.over.hidden);
  });

  QUnit.test("the title is the one to show first", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.title);

    assert.false(els.title.hidden);
  });

  QUnit.test("the name is read from the text field, and can be put there", (assert) => {
    const { screens, els } = make();

    screens.setName("Ana");

    assert.strictEqual(els.name.value, "Ana");
    els.name.value = "Bo";
    assert.strictEqual(screens.name, "Bo");
  });

  QUnit.test("focusing the name field selects what is in it, so typing replaces it", (assert) => {
    const { els } = make();
    let selected = 0;
    els.name.select = () => selected++;

    els.name.listeners.focus();

    assert.strictEqual(selected, 1);
  });

  QUnit.test("setBest() shows the top score and who made it, or nothing if there isn't one", (assert) => {
    const { screens, els } = make();

    screens.setBest(ENTRIES[0]);
    assert.strictEqual(els["title-best"].textContent, "Best: 12,500 by Ana");

    screens.setBest(null);
    assert.strictEqual(els["title-best"].textContent, "");
  });

  QUnit.test("renderBoard() makes a row for each entry, with the place and the name, and the score with its commas", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);

    assert.strictEqual(els.board.children.length, 3);
    const [name, points] = els.board.children[1].children;
    assert.strictEqual(name.textContent, "2. Bo");
    assert.strictEqual(points.textContent, "4,300");
  });

  QUnit.test("the player's own row is marked", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES, 2);

    assert.deepEqual(els.board.children.map((row) => row.classes.has("you")), [false, true, false]);
  });

  QUnit.test("with no rank, nothing is marked", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);

    assert.true(els.board.children.every((row) => !row.classes.has("you")));
  });

  QUnit.test("an empty board says there are no scores, in one row", (assert) => {
    const { screens, els } = make();

    screens.renderBoard([]);

    assert.strictEqual(els.board.children.length, 1);
    assert.strictEqual(els.board.children[0].textContent, "No scores yet");
  });

  QUnit.test("rendering again replaces the rows instead of adding to them", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);
    screens.renderBoard(ENTRIES.slice(0, 1));

    assert.strictEqual(els.board.children.length, 1);
  });

  QUnit.test("a name is shown as text, so markup in it does nothing", (assert) => {
    const { screens, els } = make();

    screens.renderBoard([{ name: "<img src=x onerror=boom()>", score: 5 }]);

    assert.strictEqual(els.board.children[0].children[0].textContent, "1. <img src=x onerror=boom()>");
  });

  QUnit.test("showResult() fills in the heading and the score, and shows the result screen", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "You win!", score: 3100, best: 12500, newBest: false, rank: 0, entries: ENTRIES });

    assert.strictEqual(els["over-heading"].textContent, "You win!");
    assert.strictEqual(els["over-score"].textContent, "Score 3,100");
    assert.strictEqual(els["over-best"].textContent, "Best 12,500");
    assert.false(els.over.hidden);
    assert.true(els.title.hidden);
  });

  QUnit.test("a new best says so, and is marked so the page can make it stand out", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "Time's up", score: 13000, best: 13000, newBest: true, rank: 1, entries: ENTRIES });

    assert.strictEqual(els["over-best"].textContent, "New best!");
    assert.true(els["over-best"].classes.has("new"));
  });

  QUnit.test("and an ordinary score takes the mark away again", (assert) => {
    const { screens, els } = make();
    screens.showResult({ heading: "Time's up", score: 13000, best: 13000, newBest: true, rank: 1, entries: ENTRIES });

    screens.showResult({ heading: "Time's up", score: 500, best: 13000, newBest: false, rank: 0, entries: ENTRIES });

    assert.false(els["over-best"].classes.has("new"));
  });

  QUnit.test("showResult() marks the player's row on the board", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "x", score: 4300, best: 12500, newBest: false, rank: 2, entries: ENTRIES });

    assert.true(els.board.children[1].classes.has("you"));
  });

  QUnit.test("the pause button is shown while a game is played, and hidden the rest of the time", (assert) => {
    const { screens, els } = make();

    screens.setPlaying(true);
    assert.false(els["pause-button"].hidden);

    screens.setPlaying(false);
    assert.true(els["pause-button"].hidden);
  });

  QUnit.test("setSound() says on the button whether the sound is on", (assert) => {
    const { screens, els } = make();

    screens.setSound(false);
    assert.strictEqual(els.sound.textContent, "Sound: off");
    assert.true(els.sound.classes.has("off"));

    screens.setSound(true);
    assert.strictEqual(els.sound.textContent, "Sound: on");
    assert.false(els.sound.classes.has("off"));
  });

  QUnit.test("setLeave() says on the pause and result buttons where they go", (assert) => {
    const { screens, els } = make();

    screens.setLeave("My levels");
    assert.strictEqual(els["pause-title"].textContent, "My levels");
    assert.strictEqual(els["over-title"].textContent, "My levels");

    screens.setLeave("Title");
    assert.strictEqual(els["pause-title"].textContent, "Title");
    assert.strictEqual(els["over-title"].textContent, "Title");
  });

  QUnit.test("bind() makes each button do its own thing", (assert) => {
    const { screens, els } = make();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
      sound: () => calls.push("sound"),
      pause: () => calls.push("pause"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound", "pause-button"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title", "sound", "pause"]);
  });

  QUnit.test("every button lets go of the keyboard when it is clicked, so the space bar doesn't press it again", (assert) => {
    const { screens, els } = make();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {}, sound() {}, pause() {} });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound", "pause-button"]) {
      els[id].click();
      assert.strictEqual(els[id].blurred, 1, id);
    }
  });
});
