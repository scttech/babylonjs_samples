QUnit.module("gameUrl", () => {
  QUnit.test("says which map, and keeps the rest of the address", (assert) => {
    assert.strictEqual(gameUrl("http://localhost:3000/samples/x/index.html", 1), "http://localhost:3000/samples/x/index.html?map=1");
  });

  QUnit.test("asks to begin at once, if it is told to", (assert) => {
    const url = new URL(gameUrl("http://localhost/a/index.html", 0, true));

    assert.strictEqual(url.searchParams.get("map"), "0");
    assert.strictEqual(url.searchParams.get("go"), "1");
  });

  QUnit.test("a map that is not the one that was there replaces it, and a go that was there goes if it isn't asked for", (assert) => {
    const url = new URL(gameUrl("http://localhost/a/index.html?map=1&go=1&dev=1", 0));

    assert.strictEqual(url.searchParams.get("map"), "0");
    assert.false(url.searchParams.has("go"));
    assert.strictEqual(url.searchParams.get("dev"), "1", "and what else was asked for stays");
  });
});

QUnit.module("starText", () => {
  QUnit.test("is the stars that are earned and the ones that are not, three in all", (assert) => {
    assert.strictEqual(starText(0), "☆☆☆");
    assert.strictEqual(starText(2), "★★☆");
    assert.strictEqual(starText(3), "★★★");
  });
});

