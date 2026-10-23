// The screens over the picture: the title, the pause and the game over. They are plain
// HTML in index.html, not Babylon.js, because they are mostly text, buttons and a
// text field, which the page already does well. This class finds them, shows the right
// one for what the game is doing, and fills them in. It takes the `document` it
// should look in, so the tests can give it a stand-in. See ../tests/screens.tests.js.
class Screens {
  constructor(doc = document) {
    this.doc = doc;
    const get = (id) => doc.getElementById(id);

    // The three screens, by the game state that shows each.
    this.screens = { [STATES.title]: get("title"), [STATES.paused]: get("pause"), [STATES.over]: get("over") };

    this.nameInput = get("name");
    this.swatches = get("swatches");
    this.titleBest = get("title-best");
    this.overScore = get("over-score");
    this.overBest = get("over-best");
    this.highScore = get("high-score");
    this.comboBanner = get("combo-banner");
    this.comboText = get("combo-text");
    this.board = get("board");
    this.buttons = {
      play: get("play"),
      resume: get("resume"),
      again: get("again"),
      pauseTitle: get("pause-title"),
      overTitle: get("over-title"),
      sound: get("sound"),
    };
  }

  // Shows the screen for a game state, and hides the others. The state `playing` has no
  // screen, so showing it hides them all.
  show(state) {
    for (const [name, screen] of Object.entries(this.screens)) {
      screen.classList.toggle("hidden", name !== state);
    }
  }

  // Makes the buttons do something. Each lets go of the keyboard focus when it is clicked:
  // a button that keeps focus is pressed again by the space bar, which is the jump key.
  bind({ play, resume, again, toTitle, sound }) {
    const wire = (button, callback) =>
      button.addEventListener("click", () => {
        button.blur();
        callback();
      });
    wire(this.buttons.play, play);
    wire(this.buttons.resume, resume);
    wire(this.buttons.again, again);
    wire(this.buttons.pauseTitle, toTitle);
    wire(this.buttons.overTitle, toTitle);
    wire(this.buttons.sound, sound);
  }

  // The name in the text field.
  get name() {
    return this.nameInput.value;
  }

  setName(name) {
    this.nameInput.value = name;
  }

  // The best score, shown on the title screen: the top entry of the leaderboard, if any.
  setBest(entry) {
    this.titleBest.textContent = entry ? `Best: ${entry.score} by ${entry.name}` : "";
  }

  // One round button for each color, painted with its two colors, with the chosen one
  // marked. `onPick` is told the id of the color that is clicked.
  renderSwatches(colors, selectedId, onPick) {
    this.swatches.replaceChildren();
    for (const color of colors) {
      const button = this.doc.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.title = color.name;
      button.setAttribute("aria-label", color.name);
      button.style.background = `linear-gradient(135deg, ${color.body} 55%, ${color.joints} 55%)`;
      button.classList.toggle("selected", color.id === selectedId);
      button.addEventListener("click", () => {
        button.blur();
        onPick(color.id);
        this.renderSwatches(colors, color.id, onPick);
      });
      this.swatches.appendChild(button);
    }
  }

  // The leaderboard as a list, with the row at `rank` (1 for first) marked as the
  // player's. Names are set as text, never as HTML, so a name can't add anything to the page.
  renderBoard(entries, rank = 0) {
    this.board.replaceChildren();
    if (entries.length === 0) {
      const empty = this.doc.createElement("li");
      empty.textContent = "No scores yet";
      this.board.appendChild(empty);
      return;
    }
    entries.forEach((entry, i) => {
      const row = this.doc.createElement("li");
      row.classList.toggle("you", i + 1 === rank);
      const name = this.doc.createElement("span");
      name.textContent = `${i + 1}. ${entry.name}`;
      const points = this.doc.createElement("span");
      points.textContent = String(entry.score);
      row.appendChild(name);
      row.appendChild(points);
      this.board.appendChild(row);
    });
  }

  // The banner for a combo that has reached a milestone. It plays its animation once,
  // fading in and out by itself. Taking the class off and putting it back on starts the
  // animation again if it is already showing: the page has to notice the class has gone
  // (reading `offsetWidth` makes it) before it is added again.
  showCombo(combo) {
    this.comboText.textContent = `${combo} in a row`;
    this.comboBanner.classList.remove("show");
    void this.comboBanner.offsetWidth;
    this.comboBanner.classList.add("show");
  }

  // Says on the sound button whether the sound is on.
  setSound(on) {
    this.buttons.sound.textContent = on ? "Sound: on" : "Sound: off";
    this.buttons.sound.classList.toggle("off", !on);
  }

  // Fills in and shows the game over screen. The High Score picture is only there for a
  // new best score.
  showResult({ score, best, newBest, rank, entries }) {
    this.overScore.textContent = `Score ${score}`;
    this.overBest.textContent = newBest ? "New best!" : `Best ${best}`;
    this.highScore.classList.toggle("hidden", !newBest);
    this.renderBoard(entries, rank);
    this.show(STATES.over);
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Screens };
} else {
  window.Screens = Screens;
}
