// The street: where every piece of the world goes. Everything in here is plain
// numbers and arrays (no Babylon.js), so the layout can be tested on its own;
// models.js loads the pieces and main.js places them where this says.
//
// The street runs along +z. The runner will start near z = 0 and run toward
// +z; x is across the street (left is negative, right is positive) and y is up.
// A "row" is one road tile long.

// The Kenney city pieces were drawn about 7 times too small for the runner
// (1.83 units tall, a person): one road tile is 1 unit wide, a shipping
// container 0.35 units tall. Scaling every piece by 7 makes a road tile 7 units
// wide and a container about 2.5 units tall, which is the size of the real thing.
const WORLD_SCALE = 7;

// One road tile is one row: this many world units long.
const TILE = WORLD_SCALE;

// The sidewalk tiles sit right beside the road, and the buildings start a
// little way into them, so about 4 units of sidewalk show in front of each.
const SIDEWALK_X = TILE; // center of a sidewalk tile, to the left and right of the road
const BUILDING_EDGE_X = 7.5; // how far from the middle of the street a building's front stands

const BUILDING_GAP = 0.1; // a little space between neighbors, in piece units
const LIGHT_EVERY = 2; // a street light every this many rows, alternating sides

// The Kenney buildings face -z, the way they come out of the file. Turning one a
// quarter turn faces it down the street's cross axis: +PI/2 faces -x (so a
// building on the right, at positive x, looks back at the street) and -PI/2
// faces +x (for the left side).
const FACE_LEFT_SIDE = -Math.PI / 2;
const FACE_RIGHT_SIDE = Math.PI / 2;

// A small, repeatable random number generator (mulberry32). Seeding it means
// the same street every time you load the page, which makes the layout easy to
// test and to compare while you work on it. Returns a function like Math.random.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Buildings, with their footprint (width along the street, depth back from it)
// in the pieces' own units. They're all commercial pieces from the same kit,
// so they match each other.
const BUILDINGS = [
  { piece: "commercial/building-a", width: 0.884, depth: 0.94 },
  { piece: "commercial/building-b", width: 0.97, depth: 0.94 },
  { piece: "commercial/building-c", width: 0.884, depth: 1.09 },
  { piece: "commercial/building-d", width: 0.84, depth: 0.9 },
  { piece: "commercial/building-e", width: 1.64, depth: 1.008 },
  { piece: "commercial/building-f", width: 0.84, depth: 1.03 },
  { piece: "commercial/building-g", width: 0.97, depth: 0.922 },
  { piece: "commercial/building-h", width: 0.884, depth: 1.008 },
  { piece: "commercial/building-i", width: 1.24, depth: 1.302 },
  { piece: "commercial/building-k", width: 2.084, depth: 0.942 },
  { piece: "commercial/building-l", width: 1.37, depth: 1.402 },
  { piece: "commercial/building-m", width: 1.24, depth: 1.242 },
  { piece: "commercial/building-skyscraper-a", width: 1.36, depth: 1.36 },
  { piece: "commercial/building-skyscraper-b", width: 1.36, depth: 1.36 },
  { piece: "commercial/building-skyscraper-c", width: 1.28, depth: 1.388 },
  { piece: "commercial/building-skyscraper-e", width: 1.295, depth: 1.242 },
];

// Lines buildings up along one side of the street, from `fromZ` for at least
// `length`, picking each one at random. Returns the placements for that side.
// `side` is -1 for the left (negative x) and 1 for the right.
function layoutSide(side, fromZ, length, random) {
  const placements = [];
  let z = fromZ;
  while (z < fromZ + length) {
    const building = BUILDINGS[Math.floor(random() * BUILDINGS.length)];
    const width = building.width * WORLD_SCALE;
    const depth = building.depth * WORLD_SCALE;
    placements.push({
      piece: building.piece,
      x: side * (BUILDING_EDGE_X + depth / 2),
      z: z + width / 2,
      rotationY: side < 0 ? FACE_LEFT_SIDE : FACE_RIGHT_SIDE,
    });
    z += width + BUILDING_GAP * WORLD_SCALE;
  }
  return placements;
}

// Works out everything the street is made of: `rows` road tiles in a line, a
// sidewalk tile beside each, a building line along each side, and street lights.
// The first row is centered on `firstZ` (by default a row behind the start, so
// there is street behind the camera too). Returns a list of placements:
// { piece, x, z, rotationY }, with the piece named "kit/file" like the assets folder.
function streetLayout({ rows, random = Math.random, firstZ = -TILE } = {}) {
  const placements = [];

  for (let i = 0; i < rows; i++) {
    const z = firstZ + i * TILE;
    // The road tile is drawn running along x, so turn it a quarter turn to run along z.
    placements.push({ piece: "roads/road_straight", x: 0, z, rotationY: Math.PI / 2 });
    placements.push({ piece: "roads/tile_low", x: -SIDEWALK_X, z, rotationY: 0 });
    placements.push({ piece: "roads/tile_low", x: SIDEWALK_X, z, rotationY: 0 });

    if (i % LIGHT_EVERY === 0) {
      // Alternate sides, with the lamp's arm reaching over the road.
      const side = (i / LIGHT_EVERY) % 2 === 0 ? -1 : 1;
      placements.push({ piece: "roads/light_square", x: side * (TILE / 2 + 0.4), z, rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  }

  const start = firstZ - TILE / 2;
  const length = rows * TILE;
  placements.push(...layoutSide(-1, start, length, random));
  placements.push(...layoutSide(1, start, length, random));
  return placements;
}

// The names of the pieces a layout uses, each once, so each file is loaded once.
function piecesUsed(placements) {
  return [...new Set(placements.map((p) => p.piece))];
}


// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed });
}

