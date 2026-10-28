// Levels: a course drawn as a grid of heights. Each character is the height of one corner of the
// floor (a digit, in steps of HEIGHT_STEP) or a dot for nothing there at all. The floor between
// four corners is a square, tipped to fit them, so a row of rising digits is a ramp, and a dot is a
// hole or an edge to fall off. The grid is turned into plain lists of numbers (the corners of
// triangles), and only then into a mesh, so the rules are easy to test. See ../tests/level.tests.js.

const CELL = 2; // how far apart the corners of the grid are, in world units
const HEIGHT_STEP = 0.5; // how high a "1" in the grid is, in world units
const SKIRT_BOTTOM = -2; // the walls under the edge of a level go down to here
const FALL_MARGIN = 6; // a marble this far below the lowest floor has fallen off
const DROP_HEIGHT = 0.5; // how far above the floor a marble starts, so it is dropped on to it

// A level can also have `enemies`, a list of places ({ col, row }) where enemy marbles start, and `slime`, puddles (zones with a `radius` of their own) that slow a marble and
// dissolve it if it stays, and `movers`, which move on their own. A mover is a "platform", which shuttles
// between `from` and `to` (both { col, row }), or a "piston", which pops up where it is (`at`) by `rise`
// units. Either has a `size` (x and z, in world units), a `height` (as a digit, where its top is), and a
// `period` in seconds for a whole cycle, and may have a `phase`, how far through its cycle it starts, from 0 to 1.
const LEVELS = [
  {
    name: "Practice Run",
    start: { col: 1.5, row: 2 },
    time: 40,
    goal: { col: 11, row: 10 },
    checkpoints: [{ col: 11, row: 2, bonus: 10 }],
    rows: [
      "8888765432222",
      "8888765432222",
      "8888765432222",
      "8888765432222",
      "8888765432222",
      ".........2222",
      ".........2222",
      ".........1111",
      ".........0000",
      ".........0000",
      ".........0000",
      ".........0000",
    ],
  },
  {
    name: "The Bridge",
    start: { col: 1, row: 4 },
    time: 50,
    goal: { col: 15, row: 4 },
    checkpoints: [{ col: 8, row: 4, bonus: 12 }],
    enemies: [{ col: 15, row: 6 }],
    rows: [
      ".................",
      "..............000",
      "666543........000",
      "66654333333321000",
      "66654333333321000",
      "66654333333321000",
      "666543........000",
      "..............000",
      ".................",
    ],
  },
  {
    name: "Hazard Alley",
    start: { col: 1.5, row: 4 },
    time: 70,
    goal: { col: 24, row: 4 },
    checkpoints: [{ col: 11.5, row: 4, bonus: 15 }],
    enemies: [{ col: 12, row: 2.5 }],
    slime: [{ col: 21.5, row: 4, radius: 1.6 }],
    movers: [
      { kind: "platform", from: { col: 5.25, row: 4 }, to: { col: 8.75, row: 4 }, height: 4, size: { x: 5, z: 6 }, period: 14 },
      { kind: "piston", at: { col: 14, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 4, phase: 0.1 },
    ],
    rows: [
      "..........................",
      "..........................",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "..........................",
      "..........................",
    ],
  },

];

// A level's grid as numbers: `heights[row][col]` is the height of a corner in world units, or
// null where the grid has a dot.
function parseLevel(level) {
  return {
    name: level.name,
    cols: level.rows[0].length,
    rows: level.rows.length,
    heights: level.rows.map((row) => [...row].map((ch) => (ch === "." ? null : Number(ch) * HEIGHT_STEP))),
    start: level.start,
    time: level.time,
    goal: level.goal,
    checkpoints: level.checkpoints,
    slime: level.slime || [],
    movers: level.movers || [],
    enemies: level.enemies || [],
  };
}

// The height of the corner at a column and row, or null if there is no corner there (a dot, or
// past the edge of the grid).
function cornerHeight(grid, col, row) {
  const heights = grid.heights[row];
  if (!heights || heights[col] === undefined) return null;
  return heights[col];
}

// Whether there is floor in the square whose corner nearest the origin is at (col, row): only if
// all four of its corners are there.
function cellExists(grid, col, row) {
  return [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dc, dr]) => cornerHeight(grid, col + dc, row + dr) !== null);
}

// The height of the floor at a place in the world, or null if there is no floor there. Each square
// is two triangles, split along the line from its first corner to its last, and the height is
// worked out in whichever triangle the place is in. It is the same two triangles the mesh is made of,
// so this is the height the marble really finds.
function heightAt(grid, x, z) {
  const col = Math.floor(x / CELL);
  const row = Math.floor(z / CELL);
  if (!cellExists(grid, col, row)) return null;
  const u = x / CELL - col; // how far across the square, 0 to 1
  const v = z / CELL - row; // how far along it
  const h00 = cornerHeight(grid, col, row);
  const h10 = cornerHeight(grid, col + 1, row);
  const h01 = cornerHeight(grid, col, row + 1);
  const h11 = cornerHeight(grid, col + 1, row + 1);
  if (u <= v) return h00 + (h11 - h01) * u + (h01 - h00) * v;
  return h00 + (h11 - h10) * v + (h10 - h00) * u;
}

