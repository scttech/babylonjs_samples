// The level editor screen. It draws a LevelDraft on a canvas, one square for each corner of the floor (darker is lower, with its
// digit written in it), with the start, goal and things on top, and has the tools, the numbers of the picked thing and the list
// of problems around it. Everything it does to the level is done by the draft and by applyGesture, so this file is only
// drawing, and turning clicks and keys into calls. It is built from a `document`, like the developer panel. The limits (how big
// a level can be, how tall a height can be) are read from the draft, never written here.

const EDITOR_COLORS = {
  hole: "#0b0e14",
  start: "#ffffff",
  enemy: "#ef5e07",
  mover: "#a2adc0",
  selected: "#f6bf0e",
  error: "#ff4040",
  warning: "#ef5e07",
  digitOnLight: "#0b0909",
  digitOnDark: "#d9dbdc",
};

// A small helper for building the page: an element with some properties and children.
function element(doc, tag, props = {}, children = []) {
  const node = doc.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.appendChild(child);
  return node;
}

class Editor {
  constructor(doc, { limits = EDITOR_LIMITS, onTest = () => {}, onSave = () => true, onClose = () => {} } = {}) {
    this.doc = doc;
    this.limits = limits;
    this.onTest = onTest; // called with the level to play, when Test is clicked and the level can be played
    this.onSave = onSave; // called with the level to keep. Returns whether it was kept
    this.onClose = onClose;
    this.draft = null;
    this.settings = { tool: "paint", height: Math.min(4, limits.maxHeight), rampTo: null };
    this.held = null; // the gesture being made: where it began, where it was last, and so on
    this.preview = null; // the box being dragged by the fill tool
    this.problems = [];
    this.cell = CELL_PIXELS.max;
    this.closing = false; // whether Close is waiting for a second click, because of changes that would be lost
    this._onKey = (event) => this._key(event);
    this._build();
  }

  // ---- building the page ----

  _button(text, onClick, className = "") {
    const button = element(this.doc, "button", { type: "button", textContent: text, className: `hazard ${className}`.trim() });
    button.addEventListener("click", () => {
      button.blur();
      onClick();
    });
    return button;
  }

  _number(min, max, step, onChange) {
    const input = element(this.doc, "input", { type: "number", min, max, step });
    input.addEventListener("change", () => onChange(Number(input.value)));
    return input;
  }

  _build() {
    const { doc, limits } = this;
    this.root = element(doc, "div", { id: "editor", className: "screen editor hidden" });

    // The top bar: the name, the clock, the size, and the buttons.
    this.nameInput = element(doc, "input", { type: "text", className: "editor-name", maxLength: limits.maxName, spellcheck: false, autocomplete: "off" });
    this.nameInput.addEventListener("change", () => this._edit(() => this.draft.setName(this.nameInput.value)));
    this.timeInput = this._number(limits.minTime, limits.maxTime, 5, (value) => this._edit(() => this.draft.setTime(value)));
    this.colsInput = this._number(limits.minCols, limits.maxCols, 1, (value) => this._resize(value, this.draft.rows));
    this.rowsInput = this._number(limits.minRows, limits.maxRows, 1, (value) => this._resize(this.draft.cols, value));
    const labelled = (text, ...inputs) => element(doc, "label", { className: "editor-field" }, [element(doc, "span", { textContent: text }), ...inputs]);
    this.undoButton = this._button("Undo", () => this._undo(), "quiet");
    this.redoButton = this._button("Redo", () => this._redo(), "quiet");
    this.testButton = this._button("Test", () => this._test());
    this.saveButton = this._button("Save", () => this._save());
    this.closeButton = this._button("Exit", () => this._close(), "quiet");
    const bar = element(doc, "div", { className: "editor-bar" }, [
      this.nameInput,
      labelled("Time", this.timeInput),
      labelled("Size", this.colsInput, element(doc, "span", { textContent: "×" }), this.rowsInput),
      this.undoButton,
      this.redoButton,
      this.testButton,
      this.saveButton,
      this.closeButton,
    ]);

    // The tools: the floor ones, a palette of heights, then the things.
    this.toolButtons = {};
    const tools = element(doc, "div", { className: "editor-tools" });
    for (const group of [...new Set(EDITOR_TOOLS.map((tool) => tool.group))]) {
      tools.appendChild(element(doc, "h3", { textContent: group }));
      for (const tool of EDITOR_TOOLS.filter((one) => one.group === group)) {
        this.toolButtons[tool.id] = this._button(tool.label, () => this.setTool(tool.id), "tool");
        tools.appendChild(this.toolButtons[tool.id]);
      }
      if (group === "Floor") this._buildPalette(tools);
    }

    // The picture, and beside it the numbers of the thing that is picked and the problems.
    this.canvas = element(doc, "canvas", { className: "editor-canvas" });
    for (const [type, phase] of [["pointerdown", "down"], ["pointermove", "move"], ["pointerup", "up"], ["pointercancel", "up"]]) {
      this.canvas.addEventListener(type, (event) => this._pointer(phase, event));
    }
    this.stage = element(doc, "div", { className: "editor-stage" }, [this.canvas]);
    this.thingTitle = element(doc, "h3");
    this.thingFields = element(doc, "div", { className: "editor-fields" });
    this.thingButtons = element(doc, "div", { className: "editor-thing-buttons" });
    this.problemTitle = element(doc, "h3");
    this.problemList = element(doc, "ul", { className: "editor-problems" });
    const side = element(doc, "div", { className: "editor-side" }, [this.thingTitle, this.thingFields, this.thingButtons, this.problemTitle, this.problemList]);

    this.hint = element(doc, "p", { className: "editor-hint" });
    this.root.appendChild(bar);
    this.root.appendChild(element(doc, "div", { className: "editor-body" }, [tools, this.stage, side]));
    this.root.appendChild(this.hint);
  }

