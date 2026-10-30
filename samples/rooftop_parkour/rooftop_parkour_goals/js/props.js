// Props: the things in the district that are not buildings, and that a runner can use. The fire escapes up the fronts of the buildings (made
// of three kit pieces, stacked), the planter at the foot of each that gives the first jump a start, the sills along a front to hang from, and
// the vents and huts on the roofs to vault and climb. Like the plan they are plain data and arithmetic (no Babylon.js): each is a few boxes of
// the same kind as the buildings' ({ name, minX, maxX, minY, maxY, minZ, maxZ }), so the controller needs to be taught nothing: it hangs from
// them, climbs them and stands on them the way it does a roof. See ../tests/props.tests.js.

// A fire escape. The kit makes it of three pieces: a bottom one (with a ladder that hangs down to the street), as many middle ones as there
// are floors, and a top one. They all have the same platform, 4.8 across and 1.94 out from the wall, with a stair in a gap in it that goes up
// to the platform of the piece above. All of it was measured from above, in a quarter of a metre at a time, and the numbers are in the
// frame of a piece: x along the wall, z out from it (the wall is at z = 0), y up from the platform. `floor` is how far apart the platforms are,
// and `base` how high the first one is above the street (the ladder just reaches it). The stair is eight treads that rise `rise` each, from
// `first` at the first. The stair is drawn a little nearer the wall than the kit has it, and narrower, so that a runner (which is a circle, nearly a metre across) can
// stand on the platform in front of it and climb onto it from the street.
const FIRE_ESCAPE = {
  bottom: "Prop_FireEscape_Bottom",
  center: "Prop_FireEscape_Center",
  top: "Prop_FireEscape_Top",
  width: 4.8,
  depth: 1.94,
  floor: 3.04,
  base: 3.31,
  thickness: 0.1,
  opening: { minX: -1, maxX: 1.1, minZ: 0, maxZ: 1 },
  stair: { minX: -0.9, tread: 0.25, count: 8, first: 0.38, rise: 0.33, minZ: 0.05, maxZ: 0.85 },
};

// Where the middle of the footprint of each piece is, in its own frame (along the wall, out from it): the library puts a piece with the middle of its
// footprint where it is asked to (see models.js), and the numbers above are from the wall.
const PIECE_CENTERS = {
  Prop_FireEscape_Bottom: { x: 0.105, z: 0.955 },
  Prop_FireEscape_Center: { x: 0, z: 0.955 },
  Prop_FireEscape_Top: { x: 0, z: 0.955 },
  Prop_Planter_Single: { x: 0, z: 0 },
  Trim_Wall_Guard: { x: 0, z: 0.06 },
};

// Where to put a kit piece that stands on a wall at `origin` (facing out by `turn` quarter turns), `y` up: { piece, x, y, z, rotationY }.
function pieceAt(file, origin, turn, y) {
  const center = PIECE_CENTERS[file];
  const at = frameToWorld(origin, turn, center.x, center.z);
  return { piece: file, x: at.x, y, z: at.z, rotationY: turn * (Math.PI / 2) };
}

// How a roof is reached from the top platform of a fire escape: it is walked onto (the roof is no more than a step higher), or climbed (it is
// higher than a step, and not higher than a runner's hands can reach from the platform). Anything between is too high to walk and too low to
// be worth a hang, and is not allowed: see `escapeFloors`.
const ESCAPE_RISE = { walk: 0.35, climb: 1.8, least: 0.8 };

// A planter at the foot of a fire escape, which is its size and how far out from the wall its middle is: under the edge of the platform it is
// too far under (a runner jumping from it would hit the platform), so it is just beyond.
const PLANTER = { width: 2, depth: 2, height: 0.6, out: 3.04, file: "Prop_Planter_Single" };

// A sill: a piece of the kit that is meant to be a trim on a wall (a balustrade), 2 across, 0.64 high and 0.12 deep, used as a ledge along a
// front. Each row is { u, count, y }: the middle of the row (u along the front, from the middle of it), how many pieces side by side, and the
// height of the tops of them.
const SILL = { width: 2, height: 0.64, depth: 0.12, file: "Trim_Wall_Guard" };

// The things on a roof, each of a size, and the colour it is drawn in. A vent is low enough to be vaulted, and a hut is low enough that the
// hands can catch the top of it from the roof, and climb: either of them gets the runner moving, or a step higher.
const ROOF_FEATURES = {
  vent: { width: 1, depth: 1, height: 1.2, color: "#3f5f4c" },
  hut: { width: 3, depth: 3, height: 2.4, color: "#4a4f5a" },
};

