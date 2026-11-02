// The readouts of a game of waves: the lives, which wave it is and how long until the next, a button to
// start the next one early, and a banner for when the game is won or lost. Like the tray, it is made from a page,
// has no game in it, and is told what to show. See ../tests/hud.tests.js.

// What the wave readout says, for the state of the game.
function waveText(phase, number, total, countdown) {
  if (phase === "won") return `All ${total} waves beaten`;
  if (phase === "lost") return `Lost in wave ${number} of ${total}`;
  if (phase === "preparing") return `Wave ${number} of ${total} in ${Math.max(0, Math.ceil(countdown))}`;
  return `Wave ${number} of ${total}`;
}

// What the banner says when the game is over.
const BANNERS = {
  won: { title: "The island is safe!", text: "Every wave has been beaten." },
  lost: { title: "The island has fallen", text: "Too many got through." },
};

class Hud {
  // `parts` is { lives, wave, next, banner, title, text, again }: the elements of the page that this fills in.
  constructor(parts) {
    this.parts = parts;
    this.started = [];
    this.restarted = [];
    // A press on one of these buttons is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell.
    for (const button of [parts.next, parts.again]) button.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.next.addEventListener("click", () => this.started.forEach((listener) => listener()));
    parts.again.addEventListener("click", () => this.restarted.forEach((listener) => listener()));
  }

  // Asks to be told when the button for the next wave is pressed, and when the game is to be played again.
  onStartWave(listener) {
    this.started.push(listener);
  }

  onAgain(listener) {
    this.restarted.push(listener);
  }

  // Shows the state of the game: { lives, phase, number, total, countdown }.
  show({ lives, phase, number, total, countdown }) {
    this.write(this.parts.lives, String(lives));
    this.write(this.parts.wave, waveText(phase, number, total, countdown));
    this.parts.next.hidden = phase !== "preparing";
  }

  // Writes some text, if it is not what is there: the readouts are asked for every frame, and almost always say the same.
  write(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  // Shows the banner for a game that is won or lost, or hides it.
  banner(kind) {
    const shown = kind in BANNERS;
    this.parts.banner.hidden = !shown;
    if (!shown) return;
    this.parts.title.textContent = BANNERS[kind].title;
    this.parts.text.textContent = BANNERS[kind].text;
    this.parts.banner.dataset.result = kind;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { waveText, BANNERS, Hud };
} else {
  Object.assign(window, { waveText, BANNERS, Hud });
}
