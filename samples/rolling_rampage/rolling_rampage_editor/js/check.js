// Checking a level: is it a level at all, and is it a fair one? The rules are the ones the tests of the earlier tutorials
// check for the ten levels of the game (zones on flat floor, pistons on flat floor, platforms that meet the floor, a goal
// that can be reached, a clock that is long enough), now as real code, so the editor can check a level while it is drawn.
// A problem is { severity, message, col, row }. An *error* is something that stops a level from being played at all, and a
// *warning* is something that makes it unfair or odd, but it can still be tried. See ../tests/check.tests.js.

const REACH_STEP = 2 * HEIGHT_STEP; // the highest step a marble can be counted on to climb: two digits
const SPEED_FOR_TIME = 6; // the slowest a marble can be expected to cover the way to the goal, in units a second
const ENEMY_DISTANCE = 8; // how far from the start an enemy has to be, so the first thing isn't a collision

function problem(severity, message, point) {
  return point ? { severity, message, col: point.col, row: point.row } : { severity, message };
}

function isPoint(point) {
  return Boolean(point) && Number.isFinite(point.col) && Number.isFinite(point.row);
}

function isPositive(number) {
  return Number.isFinite(number) && number > 0;
}

// Whether a mover has all the numbers it needs, and sensible ones. A platform with the same two ends, or a period of 0,
// would divide by nothing.
function isMover(mover, limits) {
  if (!mover || !isPositive(mover.size && mover.size.x) || !isPositive(mover.size && mover.size.z)) return false;
  if (!isPositive(mover.period) || !(mover.height >= 0 && mover.height <= limits.maxHeight)) return false;
  if (mover.phase !== undefined && !(mover.phase >= 0 && mover.phase < 1)) return false;
  if (mover.kind === "piston") return isPoint(mover.at) && Number.isFinite(mover.rise) && mover.rise >= 0;
  if (mover.kind === "platform") return isPoint(mover.from) && isPoint(mover.to) && (mover.from.col !== mover.to.col || mover.from.row !== mover.to.row);
  return false;
}

// The problems with the *shape* of a level, which are all errors: the rows, the start and goal, the clock, and every thing
// in the level having the numbers it needs. If there are any, nothing else can be checked.
function shapeProblems(level, limits) {
  const rows = level && level.rows;
  if (!Array.isArray(rows) || rows.length === 0 || !rows.every((row) => typeof row === "string")) {
    return [problem("error", "The level has no rows of floor")];
  }
  const found = [];
  const error = (message) => found.push(problem("error", message));
  const cols = rows[0].length;
  if (!rows.every((row) => row.length === cols)) error("The rows are not all the same length");
  if (cols < limits.minCols || cols > limits.maxCols) error(`A level is ${limits.minCols} to ${limits.maxCols} corners across, not ${cols}`);
  if (rows.length < limits.minRows || rows.length > limits.maxRows) error(`A level is ${limits.minRows} to ${limits.maxRows} corners down, not ${rows.length}`);
  if (!rows.every((row) => new RegExp(`^[.0-${limits.maxHeight}]*$`).test(row))) error(`A height is a dot, or a digit up to ${limits.maxHeight}`);
  if (!isPoint(level.start)) error("The level has no start");
  if (!isPoint(level.goal)) error("The level has no goal");
  if (!(level.time >= limits.minTime && level.time <= limits.maxTime)) error(`The time is ${limits.minTime} to ${limits.maxTime} seconds`);
  const lists = ["checkpoints", "enemies", "slime", "movers"];
  if (!lists.every((name) => level[name] === undefined || (Array.isArray(level[name]) && level[name].length <= limits.maxObjects))) {
    error(`A level has at most ${limits.maxObjects} of each thing`);
  }
  const list = (name) => (Array.isArray(level[name]) ? level[name] : []);
  if (![...list("checkpoints"), ...list("enemies"), ...list("slime")].every(isPoint)) error("A checkpoint, enemy or puddle has no place");
  if (!list("slime").every((puddle) => isPositive(puddle.radius))) error("A puddle of slime has no size");
  if (!list("movers").every((mover) => isMover(mover, limits))) error("A piston or platform has numbers that don't work");
  return found;
}