// A box of the given size, turned to face a way (a quarter turn at a time): its middle is at (x, z). `turn` is 0 for facing +z, and a
// quarter for each step round to the east (+x), south and west.
function turnedBox(name, x, z, width, depth, minY, maxY, turn) {
  const swap = turn % 2 === 1;
  const w = swap ? depth : width;
  const d = swap ? width : depth;
  return { name, minX: x - w / 2, maxX: x + w / 2, minY, maxY, minZ: z - d / 2, maxZ: z + d / 2 };
}

// The way a building's front faces, as a number of quarter turns: north 0, east 1, south 2, west 3.
function quarterTurns(facing) {
  return { north: 0, east: 1, south: 2, west: 3 }[facing];
}

// A point in the frame of something that stands on the wall of a building, at `origin` (x, z) facing out of it by `turn` quarter turns: where
// (along, out) is in the world. `along` runs along the wall to the right of the way it faces out, as a runner facing the wall would see it
// run to the left (and as x does for a building that faces north).
function frameToWorld(origin, turn, along, out) {
  const c = [1, 0, -1, 0][turn];
  const s = [0, 1, 0, -1][turn];
  return { x: origin.x + along * c + out * s, z: origin.z - along * s + out * c };
}

// A box in the frame of a piece (minX..maxX along the wall, minZ..maxZ out from it, heights from the platform) as a box in the world, for a
// piece standing on the ground at `y`.
function frameBox(name, origin, turn, y, box) {
  const a = frameToWorld(origin, turn, box.minX, box.minZ);
  const b = frameToWorld(origin, turn, box.maxX, box.maxZ);
  return {
    name,
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minZ: Math.min(a.z, b.z),
    maxZ: Math.max(a.z, b.z),
    minY: y + box.minY,
    maxY: y + box.maxY,
  };
}

// The boxes of one platform of a fire escape, in the frame of a piece: the platform (three slabs, round the gap for the stair) and, unless it
// is the top piece, the stair to the next platform up.
function platformBoxes(withStair, spec = FIRE_ESCAPE) {
  const t = spec.thickness;
  const o = spec.opening;
  const half = spec.width / 2;
  const boxes = [
    { minX: -half, maxX: o.minX, minZ: 0, maxZ: spec.depth, minY: -t, maxY: 0 },
    { minX: o.maxX, maxX: half, minZ: 0, maxZ: spec.depth, minY: -t, maxY: 0 },
    { minX: o.minX, maxX: o.maxX, minZ: o.maxZ, maxZ: spec.depth, minY: -t, maxY: 0 },
  ];
  if (withStair) {
    const s = spec.stair;
    for (let i = 0; i < s.count; i++) {
      const top = s.first + s.rise * i;
      boxes.push({ minX: s.minX + s.tread * i, maxX: s.minX + s.tread * (i + 1), minZ: s.minZ, maxZ: s.maxZ, minY: top - t, maxY: top });
    }
  }
  return boxes;
}

// How many platforms a fire escape has that reaches a roof at height `roof`: as many as there are (the first at `base` above the street, the others
// `floor` apart) that are not above the roof. It is the top platform that decides how the roof is reached (see ESCAPE_RISE).
function escapeFloors(roof, base = FIRE_ESCAPE.base, spec = FIRE_ESCAPE) {
  return Math.max(1, Math.floor((roof - base) / spec.floor + 1e-9) + 1);
}

// How high the top platform of a fire escape of `floors` platforms is.
function escapeTop(floors, base = FIRE_ESCAPE.base, spec = FIRE_ESCAPE) {
  return base + spec.floor * (floors - 1);
}

// How a runner on the top platform gets onto a roof at height `roof`: "walk", "climb", or null if it can't.
function escapeReach(rise) {
  if (rise <= ESCAPE_RISE.walk) return "walk";
  if (rise >= ESCAPE_RISE.least && rise <= ESCAPE_RISE.climb) return "climb";
  return null;
}