  // The heights to paint with: a swatch for each digit, and the height a fill ramps to.
  _buildPalette(tools) {
    const { doc, limits } = this;
    this.swatches = [];
    const palette = element(doc, "div", { className: "editor-palette" });
    for (let height = 0; height <= limits.maxHeight; height++) {
      const swatch = this._button(String(height), () => this.setHeight(height), "swatch");
      swatch.style.background = heightColor(height, limits.maxHeight);
      swatch.style.color = height > limits.maxHeight / 2 ? EDITOR_COLORS.digitOnLight : EDITOR_COLORS.digitOnDark;
      this.swatches.push(swatch);
      palette.appendChild(swatch);
    }
    this.rampSelect = element(doc, "select", { className: "editor-ramp", title: "Ramp to" });
    this.rampSelect.appendChild(element(doc, "option", { value: "", textContent: "flat" }));
    for (let height = 0; height <= limits.maxHeight; height++) this.rampSelect.appendChild(element(doc, "option", { value: String(height), textContent: `ramp to ${height}` }));
    this.rampSelect.addEventListener("change", () => {
      this.settings.rampTo = this.rampSelect.value === "" ? null : Number(this.rampSelect.value);
      this.rampSelect.blur();
    });
    tools.appendChild(palette);
    tools.appendChild(this.rampSelect);
  }

  // ---- opening and closing ----

  open(draft) {
    this.draft = draft;
    this.held = null;
    this.preview = null;
    this.closing = false;
    this.root.classList.remove("hidden");
    this.doc.body.classList.add("editing");
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("resize", this._onResize || (this._onResize = () => this.refresh()));
    this.say("");
    this.setTool(this.settings.tool);
    this.refresh();
  }

  hide() {
    this.root.classList.add("hidden");
    this.doc.body.classList.remove("editing");
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("resize", this._onResize);
  }

  get isOpen() {
    return !this.root.classList.contains("hidden");
  }

  say(text) {
    this.hint.textContent = text;
  }

  // ---- doing things ----

  setTool(id) {
    this.settings.tool = id;
    this.say(EDITOR_TOOLS.find((tool) => tool.id === id).hint);
    this._showChoices();
  }

  setHeight(height) {
    this.settings.height = height;
    this._showChoices();
  }

  // One change made by a button or a box: an undo step is started, the change is made, and the screen follows.
  _edit(change) {
    this.draft.begin();
    change();
    this.refresh();
  }

  _resize(cols, rows) {
    this._edit(() => this.draft.resize(cols, rows));
  }

  _undo() {
    if (this.draft.undo()) this.refresh();
  }

  _redo() {
    if (this.draft.redo()) this.refresh();
  }

  _remove() {
    if (!this.draft.selected) return;
    this.draft.begin();
    if (this.draft.removeSelected()) this.refresh();
    else this.say("The start and the goal can't be taken out. Move them with their tools.");
  }

  _flatten() {
    this.draft.begin();
    const changed = this.draft.flattenSelected();
    this.say(changed > 0 ? "The floor is flat under it now." : "The floor was flat there already.");
    this.refresh();
  }

  _test() {
    const problems = this.draft.problems;
    const error = problems.find((found) => found.severity === "error");
    if (error) {
      this.say(`It can't be played yet: ${error.message}.`);
      return;
    }
    this.onTest(this.draft.toLevel());
  }

  _save() {
    if (this.onSave(this.draft.toLevel())) {
      this.draft.markSaved();
      this.say("Saved to My levels.");
    } else {
      this.say("It could not be saved. Is My levels full?");
    }
    this.refresh();
  }

  // Closing a level with changes that were not saved asks first: the button says so, and the next click closes.
  _close() {
    if (this.draft.changed && !this.closing) {
      this.closing = true;
      this.closeButton.textContent = "Exit without saving?";
      return;
    }
    this.closing = false;
    this.closeButton.textContent = "Exit";
    this.hide();
    this.onClose();
  }

