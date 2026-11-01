// What the player sees of the rounds: two bars (health and sanity) with the number of the round and how many ghosts are left to find, a screen at the end of a round (what
// happened, the score, the pages of the journal, the best scores, and what to do next), and what the loss of sanity does to the picture. The words are made by plain
// functions (so a test can say what a round that was lost to the dark says), and the screens are built from the page's own elements, given the `document`. See ../tests/roundsui.tests.js
// and ../css/rounds.css. (It uses sanityLook from rounds.js.)

// Seconds as minutes and seconds: 125 is "2:05".
function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const rest = whole % 60;
  return `${Math.floor(whole / 60)}:${rest < 10 ? "0" : ""}${rest}`;
}

const KIND_NAMES = { ghost: "Ghost", spider: "Spider", ghoul: "Ghoul", skeleton: "Skeleton", mummy: "Mummy", ghoul_girl: "Ghoul girl", doll: "Doll" };

// What a round that is over says: { title, lines }.
function endText(result, record = false) {
  const clock = formatClock(result.time);
  if (result.outcome === "won") {
    return { title: `Round ${result.number} clear`, lines: [`${result.captured} of ${result.ghosts} captured in ${clock}`, `Score ${result.score}${record ? " (a new best!)" : ""}`, `Health ${Math.round(result.health)}, sanity ${result.sanity}`] };
  }
  const why = result.reason === "sanity" ? "The dark got to you." : "Something got to you.";
  return { title: result.reason === "sanity" ? "You lost your mind" : "You did not get out", lines: [why, `${result.captured} of ${result.ghosts} captured, ${clock} in`, "The room is still full."] };
}

// The pages of the journal as lines: "Ghost: met 3, dealt with 2".
function journalLines(journal) {
  const pages = journal.pages();
  if (pages.length === 0) return ["Nothing in the journal yet."];
  return pages.map((page) => `${KIND_NAMES[page.kind] || page.kind}: met ${page.met}, dealt with ${page.dealt}`);
}

class RoundsUi {
  // `doc` is the page; `handlers` is { onNext(), onAgain(), onQuit() }.
  constructor(doc, { onNext = () => {}, onAgain = () => {}, onQuit = () => {} } = {}) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "round-hud", doc.body);
    this.label = make("div", "round-label", this.root, "Round 1");
    const bars = make("div", "round-bars", this.root);
    this.healthBar = make("div", "round-bar health", bars);
    this.healthFill = make("i", "round-fill", this.healthBar);
    this.sanityBar = make("div", "round-bar sanity", bars);
    this.sanityFill = make("i", "round-fill", this.sanityBar);

    this.screen = make("div", "round-screen hidden", doc.body);
    this.title = make("h2", "round-title", this.screen);
    this.lines = make("div", "round-lines", this.screen);
    this.journal = make("div", "round-journal", this.screen);
    this.scores = make("div", "round-scores", this.screen);
    const buttons = make("div", "round-buttons", this.screen);
    this.next = make("button", "round-button primary", buttons, "Next round");
    this.again = make("button", "round-button", buttons, "Try this round again");
    this.quit = make("button", "round-button", buttons, "Leave");
    for (const button of [this.next, this.again, this.quit]) button.type = "button";
    this.next.addEventListener("click", () => onNext());
    this.again.addEventListener("click", () => onAgain());
    this.quit.addEventListener("click", () => onQuit());

    this.insane = make("div", "insane", doc.body); // the picture going wrong
  }

  // Shows how the round is going: the bars and the words over them. `round` is a Round.
  apply(round) {
    this.label.textContent = `Round ${round.number} · ${round.captured} of ${round.ghosts} ghosts`;
    this.healthFill.style.width = `${Math.round((round.health / ROUNDS.health) * 100)}%`;
    this.sanityFill.style.width = `${Math.round((round.sanity / ROUNDS.sanity) * 100)}%`;
    this.healthBar.classList.toggle("low", round.health < ROUNDS.health * 0.3);
    this.sanityBar.classList.toggle("low", round.sanity < ROUNDS.trick.below * 0.6);
    const look = sanityLook(round.sanity);
    const root = this.doc.documentElement.style;
    root.setProperty("--insane", look.vignette.toFixed(3));
    root.setProperty("--insane-hue", `${look.hue.toFixed(1)}deg`);
    root.setProperty("--insane-tilt", `${look.tilt.toFixed(2)}deg`);
    this.insane.style.opacity = (look.vignette * 0.85).toFixed(3);
    this.doc.body.classList.toggle("unwell", look.vignette > 0);
  }

  // The screen at the end of a round: `journal` is a Journal, `record` says whether the score is a new best, and `canContinue` whether there is a next round (only after a win).
  showEnd(result, journal, record = false, canContinue = result.outcome === "won") {
    const text = endText(result, record);
    this.title.textContent = text.title;
    this.screen.classList.toggle("won", result.outcome === "won");
    this.lines.textContent = "";
    for (const line of text.lines) this._line(this.lines, line);
    this.journal.textContent = "";
    this._line(this.journal, "The journal", "round-heading");
    for (const line of journalLines(journal)) this._line(this.journal, line);
    this.scores.textContent = "";
    this._line(this.scores, "The best scores", "round-heading");
    if (journal.scores.length === 0) this._line(this.scores, "None yet.");
    journal.scores.forEach((score, i) => this._line(this.scores, `${i + 1}. ${score}`));
    this.next.classList.toggle("hidden", !canContinue);
    this.screen.classList.remove("hidden");
  }

  _line(parent, text, className = "round-line") {
    const line = this.doc.createElement("p");
    line.className = className;
    line.textContent = text;
    parent.appendChild(line);
  }

  hideEnd() {
    this.screen.classList.add("hidden");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatClock, KIND_NAMES, endText, journalLines, RoundsUi };
} else {
  Object.assign(window, { formatClock, KIND_NAMES, endText, journalLines, RoundsUi });
}