// Every corner a marble can get to from the start: from a corner to the next one along a row or a column, if both have
// floor and the step between them is at most two digits (a marble can climb a step of one, and roll down more). A moving
// platform joins the floor at one end of its way to the floor at the other. Returns the set of "col,row" keys.
function reachableCorners(grid) {
  const key = (col, row) => `${col},${row}`;
  const bridges = new Map();
  for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
    const row = Math.round(mover.from.row);
    const left = key(Math.floor(Math.min(mover.from.col, mover.to.col) - 1), row);
    const right = key(Math.ceil(Math.max(mover.from.col, mover.to.col) + 1), row);
    bridges.set(left, right);
    bridges.set(right, left);
  }
  const seen = new Set();
  const todo = [[Math.round(grid.start.col), Math.round(grid.start.row)]];
  while (todo.length) {
    const [col, row] = todo.pop();
    if (seen.has(key(col, row))) continue;
    seen.add(key(col, row));
    const here = cornerHeight(grid, col, row);
    const next = [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]];
    const across = bridges.get(key(col, row));
    if (across) next.push(across.split(",").map(Number));
    for (const [c, r] of next) {
      const there = cornerHeight(grid, c, r);
      if (there === null || seen.has(key(c, r))) continue;
      if ((across && key(c, r) === across) || Math.abs(there - here) <= REACH_STEP + 1e-9) todo.push([c, r]);
    }
  }
  return seen;
}

// What a zone is called in a message: "the goal", "checkpoint 2", "slime puddle 1".
function zoneName(zone) {
  if (zone.kind === "goal") return "the goal";
  return `${zone.kind === "slime" ? "slime puddle" : "checkpoint"} ${zone.index + 1}`;
}

// The floor under the start and the goal. A marble can't start in the air, and a goal in the air can't be won.
function floorProblems(grid) {
  const found = [];
  for (const [name, point] of [["start", grid.start], ["goal", grid.goal]]) {
    if (heightAt(grid, point.col * CELL, point.row * CELL) === null) found.push(problem("error", `The ${name} is not on the floor`, point));
  }
  return found;
}

// Zones (the goal, the checkpoints, the slime) have to be on flat floor all the way round, clear of the start, and not
// on one another.
function zoneProblems(grid) {
  const found = [];
  const zones = levelZones(grid);
  for (const zone of zones) {
    const at = zonePosition(grid, zone);
    if (at.y === null) {
      if (zone.kind !== "goal") found.push(problem("warning", `${zoneName(zone)} is not on the floor`, zone));
      continue;
    }
    const reach = zoneRadius(zone) + ZONE_BORDER; // the border has to lie flat too
    const edges = [[reach, 0], [-reach, 0], [0, reach], [0, -reach]];
    const flat = edges.every(([dx, dz]) => {
      const height = heightAt(grid, at.x + dx, at.z + dz);
      return height !== null && Math.abs(height - at.y) < 1e-9;
    });
    if (!flat) found.push(problem("warning", `${zoneName(zone)} needs flat floor all round it`, zone));
  }
  const start = { x: grid.start.col * CELL, z: grid.start.row * CELL };
  const centre = (zone) => ({ x: zone.col * CELL, z: zone.row * CELL });
  for (const zone of zones) {
    const at = centre(zone);
    if (Math.hypot(at.x - start.x, at.z - start.z) <= (zoneRadius(zone) + ZONE_BORDER) * 2) found.push(problem("warning", `${zoneName(zone)} is too close to the start`, zone));
  }
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = centre(zones[i]);
      const b = centre(zones[j]);
      if (Math.hypot(a.x - b.x, a.z - b.z) <= zoneRadius(zones[i]) + zoneRadius(zones[j]) + ZONE_BORDER * 2) {
        found.push(problem("warning", `${zoneName(zones[i])} and ${zoneName(zones[j])} overlap`, zones[j]));
      }
    }
  }
  return found;
}

// The goal and every checkpoint have to be somewhere a marble can get to.
function reachProblems(grid) {
  const seen = reachableCorners(grid);
  const found = [];
  const zones = [{ kind: "goal", index: 0, ...grid.goal }, ...grid.checkpoints.map((checkpoint, index) => ({ kind: "checkpoint", index, ...checkpoint }))];
  for (const zone of zones) {
    if (!seen.has(`${Math.round(zone.col)},${Math.round(zone.row)}`)) found.push(problem("warning", `Nothing can reach ${zoneName(zone)} from the start`, zone));
  }
  return found;
}

