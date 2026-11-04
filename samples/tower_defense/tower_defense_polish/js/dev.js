// The developer panel: sliders for the numbers of the game, so that a game can be tuned by playing it, and not by editing a
// table and reloading. It is there only when the address says `?dev`. Every slider is a row of a table (an object and the name of one
// of its numbers), so a number is added to it with one line, and a slider changes the very number that the game reads. The
// values can be logged, to be pasted back into the tables. See ../tests/dev.tests.js.

// Whether the address asks for the panel: `?dev`, or `?dev=1`, anywhere in the query.
function devEnabled(search) {
  return new URLSearchParams(search).has("dev");
}

// The sliders. `group` is what they are listed under. Made when it is asked for, and not when the script is loaded, so that it doesn't
// matter which file was loaded first.
function devTable() {
  return [
    { group: "Bolts and towers", label: "bolt speed", object: BOLT, key: "speed", min: 3, max: 25, step: 0.5 },
    { group: "Bolts and towers", label: "turn rate", object: BRAIN, key: "turnRate", min: 1, max: 15, step: 0.5 },
    { group: "Effects", label: "slow: share of speed", object: EFFECTS.slow, key: "speed", min: 0.1, max: 1, step: 0.05 },
    { group: "Effects", label: "slow: seconds", object: EFFECTS.slow, key: "seconds", min: 0.5, max: 8, step: 0.5 },
    { group: "Effects", label: "slow: radius", object: EFFECTS.slow, key: "radius", min: 0, max: 4, step: 0.2 },
    { group: "Effects", label: "burn: damage a second", object: EFFECTS.burn, key: "damage", min: 0, max: 12, step: 0.5 },
    { group: "Effects", label: "burn: seconds", object: EFFECTS.burn, key: "seconds", min: 0.5, max: 8, step: 0.5 },
    { group: "Effects", label: "stun: seconds", object: EFFECTS.stun, key: "seconds", min: 0.2, max: 4, step: 0.1 },
    { group: "Effects", label: "push: distance", object: EFFECTS.push, key: "distance", min: 0, max: 8, step: 0.5 },
    { group: "Rules", label: "seconds between waves", object: RULES, key: "pause", min: 2, max: 40, step: 1 },
    { group: "Rules", label: "refund share", object: ECONOMY, key: "refund", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "master volume", object: AUDIO, key: "master", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "effects volume", object: AUDIO, key: "sfx", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "music volume", object: AUDIO, key: "music", min: 0, max: 1, step: 0.05 },
    { group: "Limits", label: "most enemies on the board", object: LIMITS, key: "enemies", min: 5, max: 80, step: 1 },
    { group: "Enemies", label: "grunt speed", object: ENEMIES.grunt, key: "speed", min: 0.5, max: 5, step: 0.1 },
    { group: "Enemies", label: "scout speed", object: ENEMIES.scout, key: "speed", min: 0.5, max: 6, step: 0.1 },
    { group: "Enemies", label: "heavy speed", object: ENEMIES.heavy, key: "speed", min: 0.5, max: 5, step: 0.1 },
  ];
}

// A value kept inside the slider's range, and on its steps.
function clampDev(row, value) {
  const stepped = Math.round((value - row.min) / row.step) * row.step + row.min;
  const rounded = Math.round(stepped * 1e6) / 1e6;
  return Math.min(row.max, Math.max(row.min, rounded));
}

// The numbers now, by label: what to paste back into the tables.
function devValues(rows) {
  return Object.fromEntries(rows.map((row) => [row.label, row.object[row.key]]));
}

// Puts every number back to what it was when the panel was made.
function resetDev(rows) {
  for (const row of rows) row.object[row.key] = row.initial;
}

class DevPanel {
  // `parts` is { panel }: an empty element of the page. `rows` is the table. `log` says what to do with the values when they are wanted.
  constructor(parts, document, rows = devTable(), log = (values) => console.table(values)) {
    this.parts = parts;
    this.rows = rows.map((row) => ({ ...row, initial: row.object[row.key] }));
    this.log = log;
    this.inputs = [];
    this.collapsed = false;
    const { panel } = parts;
    // A press on the panel is for the panel, and is not for the board behind it.
    for (const type of ["pointerdown", "pointerup"]) panel.addEventListener(type, (event) => event.stopPropagation());

    const header = element(document, "div", "dev-header");
    this.body = element(document, "div", "dev-body");
    const fold = element(document, "button", "dev-fold", "Dev ▾");
    fold.type = "button";
    fold.addEventListener("click", () => this.fold());
    header.append(fold);
    let group = null;
    this.rows.forEach((row, i) => {
      if (row.group !== group) {
        group = row.group;
        this.body.append(element(document, "h4", "", group));
      }
      const label = element(document, "label", "dev-row");
      const input = element(document, "input");
      input.type = "range";
      input.min = String(row.min);
      input.max = String(row.max);
      input.step = String(row.step);
      input.value = String(row.initial);
      const value = element(document, "span", "dev-value", String(row.initial));
      input.addEventListener("input", () => this.set(i, Number(input.value)));
      label.append(element(document, "span", "dev-label", row.label), input, value);
      this.body.append(label);
      this.inputs.push({ input, value });
    });
    const reset = element(document, "button", "dev-button", "Reset");
    reset.type = "button";
    reset.addEventListener("click", () => this.reset());
    const logButton = element(document, "button", "dev-button", "Log values");
    logButton.type = "button";
    logButton.addEventListener("click", () => this.log(devValues(this.rows)));
    this.body.append(reset, logButton);
    panel.append(header, this.body);
    panel.hidden = true;
  }

  // Sets the number of a row, kept in its range, and moves its slider and its text.
  set(index, value) {
    const row = this.rows[index];
    const clamped = clampDev(row, value);
    row.object[row.key] = clamped;
    this.inputs[index].input.value = String(clamped);
    this.inputs[index].value.textContent = String(clamped);
  }

  reset() {
    resetDev(this.rows);
    this.rows.forEach((row, i) => this.set(i, row.initial));
  }

  // Shows the panel, or hides it (the key does this).
  toggle() {
    this.parts.panel.hidden = !this.parts.panel.hidden;
  }

  // Folds the sliders away and brings them back, so that the panel can stay up and not be in the way.
  fold() {
    this.collapsed = !this.collapsed;
    this.body.hidden = this.collapsed;
  }

  get visible() {
    return !this.parts.panel.hidden;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { devEnabled, devTable, clampDev, devValues, resetDev, DevPanel };
} else {
  Object.assign(window, { devEnabled, devTable, clampDev, devValues, resetDev, DevPanel });
}
