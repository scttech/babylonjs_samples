// The developer panel: sliders, switches and read-outs for the things worth watching and adjusting while you play, to see what they do
// at once. It is only made when the address ends in ?dev, so a player never sees it. Each row is plain data (a label, and how to read
// and write the number), so a later part of the game adds a row, not a new panel. See ../tests/devpanel.tests.js.

const DEV_KEY = "Backquote"; // the key (the one under Esc) that shows and hides the panel

// Is developer mode asked for? `search` is the end of the address, the part from the question mark.
function devEnabled(search) {
  return new URLSearchParams(search || "").has("dev");
}

// A row with a slider, for a number that is kept somewhere particular: how to read it, and how to write it.
function control(label, get, set, min, max, step = 0.01) {
  return { kind: "range", label, min, max, step, get, set };
}

// A row with a slider for a number that is a property of an object: slider("Gravity", world, "g", 0, 30).
function slider(label, object, key, min, max, step = 0.01) {
  return control(label, () => object[key], (value) => { object[key] = value; }, min, max, step);
}

// A row with a switch, for something that is on or off.
function toggle(label, get, set) {
  return { kind: "toggle", label, get, set };
}

// A row that only shows something, such as the speed or the frame rate. `get` gives the words (or a number) to show.
function readout(label, get) {
  return { kind: "readout", label, get };
}

// A row with a button, that does something when it is pressed (jump to a place, say).
function action(label, run) {
  return { kind: "action", label, run };
}

// How many places after the point a step has (0.01 has two), so a number is shown to just that many.
function decimalsOf(step) {
  const text = String(step);
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

function formatValue(value, step) {
  return Number(value).toFixed(decimalsOf(step));
}

// What a row shows as words: a number to its step, a switch as on or off, a read-out as it is.
function rowText(row) {
  if (row.kind === "toggle") return row.get() ? "on" : "off";
  if (row.kind === "readout") return String(row.get());
  return formatValue(row.get(), row.step);
}

// Every row as a line of text, under the title of its group, to read or to paste back into the code:
//   Camera
//     distance: 5.50
// (A button has nothing to say, so it is left out.)
function valuesText(groups) {
  const lines = [];
  for (const group of groups) {
    lines.push(group.title);
    for (const row of group.rows) if (row.kind !== "action") lines.push(`  ${row.label}: ${rowText(row)}`);
  }
  return lines.join("\n");
}

class DevPanel {
  // `groups` is [{ title, rows }]. It starts folded up, to a title bar, if `collapsed`. `onChange(row, value)` is told of every
  // change, and `clipboard` is where Copy puts the text.
  constructor(doc, groups, { collapsed = false, onChange = () => {}, clipboard = null } = {}) {
    this.groups = groups;
    this.onChange = onChange;
    this.clipboard = clipboard;
    this.inputs = []; // { row, input, output } for every row that has a value, to bring up to date

    this.root = doc.createElement("div");
    this.root.id = "dev-panel";

    this.head = doc.createElement("button");
    this.head.className = "dev-head";
    this.head.addEventListener("click", () => this.toggleCollapsed());
    this.root.appendChild(this.head);

    this.body = doc.createElement("div");
    this.body.className = "dev-body";
    this.root.appendChild(this.body);

    for (const group of groups) {
      const title = doc.createElement("h3");
      title.textContent = group.title;
      this.body.appendChild(title);
      for (const row of group.rows) this.body.appendChild(this._makeRow(doc, row));
    }

    this.copyButton = doc.createElement("button");
    this.copyButton.className = "dev-copy";
    this.copyButton.textContent = "Copy values";
    this.copyButton.addEventListener("click", () => this.copy());
    this.body.appendChild(this.copyButton);

    this.setCollapsed(collapsed);
  }

  // One row. What it has depends on its kind: a slider and its number, a switch, a line of words, or a button.
  _makeRow(doc, row) {
    if (row.kind === "action") {
      const button = doc.createElement("button");
      button.className = "dev-action";
      button.textContent = row.label;
      button.addEventListener("click", () => {
        button.blur();
        row.run();
      });
      return button;
    }

    const line = doc.createElement("label");
    line.className = "dev-row";
    const name = doc.createElement("span");
    name.textContent = row.label;
    const output = doc.createElement("output");
    line.appendChild(name);

    if (row.kind === "readout") {
      line.appendChild(output);
      line.classList.add("readout");
      this.inputs.push({ row, input: null, output });
      this.refresh();
      return line;
    }

    const input = doc.createElement("input");
    if (row.kind === "toggle") {
      input.type = "checkbox";
      input.addEventListener("change", () => {
        row.set(input.checked);
        output.textContent = rowText(row);
        this.onChange(row, input.checked);
        input.blur();
      });
    } else {
      input.type = "range";
      input.min = row.min;
      input.max = row.max;
      input.step = row.step;
      // Once a slider is let go it lets go of the keyboard too, or the arrow keys would move it and not the runner.
      input.addEventListener("change", () => input.blur());
      input.addEventListener("input", () => {
        const value = Number(input.value);
        row.set(value);
        output.textContent = rowText(row);
        this.onChange(row, value);
      });
    }
    line.appendChild(input);
    line.appendChild(output);
    this.inputs.push({ row, input, output });
    this.refresh();
    return line;
  }

  // Shows every row as the game has it now, for when the game has changed one itself.
  refresh() {
    for (const { row, input, output } of this.inputs) {
      if (input) {
        if (row.kind === "toggle") input.checked = Boolean(row.get());
        else input.value = row.get();
      }
      output.textContent = rowText(row);
    }
  }

  // Brings up to date only the read-outs, which change all the time. (Doing the sliders too would fight with a hand that is moving one.)
  refreshReadouts() {
    for (const { row, output } of this.inputs) if (row.kind === "readout") output.textContent = rowText(row);
  }

  get collapsed() {
    return this.root.classList.contains("collapsed");
  }

  setCollapsed(collapsed) {
    this.root.classList.toggle("collapsed", collapsed);
    this.head.textContent = collapsed ? "Dev ▸" : "Dev ▾";
  }

  toggleCollapsed() {
    this.setCollapsed(!this.collapsed);
  }

  get shown() {
    return !this.root.classList.contains("hidden");
  }

  toggleShown() {
    this.root.classList.toggle("hidden", this.shown);
  }

  text() {
    return valuesText(this.groups);
  }

  // Puts the numbers on the clipboard as text (and says so in the console), if there is a clipboard to put them on.
  async copy() {
    const text = this.text();
    console.log(text);
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEV_KEY, devEnabled, control, slider, toggle, readout, action, decimalsOf, formatValue, rowText, valuesText, DevPanel };
} else {
  Object.assign(window, { DEV_KEY, devEnabled, control, slider, toggle, readout, action, decimalsOf, formatValue, rowText, valuesText, DevPanel });
}
