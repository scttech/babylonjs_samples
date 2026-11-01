// What the player sees of a scare, and the choice of how much of it they want. The picker is the row of three buttons on the start screen
// (Gentle, Creepy, Terrifying) that says in words what each does; the effects are two layers over the picture, a flash that comes with a
// strike and a dark edge that closes in as something comes near. Both are built from the page's own elements and given the `document`,
// so the tests can give them a stand-in. See ../tests/scareui.tests.js.

class LevelPicker {
  constructor(doc, table = SCARE, onChange = () => {}) {
    this.table = table;
    this.onChange = onChange;
    this.root = doc.getElementById("start-level");
    this.note = doc.getElementById("start-level-note");
    this.buttons = {};
    for (const name of levelNames(table)) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = table.levels[name].label;
      button.addEventListener("click", () => this.select(name));
      this.root.appendChild(button);
      this.buttons[name] = button;
    }
    this.select(table.level, false);
  }

  // Chooses a level: the button is marked, the words under the buttons say what it does, and whoever is listening is told.
  select(name, tell = true) {
    if (!(name in this.table.levels)) return;
    this.table.level = name;
    for (const [other, button] of Object.entries(this.buttons)) {
      if (other === name) button.classList.add("selected");
      else button.classList.remove("selected");
    }
    this.note.textContent = this.table.levels[name].note;
    if (tell) this.onChange(name);
  }
}

class ScareFx {
  constructor(doc) {
    this.flash = doc.getElementById("flash");
    this.vignette = doc.getElementById("vignette");
  }

  // `flash` is 0 to 1 (the strike), `dread` is 0 to 1 (how near it is), `level` is the scare level's row.
  apply({ flash, dread, level }) {
    this.flash.style.opacity = String(Math.min(1, flash).toFixed(3));
    this.vignette.style.opacity = String((dread * level.vignette).toFixed(3));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LevelPicker, ScareFx };
} else {
  Object.assign(window, { LevelPicker, ScareFx });
}
