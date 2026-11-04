// The island: the board floats in the sky on a lump of rock that narrows to a point below it.
// The rock is made in code from a few rings of points round the board's outline, each ring lower
// and smaller than the one above, and pushed a little in or out by a seeded random number so that
// it is lumpy, and the same lump every time. See ../tests/island.tests.js.

const ISLAND = {
  segments: 5, // points along each side of the outline, not counting the corner that starts the next
  seed: 7, // which lump: change it for another rock
  top: -0.3, // the height of the island's top face: under the bottom of every tile, or a road in a thick tile would be buried
  jitter: 0.45, // how far a point may be pushed in or out, in world units
  // The rings, from the top down: how far down (as a share of the board's depth), and how
  // much of the outline's size is left (1 is all of it).
  rings: [
    { down: 0, size: 1 },
    { down: 0.14, size: 1 },
    { down: 0.3, size: 0.88 },
    { down: 0.55, size: 0.6 },
    { down: 0.8, size: 0.3 },
    { down: 1, size: 0.08 },
  ],
  rock: "#6e5f50", // the colors of the rock and of the grass round the board's edge
  grass: "#4f7a2a",
};

// The points of a rectangle's outline, going once round it: `segments` on each side, starting
// at the corner at the back left. They are given in the order a clock's hand goes, seen from above.
function outline(halfWidth, halfDepth, segments = ISLAND.segments) {
  const corners = [
    [-halfWidth, halfDepth],
    [halfWidth, halfDepth],
    [halfWidth, -halfDepth],
    [-halfWidth, -halfDepth],
  ];
  const points = [];
  for (let side = 0; side < 4; side++) {
    const [ax, az] = corners[side];
    const [bx, bz] = corners[(side + 1) % 4];
    for (let i = 0; i < segments; i++) {
      points.push([ax + ((bx - ax) * i) / segments, az + ((bz - az) * i) / segments]);
    }
  }
  return points;
}

// The rings of points that make the rock: an array of rings, each an array of { x, y, z }. The
// top ring is exactly the board's outline (with its rim); the rest are smaller, lower, and lumpy.
function rockRings(random, board = BOARD, island = ISLAND) {
  const halfWidth = (board.cols * board.cell) / 2 + board.rim;
  const halfDepth = (board.rows * board.cell) / 2 + board.rim;
  const base = outline(halfWidth, halfDepth, island.segments);
  return island.rings.map((ring, index) => {
    const y = island.top - ring.down * board.depth;
    return base.map(([x, z]) => {
      let px = x * ring.size;
      let pz = z * ring.size;
      if (index > 0) {
        // push it in along the line to the middle, so the rock never sticks out past the board
        const away = Math.hypot(px, pz) || 1;
        const push = -random() * island.jitter * ring.size; // the narrow rings get less, or a point could cross the middle
        px += (px / away) * push;
        pz += (pz / away) * push;
      }
      return { x: px, y, z: pz };
    });
  });
}

// The triangles between the rings, as plain lists for a mesh: every triangle has points of its
// own (nothing is shared) so that each is lit flat, like a cut stone. The last ring is closed
// off with a fan of triangles to its middle. Counted clockwise, seen from outside, which is the
// side Babylon.js draws.
function rockGeometry(rings) {
  const positions = [];
  const uvs = [];
  const count = rings[0].length;
  const add = (point, u, v) => {
    positions.push(point.x, point.y, point.z);
    uvs.push(u, v);
  };
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = rings[r][i];
      const b = rings[r][j];
      const c = rings[r + 1][j];
      const d = rings[r + 1][i];
      const u0 = (i / count) * 4;
      const u1 = ((i + 1) / count) * 4;
      const v0 = r * 0.5;
      const v1 = (r + 1) * 0.5;
      add(a, u0, v0);
      add(b, u1, v0);
      add(c, u1, v1);
      add(a, u0, v0);
      add(c, u1, v1);
      add(d, u0, v1);
    }
  }
  const last = rings[rings.length - 1];
  const tip = { x: 0, y: last[0].y - 0.05, z: 0 };
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    add(last[i], 0, 1);
    add(last[j], 1, 1);
    add(tip, 0.5, 1);
  }
  const indices = Array.from({ length: positions.length / 3 }, (_, n) => n); // nothing is shared, so every point is used once, in order
  return { positions, uvs, indices };
}

// A picture of rock for the lump: a dull brown with darker and lighter flecks.
function makeRockTexture(scene, random, color = ISLAND.rock) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("rock", { width: size, height: size }, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
  for (let n = 0; n < 700; n++) {
    const shade = random() < 0.5 ? "0,0,0" : "255,240,220";
    context.fillStyle = `rgba(${shade},${0.04 + random() * 0.1})`;
    const w = 4 + random() * 28;
    context.fillRect(random() * size, random() * size, w, 2 + random() * 6);
  }
  texture.update();
  return texture;
}

// Makes the island in a scene: the lumpy rock, and a flat top of grass that shows round the edge of the board.
function buildIsland(scene, board = BOARD, island = ISLAND) {
  const random = seededRandom(island.seed);
  const rings = rockRings(random, board, island);
  const { positions, uvs, indices } = rockGeometry(rings);
  const normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);

  const rock = new BABYLON.Mesh("rock", scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(rock);
  const rockMaterial = new BABYLON.StandardMaterial("rock", scene);
  rockMaterial.diffuseTexture = makeRockTexture(scene, random, island.rock);
  rockMaterial.specularColor = BABYLON.Color3.Black();
  rock.material = rockMaterial;

  const top = BABYLON.MeshBuilder.CreateGround(
    "island top",
    { width: board.cols * board.cell + board.rim * 2, height: board.rows * board.cell + board.rim * 2 },
    scene
  );
  top.position.y = island.top;
  const topMaterial = new BABYLON.StandardMaterial("island top", scene);
  topMaterial.diffuseColor = BABYLON.Color3.FromHexString(island.grass);
  topMaterial.specularColor = BABYLON.Color3.Black();
  top.material = topMaterial;
  return { rock, top };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ISLAND, outline, rockRings, rockGeometry, makeRockTexture, buildIsland };
} else {
  Object.assign(window, { ISLAND, outline, rockRings, rockGeometry, makeRockTexture, buildIsland });
}
