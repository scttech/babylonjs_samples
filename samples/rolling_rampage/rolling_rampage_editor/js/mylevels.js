// My levels: the levels a person has made, kept in the browser like the leaderboard, and turned into text and back so they can be
// shared. A level that comes from storage, or from text someone pasted, is just data, and could be anything, so it is never
// trusted: cleanLevel builds a new level from it, with every number held to a range, and every list to its limit, and
// leaves behind anything it doesn't know. See ../tests/mylevels.tests.js.
const MY_LEVELS_KEY = "rollingRampage.myLevels";

// What a mover that has some numbers missing is given.
const MOVER_BOUNDS = {
  size: { min: 1, max: 10 },
  period: { min: 1, max: 60 },
  rise: { min: 0, max: 5 },
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// A level built from `raw`, which can be anything, with the same fields as the levels of the game. Returns null if there is
// nothing to make a level from (no rows). Floor that has anything but a dot or a digit in it becomes holes, and a digit that
// is too high becomes the highest. The result has a start, a goal and a time that are fine, whatever came in, so the editor
// can always open it, but it may still be a level with problems (see checkLevel).
function cleanLevel(raw, limits = EDITOR_LIMITS) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.rows)) return null;
  const lines = raw.rows.filter((row) => typeof row === "string").slice(0, limits.maxRows);
  if (lines.length === 0) return null;
  const cols = clampInt(Math.max(...lines.map((line) => line.length)), limits.minCols, limits.maxCols);
  const corner = (ch) => (/^[0-9]$/.test(ch) ? String(Math.min(Number(ch), limits.maxHeight)) : ".");
  const rows = lines.map((line) => [...line.slice(0, cols)].map(corner).join("").padEnd(cols, "."));
  while (rows.length < limits.minRows) rows.push(".".repeat(cols));

  const point = (p) => ({ col: clampStep(p.col, 0, cols - 1, 0.01), row: clampStep(p.row, 0, rows.length - 1, 0.01) });
  const middle = Math.floor(rows.length / 2);
  const list = (name, make) => (Array.isArray(raw[name]) ? raw[name].slice(0, limits.maxObjects).map(make).filter(Boolean) : []);
  const bounded = (value, fallback, { min, max }) => clampStep(isNumber(value) ? value : fallback, min, max, 0.01);

  const mover = (m) => {
    if (!m || typeof m !== "object") return null;
    const common = {
      height: clampInt(isNumber(m.height) ? m.height : 4, 0, limits.maxHeight),
      size: { x: bounded(m.size && m.size.x, THING_DEFAULTS.pistonSize, MOVER_BOUNDS.size), z: bounded(m.size && m.size.z, THING_DEFAULTS.pistonSize, MOVER_BOUNDS.size) },
      period: bounded(m.period, THING_DEFAULTS.pistonPeriod, MOVER_BOUNDS.period),
    };
    const phase = isNumber(m.phase) ? { phase: clampStep(m.phase, 0, 0.95, 0.01) } : {};
    if (m.kind === "piston" && isPoint(m.at)) {
      return { kind: "piston", at: point(m.at), ...common, rise: bounded(m.rise, THING_DEFAULTS.pistonRise, MOVER_BOUNDS.rise), ...phase };
    }
    if (m.kind === "platform" && isPoint(m.from) && isPoint(m.to)) {
      const [from, to] = [point(m.from), point(m.to)];
      if (from.col === to.col && from.row === to.row) return null;
      return { kind: "platform", from, to, ...common, ...phase };
    }
    return null;
  };

  const level = {
    name: cleanLevelName(raw.name, limits),
    start: isPoint(raw.start) ? point(raw.start) : { col: 2, row: middle },
    time: clampInt(isNumber(raw.time) ? raw.time : limits.defaultTime, limits.minTime, limits.maxTime),
    goal: isPoint(raw.goal) ? point(raw.goal) : { col: cols - 3, row: middle },
    checkpoints: list("checkpoints", (p) => (isPoint(p) ? { ...point(p), bonus: clampInt(isNumber(p.bonus) ? p.bonus : limits.defaultBonus, 0, limits.maxTime) } : null)),
  };
  const enemies = list("enemies", (p) => (isPoint(p) ? point(p) : null));
  const slime = list("slime", (p) => (isPoint(p) ? { ...point(p), radius: bounded(p.radius, THING_DEFAULTS.slimeRadius, { min: 0.5, max: 4 }) } : null));
  const movers = list("movers", mover);
  if (enemies.length) level.enemies = enemies;
  if (slime.length) level.slime = slime;
  if (movers.length) level.movers = movers;
  level.rows = rows;
  return level;
}

// A level as text that can be kept or sent. It is the very same shape as an entry of LEVELS in level.js (JSON is also
// JavaScript), so a level worth keeping can be pasted straight into the game.
function levelToText(level) {
  return JSON.stringify(level, null, 2);
}

// The level in some text, cleaned, or null if the text is not a level.
function levelFromText(text, limits = EDITOR_LIMITS) {
  try {
    return cleanLevel(JSON.parse(String(text)), limits);
  } catch (error) {
    return null;
  }
}

class MyLevels {
  constructor({ storage = browserStorage(), key = MY_LEVELS_KEY, limits = EDITOR_LIMITS } = {}) {
    this.storage = storage;
    this.key = key;
    this.limits = limits;
    this.levels = [];
    this.load();
  }

  // Takes what was saved. Whatever isn't a level is dropped, and what is kept is cleaned, so a damaged or hand-edited save
  // can't break the game.
  load() {
    const saved = readJson(this.storage, this.key);
    const list = Array.isArray(saved) ? saved : [];
    this.levels = list.map((level) => cleanLevel(level, this.limits)).filter(Boolean).slice(0, this.limits.maxLevels);
  }

  // Remembers the levels. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, this.levels);
  }

  get full() {
    return this.levels.length >= this.limits.maxLevels;
  }

  // Adds a level, and saves. Returns its place in the list, or -1 if the list is full or it is not a level.
  add(level) {
    const clean = cleanLevel(level, this.limits);
    if (!clean || this.full) return -1;
    this.levels.push(clean);
    this.save();
    return this.levels.length - 1;
  }

  // Puts a level in the place of another, and saves. Says whether it did.
  replace(index, level) {
    const clean = cleanLevel(level, this.limits);
    if (!clean || !this.levels[index]) return false;
    this.levels[index] = clean;
    this.save();
    return true;
  }

  // Takes a level out, and saves. Says whether it did.
  remove(index) {
    if (!this.levels[index]) return false;
    this.levels.splice(index, 1);
    this.save();
    return true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MY_LEVELS_KEY, cleanLevel, levelToText, levelFromText, MyLevels };
} else {
  Object.assign(window, { MY_LEVELS_KEY, cleanLevel, levelToText, levelFromText, MyLevels });
}
