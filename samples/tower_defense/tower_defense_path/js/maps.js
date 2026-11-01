// Maps: a board drawn as text, one string for every row, one character for every cell. A map is
// data, so it is easy to write, easy to read, and easy to check. The editor in the last tutorial
// writes the same thing. See ../tests/maps.tests.js.

// What each character means. The start is where enemies come on to the board, and the goal is
// where they are trying to get to: both are pieces of road.
const LEGEND = {
  ".": "grass",
  "#": "road",
  S: "start",
  G: "goal",
};

const MAPS = [
  {
    name: "The Winding Road",
    rows: [
      "..............",
      "S###########..",
      "...........#..",
      "..##########..",
      "..#...........",
      "..##########..",
      "...........#..",
      "...........##G",
      "..............",
    ],
  },
  {
    name: "Switchback",
    rows: [
      ".S..........G.",
      ".#..####..###.",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".####..####...",
      "..............",
    ],
  },
];

// A map as a grid: { name, cols, rows, cells, start, goal }. `cells[row][col]` is "grass" or "road",
// and the start and goal are also road. A character that isn't in the legend is a grass cell and is
// written down in `unknown`, so that a check can complain about it.
function parseMap(map) {
  const cells = [];
  const unknown = [];
  const starts = [];
  const goals = [];
  map.rows.forEach((text, row) => {
    cells.push(
      [...text].map((character, col) => {
        const meaning = LEGEND[character];
        if (!meaning) unknown.push({ col, row, character });
        if (meaning === "start") starts.push({ col, row });
        if (meaning === "goal") goals.push({ col, row });
        return meaning === "road" || meaning === "start" || meaning === "goal" ? "road" : "grass";
      })
    );
  });
  return {
    name: map.name,
    cols: Math.max(0, ...map.rows.map((text) => text.length)),
    rows: map.rows.length,
    cells,
    start: starts[0] || null,
    goal: goals[0] || null,
    starts,
    goals,
    unknown,
  };
}

// Whether a cell of a parsed map is road. Off the map, it isn't.
function isRoad(grid, col, row) {
  return !!grid.cells[row] && grid.cells[row][col] === "road";
}

// How many of the four cells beside this one are road.
function roadNeighbors(grid, col, row) {
  return [
    [col, row - 1],
    [col + 1, row],
    [col, row + 1],
    [col - 1, row],
  ].filter(([c, r]) => isRoad(grid, c, r)).length;
}

// Everything that is wrong with a map, as a list of sentences: nothing in the list is a map you can play.
// `board` is the board it has to fit.
function mapProblems(map, board = BOARD) {
  const grid = parseMap(map);
  const problems = [];
  if (grid.rows !== board.rows) problems.push(`it has ${grid.rows} rows, and the board has ${board.rows}`);
  map.rows.forEach((text, row) => {
    if (text.length !== board.cols) problems.push(`row ${row} has ${text.length} cells, and the board has ${board.cols}`);
  });
  for (const { col, row, character } of grid.unknown) problems.push(`"${character}" at column ${col}, row ${row} means nothing`);
  if (grid.starts.length !== 1) problems.push(`it needs one start, and has ${grid.starts.length}`);
  if (grid.goals.length !== 1) problems.push(`it needs one goal, and has ${grid.goals.length}`);

  const onEdge = (cell) => cell.col === 0 || cell.row === 0 || cell.col === grid.cols - 1 || cell.row === grid.rows - 1;
  if (grid.start && !onEdge(grid.start)) problems.push("the start is not on the edge of the board, where enemies come on");
  if (grid.goal && !onEdge(grid.goal)) problems.push("the goal is not on the edge of the board, where enemies go off");

  // A road is one line: each piece has a road on two sides, except the ends, which have one.
  grid.cells.forEach((line, row) =>
    line.forEach((cell, col) => {
      if (cell !== "road") return;
      const isEnd = (grid.start && grid.start.col === col && grid.start.row === row) || (grid.goal && grid.goal.col === col && grid.goal.row === row);
      const want = isEnd ? 1 : 2;
      const have = roadNeighbors(grid, col, row);
      const plural = (n) => `${n} ${n === 1 ? "neighbor" : "neighbors"}`;
      if (have !== want) problems.push(`the road at column ${col}, row ${row} has ${plural(have)}, and should have ${plural(want)}`);
    })
  );
  return problems;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems };
} else {
  Object.assign(window, { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems });
}
