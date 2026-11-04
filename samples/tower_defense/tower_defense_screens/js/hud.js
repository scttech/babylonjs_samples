// The readouts of a game of waves: the lives, which wave it is and how long until the next, and a button to
// start the next one early. Like the tray, it is made from a page, has no game in it, and is told what to show. See ../tests/hud.tests.js.

// What the wave readout says, for the state of the game.
function waveText(phase, number, total, countdown) {
  if (phase === "won") return `All ${total} waves beaten`;
  if (phase === "lost") return `Lost in wave ${number} of ${total}`;
  if (phase === "preparing") return `Wave ${number} of ${total} in ${Math.max(0, Math.ceil(countdown))}`;
  return `Wave ${number} of ${total}`;
}

class Hud {
  // `parts` is { lives, wave, next }: the elements of the page that this fills in.
  constructor(parts) {
    this.parts = parts;
    this.started = [];
    // A press on the button is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell.
    parts.next.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.next.addEventListener("click", () => this.started.forEach((listener) => listener()));
  }

  // Asks to be told when the button for the next wave is pressed.
  onStartWave(listener) {
    this.started.push(listener);
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
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { waveText, Hud };
} else {
  Object.assign(window, { waveText, Hud });
}
