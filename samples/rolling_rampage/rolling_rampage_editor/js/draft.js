// A draft: the level being edited, and everything the editor does to it. The level is the same plain data as the levels
// of the game (rows of heights, a start, a goal, the things), so a draft can be played as it is, and a finished one pasted
// into the game's list. The draft can paint heights, fill and ramp, change its size and its things, check itself, and go
// back and forward through what was done. It knows nothing about the page. See ../tests/draft.tests.js.
class LevelDraft {
  constructor(level = blankLevel(), limits = EDITOR_LIMITS) {
    this.limits = limits;
    this.level = cloneLevel(level);
    this.past = []; // earlier versions of the level, as text, the latest last
    this.future = []; // versions that were undone, so they can be done again
    this.selected = null; // the ref of the thing being edited
    this.saved = JSON.stringify(this.level); // the level as it was when it was last saved, to tell if it has changed
  }

  get cols() {
    return this.level.rows[0].length;
  }

  get rows() {
    return this.level.rows.length;
  }

  // Whether the draft has changed since it was made or last saved.
  get changed() {
    return JSON.stringify(this.level) !== this.saved;
  }

  markSaved() {
    this.saved = JSON.stringify(this.level);
  }

  // The level to play, save or export: a copy, so nothing done to it changes the draft.
  toLevel() {
    return cloneLevel(this.level);
  }

  // Undo. Call begin() before each thing the person does (not each step of it: a drag across the floor is one thing), and
  // undo() takes the level back to how it was.
  begin() {
    this.past.push(JSON.stringify(this.level));
    if (this.past.length > this.limits.undoDepth) this.past.shift();
    this.future = [];
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  _swap(from, to) {
    if (from.length === 0) return false;
    to.push(JSON.stringify(this.level));
    this.level = JSON.parse(from.pop());
    this.selected = null; // what it pointed to may not be there now
    return true;
  }

  undo() {
    return this._swap(this.past, this.future);
  }

  redo() {
    return this._swap(this.future, this.past);
  }

  // The floor. A corner's height is a digit, or null for a hole.
  digitAt(col, row) {
    const line = this.level.rows[row];
    if (line === undefined || col < 0 || col >= line.length) return null;
    return line[col] === "." ? null : Number(line[col]);
  }

  // Sets one corner to a height (0 up to the limit), or to a hole with null. Says whether it changed anything.
  setDigit(col, row, digit) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    if (digit !== null && !(Number.isInteger(digit) && digit >= 0 && digit <= this.limits.maxHeight)) return false;
    const text = digit === null ? "." : String(digit);
    const line = this.level.rows[row];
    if (line[col] === text) return false;
    this.level.rows[row] = line.slice(0, col) + text + line.slice(col + 1);
    return true;
  }

  // Fills a rectangle of corners, from one corner to the other. The heights run from `from` at the corner the drag began to
  // `to` at the other along the longer side, so a drag with two different heights is a ramp, and with the same one (or no
  // `to`) is flat. A `from` of null makes holes.
  fill(col0, row0, col1, row1, from, to = from) {
    const acrossFirst = Math.abs(col1 - col0) >= Math.abs(row1 - row0);
    const span = (acrossFirst ? col1 - col0 : row1 - row0) || 1;
    for (let row = Math.min(row0, row1); row <= Math.max(row0, row1); row++) {
      for (let col = Math.min(col0, col1); col <= Math.max(col0, col1); col++) {
        const share = ((acrossFirst ? col - col0 : row - row0) / span);
        this.setDigit(col, row, from === null ? null : Math.round(from + (to - from) * share));
      }
    }
  }

  // Changes the size of the level, held to the limits. What is cut off is lost, and what is new is holes. Says whether the
  // size changed.
  resize(cols, rows) {
    const newCols = clampInt(cols, this.limits.minCols, this.limits.maxCols);
    const newRows = clampInt(rows, this.limits.minRows, this.limits.maxRows);
    if (newCols === this.cols && newRows === this.rows) return false;
    const lines = this.level.rows.slice(0, newRows).map((line) => line.slice(0, newCols).padEnd(newCols, "."));
    while (lines.length < newRows) lines.push(".".repeat(newCols));
    this.level.rows = lines;
    return true;
  }

  setName(name) {
    this.level.name = cleanLevelName(name, this.limits);
  }

  setTime(time) {
    this.level.time = clampInt(time, this.limits.minTime, this.limits.maxTime);
  }

  // The things. These are the functions of things.js, working on the draft's level and remembering which is selected.
  select(ref) {
    this.selected = ref;
  }

  get selectedThing() {
    return this.selected ? thingOf(this.level, this.selected) : undefined;
  }

  // Whether the level has room for another thing of the kind a tool places.
  canPlace(tool) {
    return hasRoom(this.level, tool, this.limits);
  }

  // Places a thing (a tool's name: "goal", "checkpoint", "piston"...) and selects it. Returns its ref, or null.
  place(tool, point) {
    const ref = placeThing(this.level, tool, point, this.limits);
    if (ref) this.selected = ref;
    return ref;
  }

  thingAt(point) {
    return thingAt(this.level, point);
  }

  // Moves the selected thing.
  moveSelected(point) {
    if (this.selected) moveThing(this.level, this.selected, point);
  }

  // Takes the selected thing out (not the start or goal). Says whether it did.
  removeSelected() {
    if (!this.selected || !removeThing(this.level, this.selected)) return false;
    this.selected = null;
    return true;
  }

  get fields() {
    return this.selected ? thingFields(this.level, this.selected, this.limits) : [];
  }

  setField(path, value) {
    return this.selected ? setThingField(this.level, this.selected, path, value, this.limits) : null;
  }

  flattenSelected() {
    return this.selected ? flattenFloor(this.level, this.selected, this.limits) : -1;
  }

  // Everything wrong with the level, as checkLevel says.
  get problems() {
    return checkLevel(this.level, this.limits);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LevelDraft };
} else {
  window.LevelDraft = LevelDraft;
}
