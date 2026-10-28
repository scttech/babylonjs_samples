// The screens over the picture: the title, the pause and the result. They are plain HTML in
// index.html, not Babylon.js, because they are mostly text, buttons and a text field, which the page
// already does well. This class finds them, shows the right one for what the game is doing, and fills
// them in. It takes the `document` it should look in, so the tests can give it a stand-in. See
// ../tests/screens.tests.js.
class Screens {
  constructor(doc = document) {
    this.doc = doc;
    const get = (id) => doc.getElementById(id);

    // The three screens, by the game state that shows each.
    this.screens = { [STATES.title]: get("title"), [STATES.paused]: get("pause"), [STATES.over]: get("over") };

    this.nameInput = get("name");
    // Clicking in the name selects it all, so that typing replaces it instead of adding to it.
    this.nameInput.addEventListener("focus", () => this.nameInput.select());
    this.titleBest = get("title-best");
    this.overHeading = get("over-heading");
    this.overScore = get("over-score");
    this.overBest = get("over-best");
    this.board = get("board");
    this.pauseButton = get("pause-button");
    this.buttons = {
      play: get("play"),
      resume: get("resume"),
      again: get("again"),
      pauseTitle: get("pause-title"),
      overTitle: get("over-title"),
      sound: get("sound"),
      pause: this.pauseButton,
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
  // a button that keeps focus is pressed again by the space bar.
  bind({ play, resume, again, toTitle, sound, pause }) {
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
    wire(this.buttons.pause, pause);
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
    this.titleBest.textContent = entry ? `Best: ${formatScore(entry.score)} by ${entry.name}` : "";
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
      points.textContent = formatScore(entry.score);
      row.appendChild(name);
      row.appendChild(points);
      this.board.appendChild(row);
    });
  }

  // Shows the pause button, for a touch screen with no P key, while a game is being played, and
  // hides it the rest of the time (the screens have their own buttons).
  setPlaying(playing) {
    this.pauseButton.classList.toggle("hidden", !playing);
  }

  // Says on the sound button whether the sound is on.
  setSound(on) {
    this.buttons.sound.textContent = on ? "Sound: on" : "Sound: off";
    this.buttons.sound.classList.toggle("off", !on);
  }

  // Fills in and shows the result screen: a heading (*You win!*, or *Time's up*), the score, whether it is a
  // new best, and the leaderboard with the player's place marked.
  showResult({ heading, score, best, newBest, rank, entries }) {
    this.overHeading.textContent = heading;
    this.overScore.textContent = `Score ${formatScore(score)}`;
    this.overBest.textContent = newBest ? "New best!" : `Best ${formatScore(best)}`;
    this.overBest.classList.toggle("new", newBest);
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
