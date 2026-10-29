// The plan of the district: where each street tile and each building goes. It is plain data and plain functions (no Babylon.js, no
// page), so the plan can be checked by tests, and so later parts of the game can use the very same numbers (the collision boxes
// of the buildings, the places a runner can jump between). Everything is in metres, the unit of the models. The ground is the
// plane y = 0, x goes east and z goes north. See ../tests/plan.tests.js.

// The street. A tile of road is 6 long and 18 across: 3 of sidewalk, 12 of road (four lanes), and 3 of sidewalk. A crossing is
// a square junction, a little over 24 across, and a road runs into each side of it.
const STREET = { tile: 6, width: 18, junction: 74 / 3, file: "Street_4Lane", junctionFile: "Street_4WayIntersection" };

// A district is a grid of blocks. Streets run between them, and round the outside, so a district of 2 by 2 blocks has 3 streets
// each way, and 9 junctions. `tilesBetween` is how many tiles of road lie between one junction and the next (which makes the
// blocks the size they are), and `extraTiles` how many run on past the junctions at the edge, out toward the fog.
const GRID = { blocksX: 2, blocksZ: 2, tilesBetween: 4, extraTiles: 3 };

// The road is lower than the sidewalk: its surface is this far below the plane y = 0, which is the top of the sidewalks and of the ground
// of the blocks. A runner on the road stands this much lower than one on the sidewalk.
const ROAD_DEPTH = 0.15;

// The least width of an alley between two buildings. Narrower than a body, and it would be a crack in the wall.
const MIN_ALLEY = 1.5;

// The buildings of the kit, and how big each is: the width and depth of its footprint, and its height, as measured from the files
// (see assets/README.md). A building has a front, with the windows and the door, which is its +z side as it comes out of its file.
const BUILDINGS = {
  small_1: { file: "Building_Small_1", width: 12.46, depth: 14.536, height: 17.014 },
  small_2: { file: "Building_Small_2", width: 20, depth: 12.002, height: 18.999 },
  medium_1: { file: "Building_Medium_1", width: 13.056, depth: 12.054, height: 27.915 },
  medium_2: { file: "Building_Medium_2", width: 15.056, depth: 13.056, height: 24.998 },
  large_1: { file: "Building_Large_1", width: 25.038, depth: 26.028, height: 41 },
  large_2: { file: "Building_Large_2", width: 20.644, depth: 16.644, height: 28 },
  large_3: { file: "Building_Large_3", width: 23.056, depth: 19.058, height: 34.945 },
};

// Which way a building's front faces, and how far it is turned from the way it comes out of its file (facing north).
const FACINGS = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 };

// What is on each block. `u` and `v` are where the middle of the building is, from the middle of the block (u to the east, v to
// the north). A building facing a street stands right up to the sidewalk, so only the place along the street is given, and the
// other is worked out. A building with both is put exactly there (the tower of a block stands in the middle).
const LAYOUTS = {
  "0,0": [
    { building: "small_1", facing: "north", u: -8.5 },
    { building: "medium_1", facing: "north", u: 8 },
    { building: "medium_2", facing: "south", u: -7 },
    { building: "small_1", facing: "south", u: 9 },
  ],
  "1,0": [{ building: "large_1", facing: "north", u: 0, v: 0 }],
  "0,1": [{ building: "large_3", facing: "north", u: -3.8 }],
  "1,1": [
    { building: "large_2", facing: "north", u: -4.7 },
    { building: "small_2", facing: "south", u: -5.3 },
  ],
};

// How high the ground is at a place: ROAD_DEPTH below zero on a road, and zero everywhere else (the sidewalks, and the blocks). A road is
// the band of asphalt (12 across: the middle of the 18 of a street) along each street, and the square of a junction, which is a little
// wider than a street, along its roads.
function groundHeight(x, z, grid = GRID) {
  const half = STREET.junction / 2;
  const asphalt = (STREET.width - 6) / 2; // half the width of the road: the sidewalks are 3 on each side of it
  for (let i = 0; i <= grid.blocksX; i++) {
    for (let j = 0; j <= grid.blocksZ; j++) {
      const at = junctionCenter(grid, i, j);
      const dx = Math.abs(x - at.x);
      const dz = Math.abs(z - at.z);
      if (dx < half && dz < STREET.width / 2) return -ROAD_DEPTH; // the junction, across
      if (dz < half && dx < STREET.width / 2) return -ROAD_DEPTH; // and down
    }
  }
  const bounds = districtBounds(grid);
  const inside = (value, low, high) => value >= low && value <= high;
  for (let j = 0; j <= grid.blocksZ; j++) {
    if (Math.abs(z - junctionCenter(grid, 0, j).z) < asphalt && inside(x, bounds.minX, bounds.maxX)) return -ROAD_DEPTH;
  }
  for (let i = 0; i <= grid.blocksX; i++) {
    if (Math.abs(x - junctionCenter(grid, i, 0).x) < asphalt && inside(z, bounds.minZ, bounds.maxZ)) return -ROAD_DEPTH;
  }
  return 0;
}

