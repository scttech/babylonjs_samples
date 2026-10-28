// The things in a level that aren't floor: the start, the goal, checkpoints, enemies, puddles of slime, pistons and
// platforms. Each is a few numbers in the level's data, and these functions add, find, move, change and remove them. They
// work on a plain level object and know nothing about the page, so they are easy to test. A thing is pointed to by a
// *ref*, { kind, index }, where kind is "start", "goal", "checkpoint", "enemy", "slime" or "mover". See ../tests/things.tests.js.

// The list in a level that each kind of thing lives in. The start and the goal are one each, and are not in a list.
const THING_LISTS = { checkpoint: "checkpoints", enemy: "enemies", slime: "slime", mover: "movers" };

// What a new thing starts as. They are all changed in the editor afterwards, so these are only a good first try.
const THING_DEFAULTS = {
  slimeRadius: 1.6,
  pistonSize: 2.4,
  pistonRise: 1.2,
  pistonPeriod: 3.5,
  platformSize: { x: 5, z: 6 },
  platformPeriod: 12,
  platformSpan: 3.5, // how far a new platform goes, in corners
  hitReach: 0.8, // how near a click has to be to a thing to pick it, in corners
};

// Things are placed on a grid of half a corner (a platform's ends, on a quarter), so they line up the way the levels of the
// game do.
const THING_SNAP = 0.5;
const PLATFORM_SNAP = 0.25;

function snapTo(value, step) {
  return Math.round(value / step) * step;
}

function snapPoint(point, step = THING_SNAP) {
  return { col: snapTo(point.col, step), row: snapTo(point.row, step) };
}

// The things of one kind, as a list (an empty one if the level has none).
function thingList(level, kind) {
  return level[THING_LISTS[kind]] || [];
}

// The thing a ref points to, or undefined.
function thingOf(level, ref) {
  return ref.kind === "start" || ref.kind === "goal" ? level[ref.kind] : thingList(level, ref.kind)[ref.index];
}

// Every thing in the level, as refs, start and goal first.
function allThings(level) {
  const refs = [{ kind: "start", index: 0 }, { kind: "goal", index: 0 }];
  for (const kind of Object.keys(THING_LISTS)) thingList(level, kind).forEach((_, index) => refs.push({ kind, index }));
  return refs;
}

// The height (a digit) of the floor at a place, or if there is a hole there, of the first floor to the left of it. A level
// with no floor at all in that row gives a middling height.
function floorDigit(level, col, row, limits = EDITOR_LIMITS) {
  const line = level.rows[clampInt(row, 0, level.rows.length - 1)];
  for (let at = clampInt(col, 0, line.length - 1); at >= 0; at--) {
    if (line[at] !== ".") return Number(line[at]);
  }
  return Math.min(4, limits.maxHeight);
}

// A new thing of the kind a tool places, at `at`. (A piston or a platform is a mover: a "piston" tool makes a piston.)
function newThing(tool, level, at, limits) {
  const height = floorDigit(level, at.col, at.row, limits);
  if (tool === "checkpoint") return { ...at, bonus: limits.defaultBonus };
  if (tool === "slime") return { ...at, radius: THING_DEFAULTS.slimeRadius };
  if (tool === "piston") {
    const size = { x: THING_DEFAULTS.pistonSize, z: THING_DEFAULTS.pistonSize };
    return { kind: "piston", at, height, size, rise: THING_DEFAULTS.pistonRise, period: THING_DEFAULTS.pistonPeriod };
  }
  if (tool === "platform") {
    const from = snapPoint(at, PLATFORM_SNAP);
    const to = { col: from.col + THING_DEFAULTS.platformSpan, row: from.row };
    return { kind: "platform", from, to, height, size: { ...THING_DEFAULTS.platformSize }, period: THING_DEFAULTS.platformPeriod };
  }
  return { ...at }; // an enemy
}

// Whether there is room for another thing of the kind a tool places: the start and the goal are always moved, and a list is
// full at the limit.
function hasRoom(level, tool, limits = EDITOR_LIMITS) {
  if (tool === "start" || tool === "goal") return true;
  const kind = tool === "piston" || tool === "platform" ? "mover" : tool;
  return Boolean(THING_LISTS[kind]) && thingList(level, kind).length < limits.maxObjects;
}

