// The generator: the buildings of a city made from a seed. The handmade district is a plan (plan.js) of where each building goes, and what is on it; this makes the
// same kind of plan, by rules, block by block: a pattern for the block (one big building, two side by side, two back to back, two rows of two), buildings from the
// kit that fit it (the plan's own check, planProblems, says so), and what is on each, taken from what the handmade district was proved with. Everything is plain
// numbers and arithmetic with the randomness given in, so the same seed always makes the same blocks. (It uses the plan, which comes first.) See ../tests/generator.tests.js.

const CITY = {
  blocks: [3, 2], // how many blocks east and north, by default
  margin: 0.4, // metres a building stands from the side of its block, at the least, along the street
  fits: 40, // how many times a block is tried before it is given a plain building in the middle
  // What a block can be, and how often (the weights): one big building; two side by side; two back to back; or two rows of two.
  patterns: [
    { name: "tower", weight: 2 },
    { name: "row", weight: 2 },
    { name: "back to back", weight: 3 },
    { name: "four", weight: 2 },
  ],
  towers: ["large_1", "large_2", "large_3"],
  smaller: ["small_1", "small_2", "medium_1", "medium_2"],
  // What is on a building of each kind, as it is known to be climbable: the fire escape (its place along the front, `u`, and how high the first platform is, if
  // it is not the usual), the row of sills, and what is on the roof. The handmade district was proved with these, so the generator uses these, and moves a
  // fire escape only a little.
  escape: { small_1: { u: 2.5 }, small_2: { u: 4 }, medium_1: { u: 2.5, base: 3.6 }, medium_2: { u: 3 }, large_1: { u: 6 }, large_2: { u: 4 }, large_3: { u: 5 } },
  moveEscape: 0.4,
  sills: { small_1: { u: -3, count: 2 }, small_2: { u: -4, count: 2 }, medium_1: { u: -3, count: 3 }, medium_2: { u: -3, count: 3 }, large_1: { u: -6, count: 3 }, large_2: { u: -4, count: 3 }, large_3: { u: -5, count: 3 } },
  sillHeight: 6.9,
  roof: {
    small_1: [{ kind: "vent", u: -2, v: 2 }],
    small_2: [{ kind: "vent", u: 0, v: 0 }],
    medium_2: [{ kind: "hut", u: 3, v: 0 }, { kind: "vent", u: -3, v: 1 }],
    large_1: [{ kind: "hut", u: -5, v: 4 }, { kind: "vent", u: 4, v: -3 }, { kind: "vent", u: 6, v: 5 }],
    large_2: [{ kind: "hut", u: 2, v: 2 }],
    large_3: [{ kind: "vent", u: 0, v: 0 }],
  },
  propChance: 0.75, // how often each of the things that can be on a roof is
  // Which gaps between roofs are tried as a jump: the gap between the walls, in metres, how much lower the roof landed on must be, and how many are kept.
  gap: [2.5, 6],
  minDrop: 1,
  maxCrossings: 12,
  startOut: 3.5, // how far in front of the foot of the first fire escape the runner begins, past the planter
};

// A random number from a seed, always the same for the same seed: a number from 0 up to 1 each time it is called.
function cityRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random, low, high) => low + random() * (high - low);
const choose = (random, list) => list[Math.floor(random() * list.length)];
const chooseWeighted = (random, list) => {
  let at = random() * list.reduce((sum, item) => sum + item.weight, 0);
  for (const item of list) {
    at -= item.weight;
    if (at < 0) return item;
  }
  return list[list.length - 1];
};

// What is on a building, as the layout wants it: the fire escape, the sills, and some of what can be on the roof.
function furnish(name, random, table = CITY) {
  const escape = { ...table.escape[name] };
  escape.u = Math.round((escape.u + between(random, -table.moveEscape, table.moveEscape)) * 10) / 10;
  const entry = { escape, sills: { ...table.sills[name], y: table.sillHeight } };
  const roof = (table.roof[name] || []).filter(() => random() < table.propChance);
  if (roof.length > 0) entry.roof = roof;
  return entry;
}

// A block's buildings by a pattern, as a list of layout entries. `half` is half the size of a block. They are not yet known to fit: see fitBlock.
function layBlock(pattern, random, half, table = CITY) {
  const size = BUILDINGS;
  const side = () => (random() < 0.5 ? "north" : "south");
  // a row of buildings along one side of the block, facing the street at that side: their places along it, from the west, with the room left over shared out
  const row = (names, facing) => {
    const widths = names.map((n) => size[n].width);
    const spare = half * 2 - widths.reduce((a, b) => a + b, 0) - (names.length - 1) * MIN_ALLEY - 2 * table.margin;
    if (spare < 0) return null;
    let at = -half + table.margin + (spare > 0 ? random() * spare * 0.5 : 0);
    return names.map((n, i) => {
      const u = at + widths[i] / 2;
      at += widths[i] + MIN_ALLEY + (spare > 0 ? (random() * spare) / (names.length + 1) : 0);
      return { building: n, facing, u: Math.round(u * 10) / 10, ...furnish(n, random, table) };
    });
  };
  if (pattern === "tower") {
    const name = choose(random, table.towers);
    return [{ building: name, facing: side(), u: Math.round(between(random, -3, 3) * 10) / 10, ...furnish(name, random, table) }];
  }
  if (pattern === "row") {
    return row([choose(random, table.smaller), choose(random, table.smaller)], side());
  }
  if (pattern === "back to back") {
    const a = choose(random, table.smaller);
    const b = choose(random, table.smaller);
    const place = (n, facing) => ({ building: n, facing, u: Math.round(between(random, -half + size[n].width / 2 + table.margin, half - size[n].width / 2 - table.margin) * 10) / 10, ...furnish(n, random, table) });
    return [place(a, "north"), place(b, "south")];
  }
  const north = row([choose(random, table.smaller), choose(random, table.smaller)], "north");
  const south = row([choose(random, table.smaller), choose(random, table.smaller)], "south");
  return north && south ? [...north, ...south] : null;
}

// One block's buildings, tried until they fit (see planProblems: inside the block, no overlap, no alley narrower than MIN_ALLEY). A block that will not fit
// gets a single small building in the middle, which always does.
function fitBlock(key, random, grid, table = CITY) {
  const half = blockSize(grid) / 2;
  for (let i = 0; i < table.fits; i++) {
    const pattern = chooseWeighted(random, table.patterns).name;
    const entries = layBlock(pattern, random, half, table);
    if (entries && planProblems(grid, { [key]: entries }).length === 0) return entries;
  }
  return [{ building: "small_1", facing: "north", u: 0, ...furnish("small_1", random, table) }];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CITY, cityRandom, furnish, layBlock, fitBlock };
} else {
  Object.assign(window, { CITY, cityRandom, furnish, layBlock, fitBlock });
}