// How far apart the junctions are, from the middle of one to the middle of the next.
function spacing(grid = GRID) {
  return STREET.junction + grid.tilesBetween * STREET.tile;
}

// How big a block is, from the edge of one sidewalk to the edge of the next. Blocks are square.
function blockSize(grid = GRID) {
  return spacing(grid) - STREET.width;
}

// The middle of the junction in column `i` and row `j` of the junctions (0 up to blocksX, and 0 up to blocksZ). The middle of
// the district is the origin.
function junctionCenter(grid, i, j) {
  return { x: (i - grid.blocksX / 2) * spacing(grid), z: (j - grid.blocksZ / 2) * spacing(grid) };
}

// The middle of the block in column `a` and row `b`.
function blockCenter(grid, a, b) {
  return { x: (a + 0.5 - grid.blocksX / 2) * spacing(grid), z: (b + 0.5 - grid.blocksZ / 2) * spacing(grid) };
}

// Every piece of street: a junction at each crossing, and tiles of road between them and on past the edge. A road tile
// runs along x, so those that run along z are turned a quarter. Each is { piece, x, z, rotationY }, with the piece named by its
// file.
function streetPlacements(grid = GRID) {
  const placed = [];
  const half = STREET.junction / 2;
  for (let i = 0; i <= grid.blocksX; i++) {
    for (let j = 0; j <= grid.blocksZ; j++) {
      const at = junctionCenter(grid, i, j);
      placed.push({ piece: STREET.junctionFile, x: at.x, z: at.z, rotationY: 0 });
      // Roads leave each junction east and north, to the next one, or past the edge if there is no next.
      const eastTiles = i < grid.blocksX ? grid.tilesBetween : grid.extraTiles;
      const northTiles = j < grid.blocksZ ? grid.tilesBetween : grid.extraTiles;
      for (let k = 0; k < eastTiles; k++) placed.push({ piece: STREET.file, x: at.x + half + STREET.tile * (k + 0.5), z: at.z, rotationY: 0 });
      for (let k = 0; k < northTiles; k++) placed.push({ piece: STREET.file, x: at.x, z: at.z + half + STREET.tile * (k + 0.5), rotationY: Math.PI / 2 });
      // And the edge has road going west and south too, since nothing else will make it.
      if (i === 0) for (let k = 0; k < grid.extraTiles; k++) placed.push({ piece: STREET.file, x: at.x - half - STREET.tile * (k + 0.5), z: at.z, rotationY: 0 });
      if (j === 0) for (let k = 0; k < grid.extraTiles; k++) placed.push({ piece: STREET.file, x: at.x, z: at.z - half - STREET.tile * (k + 0.5), rotationY: Math.PI / 2 });
    }
  }
  return placed;
}

// How big a building's footprint is when it faces a way: turned a quarter, the width and the depth swap places.
function footprintSize(building, facing) {
  const turned = facing === "east" || facing === "west";
  return { width: turned ? building.depth : building.width, depth: turned ? building.width : building.depth };
}

// Every building of the district. Each is { name, piece, block, facing, rotationY, x, z, width, depth, height }, with x and z the
// middle of the footprint, and `width` and `depth` the size of the footprint as it lies in the world.
function buildingPlacements(grid = GRID, layouts = LAYOUTS) {
  const placed = [];
  const half = blockSize(grid) / 2;
  for (const [key, list] of Object.entries(layouts)) {
    const [a, b] = key.split(",").map(Number);
    const center = blockCenter(grid, a, b);
    for (const entry of list) {
      const building = BUILDINGS[entry.building];
      const { width, depth } = footprintSize(building, entry.facing);
      let { u, v } = entry;
      if (v === undefined && entry.facing === "north") v = half - depth / 2;
      if (v === undefined && entry.facing === "south") v = -half + depth / 2;
      if (u === undefined && entry.facing === "east") u = half - width / 2;
      if (u === undefined && entry.facing === "west") u = -half + width / 2;
      placed.push({
        name: entry.building,
        piece: building.file,
        block: key,
        facing: entry.facing,
        rotationY: FACINGS[entry.facing],
        x: center.x + u,
        z: center.z + v,
        width,
        depth,
        height: building.height,
      });
    }
  }
  return placed;
}

