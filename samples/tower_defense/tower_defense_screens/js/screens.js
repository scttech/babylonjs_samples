// The screens that go over the game: the title, with a card for each map; the pause; and the result of a game won or lost,
// with its stars and numbers. They are made from a few empty elements of the page, have no game in them, and are told what to
// show: they say when a button is pressed. Starting a different map is a new page (the address says which map and whether to
// start at once), and `gameUrl` works that address out. See ../tests/screens.tests.js.

// The address of the game for a map, from the address now: `?map=1`, and `&go=1` to skip the title and begin at once.
function gameUrl(href, map, go = false) {
  const url = new URL(href);
  url.searchParams.set("map", String(map));
  if (go) url.searchParams.set("go", "1");
  else url.searchParams.delete("go");
  return url.toString();
}

// Three stars, as text: the ones earned, and the ones not (★★☆).
function starText(stars, total = 3) {
  return "★".repeat(stars) + "☆".repeat(total - stars);
}

class Screens {
  // `parts` is { title, pause, result, pauseButton }: the elements of the page that this fills in, and the ones it shows and
  // hides. `logo` is the address of the picture on the title. `records` says the best for each map.
  constructor(parts, document, maps, records, logo) {
    this.parts = parts;
    this.document = document;
    this.maps = maps;
    this.records = records;
    this.selected = 0;
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [] };
    this.buildTitle(logo);
    this.buildPause();
    this.buildResult();
    // A press on a screen is for the screen, and is not for the board behind it.
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.pauseButton.addEventListener("click", () => this.say("pause"));
  }

  // Asks to be told when a button is pressed: on("play", (map) => ...), and "resume", "restart", "menu" and "pause".
  on(name, listener) {
    this.listeners[name].push(listener);
  }

  say(name, ...args) {
    this.listeners[name].forEach((listener) => listener(...args));
  }

  // A button with text, that says something when it is pressed.
  button(text, className, action) {
    const button = element(this.document, "button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  buildTitle(logo) {
    const { title } = this.parts;
    const picture = element(this.document, "img", "logo");
    picture.src = logo;
    picture.alt = "Avatar: The Last Airbender Tower Defense";
    this.cards = this.maps.map((map, index) => {
      const card = element(this.document, "button", "map-card");
      card.type = "button";
      const canvas = element(this.document, "canvas", "minimap");
      canvas.width = 140;
      canvas.height = 90;
      drawMinimap(canvas.getContext("2d"), parseMap(map), canvas.width, canvas.height);
      const stars = element(this.document, "span", "stars");
      card.append(canvas, element(this.document, "span", "map-name", map.name), stars);
      card.addEventListener("click", () => this.selectMap(index));
      return { card, stars };
    });
    this.playButton = this.button("Play", "play", () => this.say("play", this.selected));
    const choices = element(this.document, "div", "map-cards");
    choices.append(...this.cards.map(({ card }) => card));
    title.append(
      picture,
      element(this.document, "h2", "", "Choose your battlefield"),
      choices,
      this.playButton,
      element(this.document, "p", "help", "Drag a podium from the tray onto the grass, then start the waves. Tap a tower to upgrade it.")
    );
    this.selectMap(0);
  }

  buildPause() {
    this.parts.pause.append(
      element(this.document, "h2", "", "Paused"),
      this.button("Resume", "play", () => this.say("resume")),
      this.button("Start again", "plain", () => this.say("restart")),
      this.button("Choose map", "plain", () => this.say("menu"))
    );
  }

  buildResult() {
    this.resultTitle = element(this.document, "h2");
    this.resultText = element(this.document, "p", "result-text");
    this.resultStars = element(this.document, "div", "result-stars");
    this.resultRows = element(this.document, "dl", "result-rows");
    this.resultRecord = element(this.document, "p", "record");
    this.parts.result.append(
      this.resultTitle,
      this.resultStars,
      this.resultText,
      this.resultRows,
      this.resultRecord,
      this.button("Play again", "play", () => this.say("restart")),
      this.button("Choose map", "plain", () => this.say("menu"))
    );
  }

  // Marks the map that will be played, and shows the stars that it has been given before.
  selectMap(index) {
    this.selected = index;
    this.cards.forEach(({ card, stars }, i) => {
      card.classList.toggle("selected", i === index);
      stars.textContent = starText(this.records.get(this.maps[i].name).stars);
    });
  }

  // Shows the screen for a state of the flow, and hides the others. The button to pause is there while the game is going.
  show(state) {
    this.parts.title.hidden = state !== "title";
    this.parts.pause.hidden = state !== "paused";
    this.parts.result.hidden = state !== "won" && state !== "lost";
    this.parts.pauseButton.hidden = state !== "playing";
    if (state === "title") this.selectMap(this.selected);
  }

  // Fills in the result screen: { result, stars, rows, improved }. `rows` are [label, value] pairs.
  showResult({ result, stars, rows, improved }) {
    this.parts.result.dataset.result = result;
    this.resultTitle.textContent = RESULTS[result].title;
    this.resultText.textContent = RESULTS[result].text;
    this.resultStars.textContent = result === "won" ? starText(stars) : "";
    this.resultRows.replaceChildren(...rows.flatMap(([label, value]) => [element(this.document, "dt", "", label), element(this.document, "dd", "", value)]));
    this.resultRecord.textContent = improved ? "A new best on this map!" : "";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { gameUrl, starText, Screens };
} else {
  Object.assign(window, { gameUrl, starText, Screens });
}