// Puts a thing in the level, at a place in corners (snapped). The start and the goal are moved, since there is only one of
// each. Returns the ref of the thing, or null if the level already has as many of that kind as it is allowed.
function placeThing(level, tool, point, limits = EDITOR_LIMITS) {
  const at = snapPoint(point);
  if (tool === "start" || tool === "goal") {
    level[tool] = at;
    return { kind: tool, index: 0 };
  }
  const kind = tool === "piston" || tool === "platform" ? "mover" : tool;
  if (!THING_LISTS[kind]) return null;
  const list = (level[THING_LISTS[kind]] = thingList(level, kind));
  if (list.length >= limits.maxObjects) return null;
  list.push(newThing(tool, level, at, limits));
  return { kind, index: list.length - 1 };
}

// How far a place is from a thing, in corners. A platform is the whole of its way, so it is the distance to that line.
function thingDistance(level, ref, point) {
  const thing = thingOf(level, ref);
  if (ref.kind === "mover" && thing.kind === "platform") {
    const dx = thing.to.col - thing.from.col;
    const dy = thing.to.row - thing.from.row;
    const along = Math.max(0, Math.min(1, ((point.col - thing.from.col) * dx + (point.row - thing.from.row) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.col - (thing.from.col + dx * along), point.row - (thing.from.row + dy * along));
  }
  const centre = ref.kind === "mover" ? thing.at : thing;
  return Math.hypot(point.col - centre.col, point.row - centre.row);
}

// The thing nearest a place, if any is within `reach` corners of it. Where two are as near, the one made later wins.
function thingAt(level, point, reach = THING_DEFAULTS.hitReach) {
  let best = null;
  let bestDistance = reach;
  for (const ref of allThings(level)) {
    const distance = thingDistance(level, ref, point);
    if (distance <= bestDistance) {
      best = ref;
      bestDistance = distance;
    }
  }
  return best;
}

// Takes a thing out of the level. The start and the goal can't be taken out: a level needs both. Says whether it did.
function removeThing(level, ref) {
  if (ref.kind === "start" || ref.kind === "goal") return false;
  const list = thingList(level, ref.kind);
  if (!list[ref.index]) return false;
  list.splice(ref.index, 1);
  return true;
}

// Moves a thing so that its place is `point` (snapped). A platform keeps its length and direction: its first end goes to the
// place, and the other end goes with it.
function moveThing(level, ref, point) {
  const thing = thingOf(level, ref);
  if (!thing) return;
  if (ref.kind === "mover" && thing.kind === "platform") {
    const from = snapPoint(point, PLATFORM_SNAP);
    thing.to = { col: thing.to.col + from.col - thing.from.col, row: thing.to.row + from.row - thing.from.row };
    thing.from = from;
    return;
  }
  const at = snapPoint(point);
  const centre = ref.kind === "mover" ? thing.at : thing;
  centre.col = at.col;
  centre.row = at.row;
}

// What a thing is called, for a heading: "Checkpoint 2", "Piston 1", "Goal".
function thingName(level, ref) {
  const thing = thingOf(level, ref);
  if (!thing) return "";
  const label = ref.kind === "mover" ? thing.kind : ref.kind === "slime" ? "slime puddle" : ref.kind;
  const text = label[0].toUpperCase() + label.slice(1);
  return ref.kind === "start" || ref.kind === "goal" ? text : `${text} ${ref.index + 1}`;
}

// The numbers of a thing that can be changed, as rows: where it is, and what it does. A row is { path, label, min, max, step },
// and its path says where in the thing the number is ("size.x" is the x of its size). Like the rows of the developer panel, a
// new number is a new line.
function thingFields(level, ref, limits = EDITOR_LIMITS) {
  const thing = thingOf(level, ref);
  if (!thing) return [];
  const cols = level.rows[0].length - 1;
  const rows = level.rows.length - 1;
  const place = (path, label, step = THING_SNAP) => [
    { path: `${path}col`, label: `${label}across`, min: 0, max: cols, step },
    { path: `${path}row`, label: `${label}down`, min: 0, max: rows, step },
  ];
  const height = { path: "height", label: "height", min: 0, max: limits.maxHeight, step: 1 };
  const phase = { path: "phase", label: "phase", min: 0, max: 0.95, step: 0.05 };
  if (ref.kind === "checkpoint") return [...place("", ""), { path: "bonus", label: "bonus (s)", min: 0, max: limits.maxTime / 4, step: 1 }];
  if (ref.kind === "slime") return [...place("", ""), { path: "radius", label: "radius", min: 0.5, max: 4, step: 0.1 }];
  if (ref.kind !== "mover") return place("", "");
  if (thing.kind === "piston") {
    return [
      ...place("at.", ""),
      height,
      { path: "rise", label: "rise", min: 0.2, max: 3, step: 0.1 },
      { path: "period", label: "period (s)", min: 1, max: 20, step: 0.1 },
      phase,
      { path: "size.x", label: "width", min: 1, max: 6, step: 0.1 },
      { path: "size.z", label: "depth", min: 1, max: 6, step: 0.1 },
    ];
  }
  return [
    ...place("from.", "start ", PLATFORM_SNAP),
    ...place("to.", "end ", PLATFORM_SNAP),
    height,
    { path: "period", label: "period (s)", min: 2, max: 40, step: 1 },
    phase,
    { path: "size.x", label: "width", min: 1, max: 10, step: 0.5 },
    { path: "size.z", label: "depth", min: 1, max: 10, step: 0.5 },
  ];
}

// The number at a path in a thing: getField(piston, "size.x").
function getField(thing, path) {
  return path.split(".").reduce((value, key) => (value === undefined ? undefined : value[key]), thing);
}

// Sets the number at a path in a thing (the object in front of the last key has to be there already).
function setField(thing, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((object, key) => object[key], thing)[last] = value;
}

// Changes one number of a thing, held to the range of its row and to its step. Returns the number it was set to, or null if
// the thing has no such number.
function setThingField(level, ref, path, value, limits = EDITOR_LIMITS) {
  const field = thingFields(level, ref, limits).find((row) => row.path === path);
  if (!field) return null;
  const number = clampStep(value, field.min, field.max, field.step);
  setField(thingOf(level, ref), path, number);
  return number;
}

// Makes the floor flat under a goal, a checkpoint, a puddle of slime or a piston, as far as they reach, because they all
// need it. The height is the one at the middle (a piston's own height, for a piston), and any holes there are filled.
// Returns how many corners it set, or -1 for a thing that needs no flat floor.
function flattenFloor(level, ref, limits = EDITOR_LIMITS) {
  const thing = thingOf(level, ref);
  if (!thing || !["goal", "checkpoint", "slime", "mover"].includes(ref.kind)) return -1;
  const isPiston = ref.kind === "mover";
  if (isPiston && thing.kind !== "piston") return -1;
  const centre = isPiston ? thing.at : thing;
  const reach = isPiston
    ? { col: thing.size.x / 2 / CELL, row: thing.size.z / 2 / CELL }
    : { col: (zoneRadius(thing) + ZONE_BORDER) / CELL, row: (zoneRadius(thing) + ZONE_BORDER) / CELL };
  const digit = isPiston ? thing.height : floorDigit(level, centre.col, centre.row, limits);
  let changed = 0;
  const rows = level.rows.map((line) => [...line]);
  for (let row = Math.max(0, Math.floor(centre.row - reach.row)); row <= Math.min(rows.length - 1, Math.floor(centre.row + reach.row) + 1); row++) {
    for (let col = Math.max(0, Math.floor(centre.col - reach.col)); col <= Math.min(rows[0].length - 1, Math.floor(centre.col + reach.col) + 1); col++) {
      if (rows[row][col] !== String(digit)) changed++;
      rows[row][col] = String(digit);
    }
  }
  level.rows = rows.map((line) => line.join(""));
  return changed;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { THING_LISTS, THING_DEFAULTS, THING_SNAP, PLATFORM_SNAP, snapTo, snapPoint, thingList, thingOf, allThings, floorDigit, hasRoom, placeThing, thingDistance, thingAt, removeThing, moveThing, thingName, thingFields, getField, setField, setThingField, flattenFloor };
} else {
  Object.assign(window, { THING_LISTS, THING_DEFAULTS, THING_SNAP, PLATFORM_SNAP, snapTo, snapPoint, thingList, thingOf, allThings, floorDigit, hasRoom, placeThing, thingDistance, thingAt, removeThing, moveThing, thingName, thingFields, getField, setField, setThingField, flattenFloor });
}
