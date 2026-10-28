// The limits of the level editor, all in one place. Every part of the editor (the checks, the drawing, the saving)
// reads them from here and none has a number of its own, so changing a limit is changing one line. The tests read
// them from here too, so they still pass. See ../tests/limits.tests.js.
const EDITOR_LIMITS = {
  maxCols: 60, // the widest a level can be, in corners
  maxRows: 30, // and the deepest
  minCols: 6, // and the smallest
  minRows: 6,
  defaultCols: 20, // the size of a new level
  defaultRows: 12,
  maxHeight: 9, // the highest digit of a height. A height is one character of a row, so this can't be more than 9
  maxObjects: 20, // the most of each kind of thing in a level: checkpoints, enemies, puddles of slime, movers
  maxLevels: 20, // the most levels kept in My levels
  maxName: 24, // the longest name of a level, in characters
  minTime: 10, // the shortest and longest a level's clock can be, in seconds
  maxTime: 600,
  defaultTime: 90,
  defaultBonus: 10, // the seconds a new checkpoint gives
  undoDepth: 60, // how many steps back Undo can go
};

const DEFAULT_LEVEL_NAME = "My level";

// A whole number between `low` and `high`: `value` rounded, and then held to the range. Something that isn't a
// number at all is `low`.
function clampInt(value, low, high) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return low;
  return Math.min(high, Math.max(low, number));
}

// A number between `low` and `high`, to the nearest `step` (a step of 0.5 gives 1, 1.5, 2...). Not a number: `low`.
function clampStep(value, low, high, step) {
  const number = Number(value);
  if (!Number.isFinite(number)) return low;
  const snapped = Math.round(number / step) * step;
  return Math.min(high, Math.max(low, Number(snapped.toFixed(6))));
}

// Makes a name fit to show: spaces trimmed and squeezed to one, no longer than the limit, and a plain name if
// nothing is left. (Like cleanName, but the name of a level is longer than the name of a player.)
function cleanLevelName(name, limits = EDITOR_LIMITS) {
  const text = String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, limits.maxName).trim();
  return text || DEFAULT_LEVEL_NAME;
}

// A copy of a level that shares nothing with it, so changing one never changes the other.
function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

// A new level to start from: flat floor all over, the start on the left and the goal on the right.
function blankLevel(limits = EDITOR_LIMITS) {
  const height = Math.min(2, limits.maxHeight);
  const middle = Math.floor(limits.defaultRows / 2);
  return {
    name: DEFAULT_LEVEL_NAME,
    start: { col: 2, row: middle },
    time: limits.defaultTime,
    goal: { col: limits.defaultCols - 3, row: middle },
    checkpoints: [],
    rows: Array.from({ length: limits.defaultRows }, () => String(height).repeat(limits.defaultCols)),
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_LIMITS, DEFAULT_LEVEL_NAME, clampInt, clampStep, cleanLevelName, cloneLevel, blankLevel };
} else {
  Object.assign(window, { EDITOR_LIMITS, DEFAULT_LEVEL_NAME, clampInt, clampStep, cleanLevelName, cloneLevel, blankLevel });
}