// The fire escapes of the district, one for each building that has an `escape` in its layout ({ u, base }: how far along the front from its
// middle, and the height of the first platform, which is the default if it is left out). Each is
// { name, building, x, z, turn, base, floors, top, rise, pieces, boxes, planter } where `pieces` are the kit pieces to draw (each
// { piece, x, y, z, rotationY }), `boxes` all the boxes to collide with, and `planter` is { piece, x, y, z, rotationY, box }.
function fireEscapes(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    const entry = entries[index];
    if (!entry.escape) return;
    const turn = quarterTurns(placement.facing);
    const walls = wallFootprint(placement);
    // The wall: its plane, in the world, is the side of the walls that the front faces.
    const origin = frameToWorld({ x: placement.x, z: placement.z }, turn, entry.escape.u, 0);
    if (turn === 0) origin.z = walls.maxZ;
    if (turn === 2) origin.z = walls.minZ;
    if (turn === 1) origin.x = walls.maxX;
    if (turn === 3) origin.x = walls.minX;
    const base = entry.escape.base || FIRE_ESCAPE.base;
    const roof = placement.roof - placement.ledge;
    const floors = escapeFloors(roof, base);
    const top = escapeTop(floors, base);
    const name = `${placement.name} fire escape`;
    const pieces = [];
    const boxes = [];
    for (let i = 0; i < floors; i++) {
      const y = base + FIRE_ESCAPE.floor * i;
      const last = i === floors - 1;
      pieces.push(pieceAt(i === 0 ? FIRE_ESCAPE.bottom : last ? FIRE_ESCAPE.top : FIRE_ESCAPE.center, origin, turn, y));
      for (const box of platformBoxes(!last)) boxes.push(frameBox(name, origin, turn, y, box));
    }
    const at = frameToWorld(origin, turn, 0, PLANTER.out);
    const planterBox = turnedBox(`${placement.name} planter`, at.x, at.z, PLANTER.width, PLANTER.depth, 0, PLANTER.height, turn);
    found.push({
      name,
      building: index,
      x: origin.x,
      z: origin.z,
      turn,
      base,
      floors,
      top,
      rise: roof - top,
      pieces,
      boxes,
      planter: { ...pieceAt(PLANTER.file, at, turn, 0), box: planterBox },
    });
  });
  return found;
}

// The sills along the fronts of the buildings that have them (`sills` in the layout: { u, count, y }), as boxes, one for each piece of the row.
// Each is { name, minX, maxX, minY, maxY, minZ, maxZ, piece }, `piece` being where to put the kit piece ({ piece, x, y, z, rotationY }). The
// pieces stand on the wall, and are a hand's breadth deep: a ledge to hang from and shimmy along.
function sills(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    const entry = entries[index];
    if (!entry.sills) return;
    const turn = quarterTurns(placement.facing);
    const walls = wallFootprint(placement);
    const { u, count, y } = entry.sills;
    for (let i = 0; i < count; i++) {
      const along = u + (i - (count - 1) / 2) * SILL.width;
      const origin = frameToWorld({ x: placement.x, z: placement.z }, turn, along, 0);
      if (turn === 0) origin.z = walls.maxZ;
      if (turn === 2) origin.z = walls.minZ;
      if (turn === 1) origin.x = walls.maxX;
      if (turn === 3) origin.x = walls.minX;
      const middle = frameToWorld(origin, turn, 0, SILL.depth / 2);
      const box = turnedBox(`${placement.name} sill`, middle.x, middle.z, SILL.width, SILL.depth, y - SILL.height, y, turn);
      found.push({ ...box, piece: pieceAt(SILL.file, origin, turn, y - SILL.height) });
    }
  });
  return found;
}

// The things on the roofs (`roof` in the layout: a list of { kind, u, v } where kind is a key of ROOF_FEATURES, and u and v are east and
// north of the middle of the roof), as boxes standing on it, each { name, kind, minX, maxX, minY, maxY, minZ, maxZ, color }.
function roofThings(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const boxes = buildingBoxes(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    for (const thing of entries[index].roof || []) {
      const kind = ROOF_FEATURES[thing.kind];
      const roof = boxes[index];
      const x = (roof.minX + roof.maxX) / 2 + thing.u;
      const z = (roof.minZ + roof.maxZ) / 2 + thing.v;
      found.push({ ...turnedBox(`${placement.name} ${thing.kind}`, x, z, kind.width, kind.depth, 0, 0, 0), minY: placement.roof, maxY: placement.roof + kind.height, kind: thing.kind, color: kind.color });
    }
  });
  return found;
}

// Everything in the district to stand on, hang from and climb that is not a building, as boxes: the fire escapes, their planters, the sills and the
// things on the roofs.
function propBoxes(grid = GRID, layouts = LAYOUTS) {
  return [...fireEscapes(grid, layouts).flatMap((escape) => [...escape.boxes, escape.planter.box]), ...sills(grid, layouts), ...roofThings(grid, layouts)];
}

// The files the props need, once each: for loading them.
function propPieces(grid = GRID, layouts = LAYOUTS) {
  const wanted = new Set();
  for (const escape of fireEscapes(grid, layouts)) {
    for (const piece of escape.pieces) wanted.add(piece.piece);
    wanted.add(PLANTER.file);
  }
  if (sills(grid, layouts).length > 0) wanted.add(SILL.file);
  return [...wanted];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes, sills, roofThings, propBoxes, propPieces };
} else {
  Object.assign(window, { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes, sills, roofThings, propBoxes, propPieces });
}
