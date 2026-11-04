// The path an enemy walks: the road of a map, followed from its start to its goal, made into a smooth
// line in the world, and a way to ask where on that line something is after it has walked some distance.
// Nothing here draws anything. See ../tests/path.tests.js.

// The cells of the road, in the order they are walked, from the start to the goal. It is found by
// standing on the start and stepping on to a road cell that hasn't been stood on yet, until the goal.
// It is null if that never gets there.
function findPath(grid) {
  if (!grid.start || !grid.goal) return null;
  const path = [grid.start];
  const seen = new Set([`${grid.start.col},${grid.start.row}`]);
  let here = grid.start;
  while (here.col !== grid.goal.col || here.row !== grid.goal.row) {
    const next = [
      { col: here.col, row: here.row - 1 },
      { col: here.col + 1, row: here.row },
      { col: here.col, row: here.row + 1 },
      { col: here.col - 1, row: here.row },
    ].find((cell) => isRoad(grid, cell.col, cell.row) && !seen.has(`${cell.col},${cell.row}`));
    if (!next) return null;
    path.push(next);
    seen.add(`${next.col},${next.row}`);
    here = next;
  }
  return path;
}

// What is wrong with the road of a map, as a list of sentences. A road can have the right shape, a
// line with two ends, and still not be one road: it can have a loop, or a piece of road on its own.
function pathProblems(grid) {
  const path = findPath(grid);
  if (!path) return ["the road from the start never gets to the goal"];
  const roads = grid.cells.flat().filter((cell) => cell === "road").length;
  if (path.length !== roads) return [`${roads - path.length} cells of road are not on the way from the start to the goal`];
  return [];
}

// Which way is off the board, from a cell on its edge: a step of one in x and z. (The back of the
// board is the end with the biggest z.) A cell in a corner is off two edges: it goes off the first of
// the left, the right, the back and the front that it is on.
function outward(grid, cell) {
  if (cell.col === 0) return { x: -1, z: 0 };
  if (cell.col === grid.cols - 1) return { x: 1, z: 0 };
  if (cell.row === 0) return { x: 0, z: 1 };
  return { x: 0, z: -1 };
}

// The points of the road in the world: where each cell is, with one more at each end, out at the
// edge of the island, so that an enemy walks on to the board and off it, and doesn't appear in the
// middle of the first cell.
function routePoints(grid, path, board = BOARD) {
  const centers = path.map((cell) => cellCenter(cell.col, cell.row, board));
  const reach = board.cell / 2 + board.rim;
  const first = outward(grid, path[0]);
  const last = outward(grid, path[path.length - 1]);
  return [
    { x: centers[0].x + first.x * reach, z: centers[0].z + first.z * reach },
    ...centers,
    { x: centers[centers.length - 1].x + last.x * reach, z: centers[centers.length - 1].z + last.z * reach },
  ];
}

// Rounds off the corners of a line of points. At each corner the line is cut short, to the middle
// of each of the two sides, and joined by a curve that is pulled towards the corner (a *quadratic
// Bezier curve*: at each moment, a mix of the start, the corner and the end). A point in the middle
// of a straight stretch is left alone. The first and the last points don't move.
function smoothPoints(points, samples = 6) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const straight = Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) < 1e-9;
    if (straight) {
      out.push(b);
      continue;
    }
    const from = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const to = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 };
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const u = 1 - t;
      out.push({
        x: u * u * from.x + 2 * u * t * b.x + t * t * to.x,
        z: u * u * from.z + 2 * u * t * b.z + t * t * to.z,
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// A line of points, with how far along it each point is, so that "how far has it walked" can be
// turned into a place without adding up every piece again.
function makeRoute(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

// Where something is after walking `distance` along a route, and which way it faces: { x, z, yaw }.
// The yaw is the way Babylon.js turns a model that faces along z to face the way it is going. A
// distance before the start, or past the end, is the start or the end.
function pointAlong(route, distance) {
  const d = Math.min(Math.max(distance, 0), route.total);
  let i = 1;
  while (i < route.lengths.length - 1 && route.lengths[i] < d) i++;
  const a = route.points[i - 1];
  const b = route.points[i];
  const span = route.lengths[i] - route.lengths[i - 1];
  const t = span > 0 ? (d - route.lengths[i - 1]) / span : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    yaw: Math.atan2(b.x - a.x, b.z - a.z),
  };
}

// The route of a map, ready to walk: from the grid of a map to a route, or null if it has no road.
function routeFor(grid, board = BOARD) {
  const path = findPath(grid);
  return path ? makeRoute(smoothPoints(routePoints(grid, path, board))) : null;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findPath, pathProblems, outward, routePoints, smoothPoints, makeRoute, pointAlong, routeFor };
} else {
  Object.assign(window, { findPath, pathProblems, outward, routePoints, smoothPoints, makeRoute, pointAlong, routeFor });
}
