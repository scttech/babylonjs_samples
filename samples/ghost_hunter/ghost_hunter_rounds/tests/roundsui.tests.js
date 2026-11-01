QUnit.module("the words of the rounds", () => {
  QUnit.test("a time is minutes and seconds", (assert) => {
    assert.strictEqual(formatClock(0), "0:00");
    assert.strictEqual(formatClock(125.9), "2:05");
    assert.strictEqual(formatClock(-3), "0:00");
  });

  QUnit.test("a round that was won says how it went, and a new best says so", (assert) => {
    const result = { number: 2, outcome: "won", captured: 2, ghosts: 2, health: 71, sanity: 40, time: 98, score: 555 };
    const text = endText(result, true);
    assert.strictEqual(text.title, "Round 2 clear");
    assert.true(text.lines[0].includes("2 of 2") && text.lines[0].includes("1:38"));
    assert.true(text.lines[1].includes("555") && text.lines[1].includes("new best"));
    assert.false(endText(result, false).lines[1].includes("new best"));
  });

  QUnit.test("a round lost to health and one lost to sanity say different things", (assert) => {
    const base = { number: 1, outcome: "lost", captured: 0, ghosts: 1, health: 0, sanity: 30, time: 50, score: 0 };
    const hurt = endText({ ...base, reason: "health" });
    const mad = endText({ ...base, reason: "sanity" });
    assert.notStrictEqual(hurt.title, mad.title);
    assert.true(mad.lines[0].includes("dark"));
  });

  QUnit.test("the journal's pages are lines, and an empty journal says so", (assert) => {
    const journal = new Journal(journalStore());
    assert.deepEqual(journalLines(journal), ["Nothing in the journal yet."]);
    journal.noteMet("ghoul_girl");
    journal.noteDealt("ghoul_girl");
    assert.deepEqual(journalLines(journal), ["Ghoul girl: met 1, dealt with 1"]);
  });
});

QUnit.module("RoundsUi", () => {
  const make = (handlers = {}) => {
    const ui = new RoundsUi(document, handlers);
    return { ui, gone: () => { ui.root.remove(); ui.screen.remove(); ui.insane.remove(); document.body.classList.remove("unwell"); document.documentElement.style.removeProperty("--insane"); } };
  };

  QUnit.test("the bars show health and sanity as parts of the most, with the round and its ghosts", (assert) => {
    const { ui, gone } = make();
    const round = new Round(3);
    round.start();
    round.health = 40;
    round.sanity = 80;
    ui.apply(round);
    assert.strictEqual(ui.healthFill.style.width, "40%");
    assert.strictEqual(ui.sanityFill.style.width, "80%");
    assert.true(ui.label.textContent.includes("Round 3") && ui.label.textContent.includes("0 of 2"));
    assert.false(ui.healthBar.classList.contains("low"));
    round.health = 20;
    ui.apply(round);
    assert.true(ui.healthBar.classList.contains("low"));
    gone();
  });

  QUnit.test("the picture goes wrong only when sanity is low", (assert) => {
    const { ui, gone } = make();
    const round = new Round(1);
    round.start();
    ui.apply(round);
    assert.false(document.body.classList.contains("unwell"));
    assert.strictEqual(Number(ui.insane.style.opacity), 0);
    round.sanity = 5;
    ui.apply(round);
    assert.true(document.body.classList.contains("unwell"));
    assert.true(Number(ui.insane.style.opacity) > 0.5);
    gone();
  });

  QUnit.test("the end screen has the words, the journal and the scores, and the buttons say what was pressed", (assert) => {
    const pressed = [];
    const { ui, gone } = make({ onNext: () => pressed.push("next"), onAgain: () => pressed.push("again"), onQuit: () => pressed.push("quit") });
    const journal = new Journal(journalStore());
    journal.noteRound({ number: 1, outcome: "won", score: 300 });
    ui.showEnd({ number: 1, outcome: "won", captured: 1, ghosts: 1, health: 90, sanity: 70, time: 80, score: 300 }, journal, true);
    assert.false(ui.screen.classList.contains("hidden"));
    assert.true(ui.screen.classList.contains("won"));
    assert.strictEqual(ui.title.textContent, "Round 1 clear");
    assert.true(ui.scores.textContent.includes("1. 300"));
    assert.false(ui.next.classList.contains("hidden"));
    ui.next.click();
    ui.again.click();
    ui.quit.click();
    assert.deepEqual(pressed, ["next", "again", "quit"]);
    ui.showEnd({ number: 1, outcome: "lost", reason: "health", captured: 0, ghosts: 1, health: 0, sanity: 50, time: 20, score: 0 }, journal);
    assert.true(ui.next.classList.contains("hidden"), "there is no next round after a loss");
    assert.false(ui.screen.classList.contains("won"));
    ui.hideEnd();
    assert.true(ui.screen.classList.contains("hidden"));
    gone();
  });
});