  // ---- the mouse and the keyboard ----

  _at(event) {
    const box = this.canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    return { corner: cornerAt(x, y, this.cell), place: placeAt(x, y, this.cell) };
  }

  _pointer(phase, event) {
    if (!this.draft) return;
    if (phase === "down") {
      if (event.button !== 0) return;
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
    } else if (!this.held) {
      return;
    }
    const at = this._at(event);
    const outcome = applyGesture(this.draft, this.settings, phase, at, this.held || {});
    if (phase === "down") this.held = { origin: at, last: at, picked: false, began: false };
    Object.assign(this.held, outcome);
    this.held.last = at;
    if (outcome.full) this.say(`There is no room for another: a level has at most ${this.limits.maxObjects} of each thing.`);
    if (outcome.switchTo) this.setTool(outcome.switchTo);
    if (this.settings.tool === "fill") this.preview = { from: this.held.origin.corner, to: at.corner };
    if (phase === "move") {
      this.draw();
      return;
    }
    if (phase === "up") {
      this.held = null;
      this.preview = null;
    }
    this.refresh();
  }

  _key(event) {
    if (typesText(event) || (event.target && event.target.tagName === "SELECT")) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && event.code === "KeyZ") {
      event.preventDefault();
      if (event.shiftKey) this._redo();
      else this._undo();
    } else if (command && event.code === "KeyY") {
      event.preventDefault();
      this._redo();
    } else if (event.code === "Delete" || event.code === "Backspace") {
      event.preventDefault();
      this._remove();
    } else if (/^Digit\d$/.test(event.code) && Number(event.code.slice(5)) <= this.limits.maxHeight) {
      this.setHeight(Number(event.code.slice(5)));
    }
  }

  // ---- showing it ----

  // Redraws everything from the draft: the boxes at the top, the picture, the picked thing and the problems.
  refresh() {
    const { draft } = this;
    this.problems = draft.problems;
    if (this.doc.activeElement !== this.nameInput) this.nameInput.value = draft.level.name;
    this.timeInput.value = draft.level.time;
    this.colsInput.value = draft.cols;
    this.rowsInput.value = draft.rows;
    this.undoButton.disabled = !draft.canUndo;
    this.redoButton.disabled = !draft.canRedo;
    this.saveButton.textContent = draft.changed ? "Save •" : "Saved";
    this.testButton.classList.toggle("blocked", !canPlay(this.problems));
    this._layout();
    this.draw();
    this._showChoices();
    this._showThing();
    this._showProblems();
  }

  // Which tool and height are chosen.
  _showChoices() {
    for (const [id, button] of Object.entries(this.toolButtons)) button.classList.toggle("on", id === this.settings.tool);
    this.swatches.forEach((swatch, height) => swatch.classList.toggle("on", height === this.settings.height));
  }

  // Makes the picture the size that fits the space it is in.
  _layout() {
    const { draft } = this;
    const width = this.stage.clientWidth || 900;
    const height = this.stage.clientHeight || 520;
    this.cell = cellSizeFor(draft.cols, draft.rows, width, height);
    this.canvas.width = draft.cols * this.cell;
    this.canvas.height = draft.rows * this.cell;
  }

  draw() {
    const { draft, cell, canvas } = this;
    const context = canvas.getContext("2d");
    const at = (value) => (value + 0.5) * cell; // the middle of a corner's square, in pixels
    context.fillStyle = EDITOR_COLORS.hole;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // The floor.
    context.font = `700 ${Math.floor(cell * 0.55)}px "Barlow Condensed", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let row = 0; row < draft.rows; row++) {
      for (let col = 0; col < draft.cols; col++) {
        const digit = draft.digitAt(col, row);
        if (digit === null) continue;
        context.fillStyle = heightColor(digit, this.limits.maxHeight);
        context.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
        if (cell >= 16) {
          context.fillStyle = digit > this.limits.maxHeight / 2 ? EDITOR_COLORS.digitOnLight : EDITOR_COLORS.digitOnDark;
          context.fillText(String(digit), at(col), at(row) + 1);
        }
      }
    }

    // The things. A zone is drawn as big as the floor it needs flat.
    const level = draft.level;
    const disc = (point, radius, color, letter, textColor = EDITOR_COLORS.digitOnLight) => {
      context.globalAlpha = 0.35;
      context.fillStyle = color;
      context.beginPath();
      context.arc(at(point.col), at(point.row), (radius / CELL) * cell, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(at(point.col), at(point.row), cell * 0.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = textColor;
      context.fillText(letter, at(point.col), at(point.row) + 1);
    };
    disc(level.goal, ZONE_RADIUS, ZONE_COLORS.goal, "G");
    (level.checkpoints || []).forEach((checkpoint, index) => disc(checkpoint, ZONE_RADIUS, ZONE_COLORS.checkpoint, String(index + 1)));
    (level.slime || []).forEach((puddle) => disc(puddle, puddle.radius, ZONE_COLORS.slime, "~"));
    (level.enemies || []).forEach((enemy) => disc(enemy, 0, EDITOR_COLORS.enemy, "E"));
    disc(level.start, 0, EDITOR_COLORS.start, "S");
    context.lineWidth = 2;
    context.strokeStyle = EDITOR_COLORS.mover;
    for (const mover of level.movers || []) {
      const box = (point) => context.strokeRect(at(point.col) - (mover.size.x / CELL / 2) * cell, at(point.row) - (mover.size.z / CELL / 2) * cell, (mover.size.x / CELL) * cell, (mover.size.z / CELL) * cell);
      if (mover.kind === "piston") {
        box(mover.at);
        context.fillStyle = EDITOR_COLORS.mover;
        context.fillText("P", at(mover.at.col), at(mover.at.row) + 1);
      } else {
        box(mover.from);
        box(mover.to);
        context.beginPath();
        context.moveTo(at(mover.from.col), at(mover.from.row));
        context.lineTo(at(mover.to.col), at(mover.to.row));
        context.stroke();
      }
    }

    // The problems, ringed where they are, and the thing that is picked.
    for (const found of this.problems) {
      if (found.col === undefined) continue;
      context.strokeStyle = EDITOR_COLORS[found.severity];
      context.beginPath();
      context.arc(at(found.col), at(found.row), cell * 0.7, 0, Math.PI * 2);
      context.stroke();
    }
    if (draft.selected && draft.selectedThing) {
      const thing = draft.selectedThing;
      const marks = thing.kind === "platform" ? [thing.from, thing.to] : [thing.kind === "piston" ? thing.at : thing];
      context.strokeStyle = EDITOR_COLORS.selected;
      context.lineWidth = 3;
      for (const point of marks) context.strokeRect(at(point.col) - cell * 0.6, at(point.row) - cell * 0.6, cell * 1.2, cell * 1.2);
    }

    // The box being dragged by the fill tool.
    if (this.preview) {
      const { from, to } = this.preview;
      context.strokeStyle = EDITOR_COLORS.selected;
      context.lineWidth = 2;
      context.strokeRect(Math.min(from.col, to.col) * cell, Math.min(from.row, to.row) * cell, (Math.abs(to.col - from.col) + 1) * cell, (Math.abs(to.row - from.row) + 1) * cell);
    }
  }

  // The numbers of the thing that is picked, as boxes, with buttons for what can be done to it.
  _showThing() {
    const { doc, draft } = this;
    this.thingFields.replaceChildren();
    this.thingButtons.replaceChildren();
    if (!draft.selected || !draft.selectedThing) {
      this.thingTitle.textContent = "Nothing picked";
      return;
    }
    this.thingTitle.textContent = thingName(draft.level, draft.selected);
    for (const field of draft.fields) {
      const input = element(doc, "input", { type: "number", min: field.min, max: field.max, step: field.step, value: getField(draft.selectedThing, field.path) });
      input.addEventListener("change", () => this._edit(() => draft.setField(field.path, input.value)));
      this.thingFields.appendChild(element(doc, "label", { className: "editor-field" }, [element(doc, "span", { textContent: field.label }), input]));
    }
    if (["goal", "checkpoint", "slime"].includes(draft.selected.kind) || (draft.selected.kind === "mover" && draft.selectedThing.kind === "piston")) {
      this.thingButtons.appendChild(this._button("Flatten floor", () => this._flatten(), "quiet"));
    }
    if (draft.selected.kind !== "start" && draft.selected.kind !== "goal") this.thingButtons.appendChild(this._button("Remove", () => this._remove(), "quiet"));
  }

  // The problems, worst first. Clicking one picks the thing it is about.
  _showProblems() {
    const { doc, draft } = this;
    this.problemList.replaceChildren();
    const errors = this.problems.filter((found) => found.severity === "error").length;
    this.problemTitle.textContent = this.problems.length === 0 ? "No problems" : `${errors ? `${errors} error${errors === 1 ? "" : "s"}, ` : ""}${this.problems.length - errors} warning${this.problems.length - errors === 1 ? "" : "s"}`;
    for (const found of this.problems) {
      const item = element(doc, "li", { className: found.severity, textContent: found.message });
      item.addEventListener("click", () => {
        if (found.col === undefined) return;
        draft.select(draft.thingAt({ col: found.col, row: found.row }));
        this.refresh();
      });
      this.problemList.appendChild(item);
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_COLORS, element, Editor };
} else {
  Object.assign(window, { EDITOR_COLORS, element, Editor });
}