// The ground a building (or anything with a width and a depth) covers, as a box: { minX, maxX, minZ, maxZ }.
function footprint(placement) {
  return {
    minX: placement.x - placement.width / 2,
    maxX: placement.x + placement.width / 2,
    minZ: placement.z - placement.depth / 2,
    maxZ: placement.z + placement.depth / 2,
  };
}

// Every building as a solid box: its footprint, from the ground up to its roof. Each is { name, minX, maxX, minY, maxY, minZ, maxZ },
// which is what the walls of the scout, the camera and (later) the runner's collisions are made from.
function buildingBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts).map((placement) => ({ name: placement.name, ...footprint(placement), minY: 0, maxY: placement.height }));
}

// The space between two boxes: { overlap, gap }. `gap` is the distance between their nearest edges or corners (0 if they touch),
// and `overlap` says whether they share any ground.
function boxGap(a, b) {
  const gapX = Math.max(a.minX - b.maxX, b.minX - a.maxX);
  const gapZ = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ);
  return { overlap: gapX < 0 && gapZ < 0, gap: Math.hypot(Math.max(gapX, 0), Math.max(gapZ, 0)) };
}

// The ground of each block, as a box, with the key of the block.
function blockBoxes(grid = GRID) {
  const half = blockSize(grid) / 2;
  const boxes = [];
  for (let a = 0; a < grid.blocksX; a++) {
    for (let b = 0; b < grid.blocksZ; b++) {
      const c = blockCenter(grid, a, b);
      boxes.push({ key: `${a},${b}`, minX: c.x - half, maxX: c.x + half, minZ: c.z - half, maxZ: c.z + half });
    }
  }
  return boxes;
}

// The edge of the district, out where the roads end: { minX, maxX, minZ, maxZ }.
function districtBounds(grid = GRID) {
  const reach = STREET.junction / 2 + grid.extraTiles * STREET.tile;
  const first = junctionCenter(grid, 0, 0);
  const last = junctionCenter(grid, grid.blocksX, grid.blocksZ);
  return { minX: first.x - reach, maxX: last.x + reach, minZ: first.z - reach, maxZ: last.z + reach };
}

// What is wrong with the plan, as sentences. An empty list is a plan that is fine: every building is inside its own block, none
// overlap another, and the alley between any two is at least MIN_ALLEY wide.
function planProblems(grid = GRID, layouts = LAYOUTS) {
  const found = [];
  const blocks = new Map(blockBoxes(grid).map((box) => [box.key, box]));
  const buildings = buildingPlacements(grid, layouts);
  for (const building of buildings) {
    const box = footprint(building);
    const block = blocks.get(building.block);
    if (!block) {
      found.push(`${building.name} is on block ${building.block}, which there is not`);
      continue;
    }
    const eps = 1e-6;
    if (box.minX < block.minX - eps || box.maxX > block.maxX + eps || box.minZ < block.minZ - eps || box.maxZ > block.maxZ + eps) {
      found.push(`${building.name} sticks out of block ${building.block}`);
    }
  }
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const { overlap, gap } = boxGap(footprint(buildings[i]), footprint(buildings[j]));
      if (overlap) found.push(`${buildings[i].name} and ${buildings[j].name} overlap`);
      else if (gap < MIN_ALLEY) found.push(`The alley between ${buildings[i].name} and ${buildings[j].name} is ${gap.toFixed(2)} wide`);
    }
  }
  return found;
}

// The files the district needs, once each: for loading them.
function piecesUsed(grid = GRID, layouts = LAYOUTS) {
  return [...new Set([...streetPlacements(grid).map((p) => p.piece), ...buildingPlacements(grid, layouts).map((p) => p.piece)])];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STREET, GRID, ROAD_DEPTH, MIN_ALLEY, BUILDINGS, FACINGS, LAYOUTS, spacing, blockSize, junctionCenter, blockCenter, groundHeight, streetPlacements, footprintSize, buildingPlacements, footprint, boxGap, buildingBoxes, blockBoxes, districtBounds, planProblems, piecesUsed };
} else {
  Object.assign(window, { STREET, GRID, ROAD_DEPTH, MIN_ALLEY, BUILDINGS, FACINGS, LAYOUTS, spacing, blockSize, junctionCenter, blockCenter, groundHeight, streetPlacements, footprintSize, buildingPlacements, footprint, boxGap, buildingBoxes, blockBoxes, districtBounds, planProblems, piecesUsed });
}