// Where a marble starts: above the floor at the level's start, so it drops on to it. Give a
// `point` ({ col, row }, such as a checkpoint) to start there instead.
function levelStart(grid, point = grid.start) {
  const x = point.col * CELL;
  const z = point.row * CELL;
  return { x, y: heightAt(grid, x, z) + MARBLE_RADIUS + DROP_HEIGHT, z };
}

// The height of the lowest corner in the level.
function lowestHeight(grid) {
  return Math.min(...grid.heights.flat().filter((h) => h !== null));
}

// The height below which a marble has fallen off the level for good.
function fallLimit(grid) {
  return lowestHeight(grid) - FALL_MARGIN;
}

// The triangles of a level, as plain lists of numbers: `positions` (x, y and z of every point, one
// after another), `uvs` (where each point is on the texture) and `indices` (three points to a
// triangle). The floor is made of the corners, shared between the squares that meet at them, so
// it is smooth. The walls under the edges (every side of a square that has no square next to it) have
// points of their own, so they stay sharp-edged.
function levelGeometry(grid) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const addPoint = (x, y, z, u, v) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  // The floor: a point for every corner that is used, made the first time it is asked for.
  const corners = new Map();
  const corner = (col, row) => {
    const key = row * grid.cols + col;
    if (!corners.has(key)) {
      const x = col * CELL;
      const z = row * CELL;
      corners.set(key, addPoint(x, cornerHeight(grid, col, row), z, x / TILE, z / TILE));
    }
    return corners.get(key);
  };


  // A wall down from one side of a square, from (ax, az) to (bx, bz) with the floor at heights ah
  // and bh, facing the way (nx, nz). Babylon.js only draws the front of a triangle, and which side is
  // the front depends on the order of its points, so the wall's points are given in the order that
  // makes its outside the front: starting at the end that is on the left as seen from outside.
  const wall = (ax, az, ah, bx, bz, bh, nx, nz) => {
    // Looking at the wall from outside, `right` is the way to the right. Find which end is which.
    const right = { x: -nz, z: nx };
    const aIsLeft = ax * right.x + az * right.z < bx * right.x + bz * right.z;
    const [lx, lz, lh, rx, rz, rh] = aIsLeft ? [ax, az, ah, bx, bz, bh] : [bx, bz, bh, ax, az, ah];
    const along = (x, z) => (x * Math.abs(nz) + z * Math.abs(nx)) / TILE; // the texture runs along the wall
    const topLeft = addPoint(lx, lh, lz, along(lx, lz), lh / TILE);
    const topRight = addPoint(rx, rh, rz, along(rx, rz), rh / TILE);
    const bottomRight = addPoint(rx, SKIRT_BOTTOM, rz, along(rx, rz), SKIRT_BOTTOM / TILE);
    const bottomLeft = addPoint(lx, SKIRT_BOTTOM, lz, along(lx, lz), SKIRT_BOTTOM / TILE);
    indices.push(topLeft, bottomRight, topRight, topLeft, bottomLeft, bottomRight);
  };

  for (let row = 0; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.cols - 1; col++) {
      if (!cellExists(grid, col, row)) continue;
      const p00 = corner(col, row);
      const p10 = corner(col + 1, row);
      const p01 = corner(col, row + 1);
      const p11 = corner(col + 1, row + 1);
      indices.push(p00, p11, p01, p00, p10, p11); // in the order that makes the top the front

      const h00 = cornerHeight(grid, col, row);
      const h10 = cornerHeight(grid, col + 1, row);
      const h01 = cornerHeight(grid, col, row + 1);
      const h11 = cornerHeight(grid, col + 1, row + 1);
      const x0 = col * CELL;
      const x1 = x0 + CELL;
      const z0 = row * CELL;
      const z1 = z0 + CELL;
      if (!cellExists(grid, col, row - 1)) wall(x0, z0, h00, x1, z0, h10, 0, -1);
      if (!cellExists(grid, col, row + 1)) wall(x0, z1, h01, x1, z1, h11, 0, 1);
      if (!cellExists(grid, col - 1, row)) wall(x0, z0, h00, x0, z1, h01, -1, 0);
      if (!cellExists(grid, col + 1, row)) wall(x1, z0, h10, x1, z1, h11, 1, 0);
    }
  }
  return { positions, uvs, indices };
}

// Makes a level in a scene: a mesh of the floor and the walls, and a physics body for it that never
// moves (`mass: 0`), as the slabs of the test course are. Returns the grid, the mesh, and a
// `dispose()` that takes the level away again, so the next one can be put in its place.
function buildLevel(scene, level) {
  const grid = parseLevel(level);
  const { positions, uvs, indices } = levelGeometry(grid);

  const mesh = new BABYLON.Mesh(level.name, scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;
  data.normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, data.normals); // which way each point faces, for the light
  data.applyToMesh(mesh);

  const material = new BABYLON.StandardMaterial("deck", scene);
  material.diffuseTexture = makeDeckTexture(scene);
  material.specularColor = new BABYLON.Color3(0.2, 0.22, 0.28);
  mesh.material = material;
  mesh.receiveShadows = true;

  // The marble rolls on the triangles themselves (a MESH shape), not on a box round them.
  const aggregate = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH, { mass: 0, ...SURFACES.deck }, scene);

  return {
    grid,
    mesh,
    aggregate,
    dispose() {
      aggregate.dispose();
      material.diffuseTexture.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry, buildLevel };
} else {
  Object.assign(window, { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry, buildLevel });
}
