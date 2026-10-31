// The heads-up display: the score, the chain of moves and how long it has left, the tokens, the trial, and the banner for a combo. The words are made by plain functions (so a
// test can say that 61.3 seconds is "1:01.3"), and the Hud only puts them on the page. See ../tests/hud.tests.js and ../css/hud.css.

// A time in seconds as minutes, seconds and tenths: 61.3 is "1:01.3". (Tenths are cut, not rounded, so a time is never shown as better than it was.)
function formatTime(seconds) {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 1e-9);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths - minutes * 600) / 10;
  return `${minutes}:${rest < 10 ? "0" : ""}${rest.toFixed(1)}`;
}

// What the trial block says, as { title, time, hint }: the name of the run, the clock, and what to do next.
function trialLines(trial) {
  const target = trial.target;
  if (trial.state === "finished") {
    const best = trial.best === trial.time ? " (a new best)" : trial.best === null ? "" : ` (best ${formatTime(trial.best)})`;
    return { title: trial.table.name, time: formatTime(trial.time), hint: `${trial.medal === "none" ? "Finished" : trial.medal.toUpperCase()}${best}. Press T to run it again` };
  }
  if (trial.state === "ready") return { title: trial.table.name, time: formatTime(0), hint: `Run to the ${target.name.toLowerCase()}, or press T` };
  return { title: trial.table.name, time: formatTime(trial.time), hint: `${trial.next} of ${trial.checkpoints.length - 1}: the ${target.name.toLowerCase()}` };
}

// The picture of the Sick Combo banner, from the Parkour Runner series (it is in the assets of this one), as the page sees it.
const COMBO_IMAGE = "../assets/images/sick_combo_small.png";

class Hud {
  // `doc` is the page. The display is made and put at the end of its body.
  constructor(doc) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "hud", doc.body);
    const flow = make("div", "hud-flow", this.root);
    this.score = make("span", "hud-score", flow, "0");
    this.multiplier = make("span", "hud-multiplier", flow, "x1");
    const bar = make("div", "hud-bar", this.root);
    this.fill = make("div", "hud-fill", bar);
    this.tokens = make("div", "hud-tokens", this.root, "0 / 0 tokens");
    const trial = make("div", "hud-trial", this.root);
    this.trialTitle = make("div", "hud-trial-title", trial);
    this.trialTime = make("div", "hud-trial-time", trial);
    this.trialHint = make("div", "hud-trial-hint", trial);
    this.toasts = make("div", "hud-toasts", this.root);
    // The banner for a combo that has reached a milestone: the picture, and the words under it. It is not in the corner with the rest: it is in the
    // middle, near the top, and plays its animation (see hud.css) once each time it is shown.
    this.comboBanner = make("div", "hud-combo", this.root);
    this.comboImage = make("img", "hud-combo-image", this.comboBanner);
    this.comboImage.src = COMBO_IMAGE;
    this.comboImage.alt = "Sick combo";
    this.comboText = make("p", "hud-combo-text", this.comboBanner);
  }

  // Pops up the Sick Combo banner, with `text` under it ("5 in a row"). It plays its animation again from the start.
  banner(text) {
    this.comboText.textContent = text;
    this.comboBanner.classList.remove("show");
    void this.comboBanner.offsetWidth; // a read, so that the browser notices the class has gone before it is put back
    this.comboBanner.classList.add("show");
  }

  // Shows the state of the game: { score, multiplier, fraction (of the chain's window left), tokens, total, trial }.
  set({ score, multiplier, fraction, tokens, total, trial }) {
    this.score.textContent = String(Math.round(score));
    this.multiplier.textContent = `x${multiplier}`;
    this.fill.style.width = `${Math.round(fraction * 100)}%`;
    this.tokens.textContent = `${tokens} / ${total} tokens`;
    const lines = trialLines(trial);
    this.trialTitle.textContent = lines.title;
    this.trialTime.textContent = lines.time;
    this.trialHint.textContent = lines.hint;
  }

  // A few words that float up and go: "+12", "Checkpoint 1". They are taken away after `seconds`.
  toast(text, seconds = 1.6) {
    const element = this.doc.createElement("div");
    element.className = "hud-toast";
    element.textContent = text;
    this.toasts.appendChild(element);
    while (this.toasts.children.length > 5) this.toasts.removeChild(this.toasts.firstChild);
    setTimeout(() => element.parentNode && element.parentNode.removeChild(element), seconds * 1000);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { COMBO_IMAGE, formatTime, trialLines, Hud };
} else {
  Object.assign(window, { COMBO_IMAGE, formatTime, trialLines, Hud });
}