QUnit.module("Screens", (hooks) => {
  let parts, screens, records, heard;
  const maps = [
    { name: "First", rows: ["S##G"] },
    { name: "Second", rows: ["S.#G", "..#."] },
  ];
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag, hidden = false) => {
      const node = fixture.appendChild(document.createElement(tag));
      node.hidden = hidden;
      return node;
    };
    parts = { title: make("div"), pause: make("div", true), result: make("div", true), pauseButton: make("button", true), speedButton: make("button", true) };
    const storage = { data: {}, getItem(key) { return this.data[key] ?? null; }, setItem(key, value) { this.data[key] = value; } };
    records = new Records(storage);
    screens = new Screens(parts, document, maps, records, "logo.webp");
    heard = [];
    for (const name of ["play", "resume", "restart", "menu", "pause", "speed", "detail", "mute", "make", "edit", "delete"]) screens.on(name, (...args) => heard.push([name, ...args]));
  });

  const buttons = (part, text) => [...part.querySelectorAll("button")].find((button) => button.textContent === text);

  QUnit.test("the title has the logo, a card for each map with its picture and name, and a play button", (assert) => {
    assert.strictEqual(parts.title.querySelector("img").getAttribute("src"), "logo.webp");
    const cards = parts.title.querySelectorAll(".map-card");

    assert.strictEqual(cards.length, 2);
    assert.strictEqual(cards[1].querySelector(".map-name").textContent, "Second");
    assert.strictEqual(cards[0].querySelector("canvas").width, 140);
    assert.true(!!buttons(parts.title, "Play"));
  });

  QUnit.test("the first map is chosen, and tapping a card chooses it, and only that one is marked", (assert) => {
    const cards = [...parts.title.querySelectorAll(".map-card")];
    assert.deepEqual(cards.map((card) => card.classList.contains("selected")), [true, false]);
    cards[1].querySelector(".map-pick").click();

    assert.strictEqual(screens.selected, 1);
    assert.deepEqual(cards.map((card) => card.classList.contains("selected")), [false, true]);
  });

  QUnit.test("play says which map is chosen", (assert) => {
    buttons(parts.title, "Play").click();
    parts.title.querySelectorAll(".map-pick")[1].click();
    buttons(parts.title, "Play").click();

    assert.deepEqual(heard, [["play", 0], ["play", 1]]);
  });

  QUnit.test("a card shows the stars that the map has earned, from the record", (assert) => {
    records.update("Second", { stars: 2, wave: 10 });
    screens.selectMap(0);
    const stars = [...parts.title.querySelectorAll(".stars")].map((node) => node.textContent);

    assert.deepEqual(stars, ["☆☆☆", "★★☆"]);
  });

  QUnit.test("each state shows its own screen, and the others are hidden", (assert) => {
    const shown = () => [parts.title, parts.pause, parts.result, parts.pauseButton, parts.speedButton].map((part) => !part.hidden);
    screens.show("title");
    assert.deepEqual(shown(), [true, false, false, false, false]);
    screens.show("playing");
    assert.deepEqual(shown(), [false, false, false, true, true], "only the buttons to pause and to change the speed");
    screens.show("paused");
    assert.deepEqual(shown(), [false, true, false, false, false]);
    screens.show("won");
    assert.deepEqual(shown(), [false, false, true, false, false]);
    screens.show("lost");
    assert.deepEqual(shown(), [false, false, true, false, false]);
  });

  QUnit.test("the pause screen has a button to go on, to start again and to choose a map, and each says so", (assert) => {
    buttons(parts.pause, "Resume").click();
    buttons(parts.pause, "Start again").click();
    buttons(parts.pause, "Choose map").click();

    assert.deepEqual(heard.map((entry) => entry[0]), ["resume", "restart", "menu"]);
  });

  QUnit.test("the button that pauses says so", (assert) => {
    parts.pauseButton.click();

    assert.deepEqual(heard, [["pause"]]);
  });

  QUnit.test("the button for the speed says so when it is pressed, and says what the speed is", (assert) => {
    parts.speedButton.click();
    screens.setSpeed("×2");

    assert.deepEqual(heard, [["speed"]]);
    assert.strictEqual(parts.speedButton.textContent, "×2");
  });

  QUnit.test("the pause screen has a button for the detail, which says what it is now and asks for the next when it is pressed", (assert) => {
    screens.setDetail("High");
    buttons(parts.pause, "Detail: High").click();

    assert.deepEqual(heard, [["detail"]]);
    screens.setDetail("Low");
    assert.true(!!buttons(parts.pause, "Detail: Low"));
  });

  QUnit.test("the pause screen has a button for the sound, which says whether it is on and asks to turn it over when it is pressed", (assert) => {
    screens.setSound(true);
    buttons(parts.pause, "Sound: On").click();

    assert.deepEqual(heard, [["mute"]]);
    screens.setSound(false);
    assert.true(!!buttons(parts.pause, "Sound: Off"));
  });

  QUnit.test("the title has a button to make a map of your own, which says so", (assert) => {
    buttons(parts.title, "Make a map").click();

    assert.deepEqual(heard, [["make"]]);
  });

  QUnit.test("the game's own maps have no buttons on their cards", (assert) => {
    for (const card of parts.title.querySelectorAll(".map-card")) assert.strictEqual(card.querySelectorAll(".map-tools button").length, 0);
  });

  QUnit.test("a map that was made has Edit and Delete, and one that was sent has only Edit, and each says which map", (assert) => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (hidden) => {
      const node = fixture.appendChild(document.createElement("div"));
      node.hidden = hidden;
      return node;
    };
    const more = [{ name: "First", rows: ["S##G"] }, { name: "Mine", rows: ["S.#G"] }, { name: "Sent", rows: ["S.#G"] }];
    const own = { title: make(false), pause: make(true), result: make(true), pauseButton: fixture.appendChild(document.createElement("button")), speedButton: fixture.appendChild(document.createElement("button")) };
    const custom = new Screens(own, document, more, records, "logo.webp", ["built-in", "kept", "shared"]);
    const said = [];
    for (const name of ["edit", "delete"]) custom.on(name, (index) => said.push([name, index]));
    const cards = [...own.title.querySelectorAll(".map-card")];
    const tools = (i) => [...cards[i].querySelectorAll(".map-tools button")].map((b) => b.textContent);

    assert.deepEqual(tools(0), []);
    assert.deepEqual(tools(1), ["Edit", "Delete"]);
    assert.deepEqual(tools(2), ["Edit"]);
    cards[1].querySelectorAll(".map-tools button")[0].click();
    cards[1].querySelectorAll(".map-tools button")[1].click();
    cards[2].querySelectorAll(".map-tools button")[0].click();
    assert.deepEqual(said, [["edit", 1], ["delete", 1], ["edit", 2]]);
  });

  QUnit.test("a press on a button of a card does not choose the map, and choosing is by the picture and the name", (assert) => {
    const fixture = document.getElementById("qunit-fixture");
    const node = (tag) => fixture.appendChild(document.createElement(tag));
    const own = { title: node("div"), pause: node("div"), result: node("div"), pauseButton: node("button"), speedButton: node("button") };
    const custom = new Screens(own, document, [maps[0], maps[1]], records, "logo.webp", ["built-in", "kept"]);
    own.title.querySelectorAll(".map-tools button")[0].click();

    assert.strictEqual(custom.selected, 0);
  });

  QUnit.test("a win shows its title, its stars, and a line for each number", (assert) => {
    screens.showResult({ result: "won", stars: 3, rows: [["Waves", "10 of 10"], ["Lives left", "20"]], improved: false });

    assert.strictEqual(parts.result.querySelector("h2").textContent, RESULTS.won.title);
    assert.strictEqual(parts.result.querySelector(".result-stars").textContent, "★★★");
    assert.deepEqual([...parts.result.querySelectorAll("dt")].map((n) => n.textContent), ["Waves", "Lives left"]);
    assert.deepEqual([...parts.result.querySelectorAll("dd")].map((n) => n.textContent), ["10 of 10", "20"]);
    assert.strictEqual(parts.result.dataset.result, "won");
    assert.strictEqual(parts.result.querySelector(".record").textContent, "");
  });

  QUnit.test("a loss shows no stars and a different title, and a new best says so", (assert) => {
    screens.showResult({ result: "lost", stars: 0, rows: [], improved: true });

    assert.strictEqual(parts.result.querySelector("h2").textContent, RESULTS.lost.title);
    assert.strictEqual(parts.result.querySelector(".result-stars").textContent, "");
    assert.strictEqual(parts.result.querySelector(".record").textContent, "A new best on this map!");
  });

  QUnit.test("a second result replaces the first: its lines do not pile up", (assert) => {
    screens.showResult({ result: "won", stars: 1, rows: [["A", "1"], ["B", "2"]], improved: false });
    screens.showResult({ result: "lost", stars: 0, rows: [["C", "3"]], improved: false });

    assert.strictEqual(parts.result.querySelectorAll("dt").length, 1);
  });

  QUnit.test("the result has buttons to play again and to choose a map", (assert) => {
    buttons(parts.result, "Play again").click();
    buttons(parts.result, "Choose map").click();

    assert.deepEqual(heard.map((entry) => entry[0]), ["restart", "menu"]);
  });

  QUnit.test("a pointer let go on any screen does not go on to the board, where the game would take it for a tap on a cell", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton, parts.speedButton]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    assert.strictEqual(reached, 0);
  });
});
