// The tray at the bottom of the screen, where podiums are picked up, and the readouts that go with it: how
// much gold there is, and a line that says why a tower can't be built. It is made from a page and a list of
// benders, with no game in it: it says when a button is pressed, and is told what to show. See ../tests/tray.tests.js.

// The order of the buttons.
const TRAY_ORDER = ["air", "water", "earth", "fire"];

// A page element with a class and some text.
function element(document, tag, className, text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

class Tray {
  // `parts` is { tray, gold, message }: the three elements of the page that this fills in.
  constructor(parts, document, benders = BENDERS, order = TRAY_ORDER) {
    this.parts = parts;
    this.benders = benders;
    this.buttons = {};
    this.pressed = [];
    for (const kind of order) {
      const spec = benders[kind];
      const button = element(document, "button", "podium");
      button.type = "button";
      button.dataset.kind = kind;
      button.style.setProperty("--nation", spec.color);
      button.setAttribute("aria-label", `${spec.name}, ${spec.cost} gold`);
      button.append(element(document, "span", "swatch"), element(document, "span", "name", spec.name), element(document, "span", "cost", String(spec.cost)));
      // A press is passed on, with where it was: the game decides if it is a drag or a tap.
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        for (const listener of this.pressed) listener(kind, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });
      });
      parts.tray.append(button);
      this.buttons[kind] = button;
    }
  }

  // Asks to be told when a button is pressed: listener(kind, { x, y, pointerType }).
  onPress(listener) {
    this.pressed.push(listener);
  }

  // Shows how much gold there is, and which podiums there is too little for: a button that costs more than
  // there is looks greyed out (it still works, and says why not when it is tried).
  update(gold) {
    this.parts.gold.textContent = String(Math.floor(gold));
    for (const [kind, button] of Object.entries(this.buttons)) button.classList.toggle("poor", gold < this.benders[kind].cost);
  }

  // Marks the button of the podium that is armed or held, and unmarks the rest. `null` for none.
  hold(kind) {
    for (const [name, button] of Object.entries(this.buttons)) button.classList.toggle("held", name === kind);
  }

  // Says something on the line above the tray, such as why a tower can't be built. An empty sentence clears it.
  say(sentence) {
    this.parts.message.textContent = sentence;
    this.parts.message.classList.toggle("shown", sentence.length > 0);
  }

  // The tray's box on the page.
  get rect() {
    return this.parts.tray.getBoundingClientRect();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TRAY_ORDER, element, Tray };
} else {
  Object.assign(window, { TRAY_ORDER, element, Tray });
}