// A piston stands on flat floor all across its box, at its own height. A platform meets the floor at each end, at its
// height, a little past it, so a marble can roll on and off, and has only a gap in the middle of its way.
function moverProblems(grid) {
  const found = [];
  grid.movers.forEach((mover, index) => {
    const top = mover.height * HEIGHT_STEP;
    const level = (x, z) => {
      const floor = heightAt(grid, x, z);
      return floor !== null && Math.abs(floor - top) < 1e-9;
    };
    if (mover.kind === "piston") {
      const x = mover.at.col * CELL;
      const z = mover.at.row * CELL;
      const flat = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dz]) => level(x + (dx * mover.size.x) / 2, z + (dz * mover.size.z) / 2));
      if (!flat) found.push(problem("warning", `Piston ${index + 1} needs flat floor under all of it, at its height`, mover.at));
      return;
    }
    const dx = (mover.to.col - mover.from.col) * CELL;
    const dz = (mover.to.row - mover.from.row) * CELL;
    const length = Math.hypot(dx, dz);
    const along = { x: dx / length, z: dz / length };
    const half = (Math.abs(along.x) * mover.size.x + Math.abs(along.z) * mover.size.z) / 2; // how far it reaches along its way
    const ends = [[mover.from, -1], [mover.to, 1]].every(([end, sign]) => level(end.col * CELL + sign * along.x * (half + 0.3), end.row * CELL + sign * along.z * (half + 0.3)));
    if (!ends) found.push(problem("warning", `Platform ${index + 1} needs floor at its height past each end`, mover.from));
    const middle = { x: ((mover.from.col + mover.to.col) / 2) * CELL, z: ((mover.from.row + mover.to.row) / 2) * CELL };
    if (heightAt(grid, middle.x, middle.z) !== null) found.push(problem("warning", `Platform ${index + 1} has floor in its way`, mover.from));
  });
  return found;
}

// Enemies start on the floor, and well away from the start.
function enemyProblems(grid) {
  const found = [];
  grid.enemies.forEach((enemy, index) => {
    if (heightAt(grid, enemy.col * CELL, enemy.row * CELL) === null) {
      found.push(problem("warning", `Enemy ${index + 1} is not on the floor`, enemy));
    } else if (Math.hypot((enemy.col - grid.start.col) * CELL, (enemy.row - grid.start.row) * CELL) <= ENEMY_DISTANCE) {
      found.push(problem("warning", `Enemy ${index + 1} is too close to the start`, enemy));
    }
  });
  return found;
}

// The clock gives at least a second for every SPEED_FOR_TIME units in a straight line to the goal, and a checkpoint is never
// worth more than a quarter of the time (or it would be worth going back and forth).
function clockProblems(grid) {
  const found = [];
  const distance = Math.hypot((grid.goal.col - grid.start.col) * CELL, (grid.goal.row - grid.start.row) * CELL);
  if (grid.time < distance / SPEED_FOR_TIME) found.push(problem("warning", `${grid.time} seconds is too little for ${Math.round(distance)} units: ${Math.ceil(distance / SPEED_FOR_TIME)} at least`));
  grid.checkpoints.forEach((checkpoint, index) => {
    if (!(checkpoint.bonus >= 0 && checkpoint.bonus <= grid.time / 4)) found.push(problem("warning", `Checkpoint ${index + 1} gives more than a quarter of the time`, checkpoint));
  });
  return found;
}

// Everything wrong with a level, errors first. An empty list is a level that is fine.
function checkLevel(level, limits = EDITOR_LIMITS) {
  const shape = shapeProblems(level, limits);
  if (shape.length) return shape;
  const grid = parseLevel(level);
  const floor = floorProblems(grid);
  if (floor.length) return [...floor, ...zoneProblems(grid), ...enemyProblems(grid), ...clockProblems(grid)];
  return [...zoneProblems(grid), ...reachProblems(grid), ...moverProblems(grid), ...enemyProblems(grid), ...clockProblems(grid)];
}

// Whether a level can be played: it has no errors (warnings don't stop it).
function canPlay(problems) {
  return !problems.some((found) => found.severity === "error");
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { REACH_STEP, SPEED_FOR_TIME, ENEMY_DISTANCE, shapeProblems, reachableCorners, checkLevel, canPlay };
} else {
  Object.assign(window, { REACH_STEP, SPEED_FOR_TIME, ENEMY_DISTANCE, shapeProblems, reachableCorners, checkLevel, canPlay });
}
