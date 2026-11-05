// The panel of a tower: a small card that comes up when a tower is chosen, with its name and level, a button to make
// it better (and what that costs), and a button to sell it (and what that gives back). Like the tray and the readouts, it is
// made from a page, has no game in it, and is told what to show: it says when a button is pressed. See ../tests/panel.tests.js.

// What the line under the name says: which level it is, of how many, and what the level is called.
function levelText(level, total, levelName) {
  return `Level ${level} of ${total}, ${levelName}`;
}

// What the upgrade button says: where the upgrade goes, and what it costs.
function upgradeText(nextName, cost) {
  return `Make ${nextName} for ${cost}`;
}

// What the sell button says: what it gives back.
function sellText(refund) {
  return `Sell for ${refund}`;
}

class Panel {
    // `parts` is { panel, title, level, effect, upgrade, sell }: the elements of the page that this fills in.
  constructor(parts) {
    this.parts = parts;
    this.upgraded = [];
    this.sold = [];
    // A press on one of these buttons is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell (and put the panel away).
    for (const part of [parts.panel, parts.upgrade, parts.sell]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.upgrade.addEventListener("click", () => this.upgraded.forEach((listener) => listener()));
    parts.sell.addEventListener("click", () => this.sold.forEach((listener) => listener()));
  }

  // Asks to be told when the upgrade button is pressed, and when the sell button is.
  onUpgrade(listener) {
    this.upgraded.push(listener);
  }

  onSell(listener) {
    this.sold.push(listener);
  }

  get visible() {
    return !this.parts.panel.hidden;
  }

  // Shows a tower: { name, color, level, total, levelName, effect, nextName, cost, refund, gold }. `effect` is what its hits do besides harm, in words. `nextName` and `cost` are null for a
  // tower that is as good as it gets, and then there is no button to upgrade it. An upgrade that costs more than there is
  // looks greyed out (it still works, and says why not when it is tried).
  show({ name, color, level, total, levelName, effect, nextName, cost, refund, gold }) {
    const { panel, title, level: levelLine, effect: effectLine, upgrade, sell } = this.parts;
    panel.hidden = false;
    panel.style.setProperty("--nation", color);
    this.write(title, name);
    this.write(levelLine, levelText(level, total, levelName));
    this.write(effectLine, effect);
    upgrade.hidden = cost === null;
    if (cost !== null) {
      this.write(upgrade, upgradeText(nextName, cost));
      upgrade.classList.toggle("poor", gold < cost);
    }
    this.write(sell, sellText(refund));
  }

  hide() {
    this.parts.panel.hidden = true;
  }

  // Writes some text, if it is not what is there: the panel is shown every frame, and almost always says the same.
  write(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { levelText, upgradeText, sellText, Panel };
} else {
  Object.assign(window, { levelText, upgradeText, sellText, Panel });
}
