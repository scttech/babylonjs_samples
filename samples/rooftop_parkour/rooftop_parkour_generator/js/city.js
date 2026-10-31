// The city: what the generator's blocks are made into. A city is { seed, grid, layouts, crossings, start, route, par }, the same shape as the handmade district (HANDMADE),
// so the game asks for either and does not know which it has. The rules of what can be jumped are not the generator's: they are the runner's. A gap is only a
// crossing if a bot that plays the game (reach.js) makes it, and a city is only a city if every building can be got onto from the street (routes.js, which the tests
// ask of many seeds). (It uses the generator, the plan, the props, the goals, the bot and the routes, which come first.) See ../tests/city.tests.js.

// The jumps between roofs of a layout that the bot makes, as a list of { from, to } (the numbers of two buildings, in the order of buildingPlacements): every pair
// whose walls are a jumpable gap apart, with the roof of the second lower than the roof of the first, tried by the bot, nearest gaps first, as many as the table
// keeps. (The roof of a building in two levels is its upper roof.)
function findCrossings(grid, layouts, table = CITY) {
  const env = districtWorld(grid, layouts, []);
  const feet = env.placed.map((placement) => footprint(placement));
  const candidates = [];
  for (let from = 0; from < feet.length; from++) {
    for (let to = 0; to < feet.length; to++) {
      if (from === to) continue;
      const { overlap, gap } = boxGap(feet[from], feet[to]);
      if (overlap || gap < table.gap[0] || gap > table.gap[1]) continue;
      if (env.roofs[from].maxY - env.roofs[to].maxY < table.minDrop) continue;
      candidates.push({ from, to, gap });
    }
  }
  candidates.sort((a, b) => a.gap - b.gap || a.from - b.from || a.to - b.to);
  const made = [];
  for (const { from, to } of candidates) {
    if (made.length >= table.maxCrossings) break;
    if (playCrossing(env.world, env.ledges, env.roofs[from], env.roofs[to]).landed) made.push({ from, to });
  }
  return made;
}

// Where the runner begins: on the street in front of the first building's fire escape, past its planter, facing it. { x, z, heading }.
function cityStart(grid, layouts, table = CITY) {
  const escape = fireEscapes(grid, layouts)[0];
  const spot = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 0, PLANTER.out + table.startOut);
  return { x: Math.round(spot.x * 10) / 10, z: Math.round(spot.z * 10) / 10, heading: Math.atan2(escape.x - spot.x, escape.z - spot.z) };
}

// The route of the trial for a city: up the fire escape of the building that is nearest the start and has a jump from it, and across that jump. [from, to].
function cityRoute(grid, layouts, crossings, start) {
  const escapes = fireEscapes(grid, layouts);
  const distance = (crossing) => {
    const escape = escapes.find((e) => e.building === crossing.from);
    return Math.hypot(escape.planter.x - start.x, escape.planter.z - start.z);
  };
  const best = crossings.reduce((a, b) => (distance(b) < distance(a) ? b : a));
  return [best.from, best.to];
}

// The par of the trial of a city, in seconds: how long the bot takes to run it (up the fire escape of the first building of the route, and the ledge if it has
// one, across the jump, down to the street and back to the start), to the whole second. The par of the handmade district was made the same way.
function cityPar(city, env = districtWorld(city.grid, city.layouts, city.crossings)) {
  const [first, second] = city.route;
  const edges = [{ kind: "escape", from: -1, to: first, time: playEscape(env.world, env.ledges, env.escapes.find((e) => e.building === first), env.reached[first]).time }];
  if (env.placed[first].ledge > 0) edges.push({ kind: "climb", from: first, to: first, time: playClimb(env.world, env.ledges, env.reached[first], env.roofs[first]).time });
  edges.push({ kind: "crossing", from: first, to: second, time: playCrossing(env.world, env.ledges, env.roofs[first], env.roofs[second]).time });
  return Math.round(trialEstimate(env, edges, trialCheckpoints(city.grid, city.layouts, city.start, city.route), city.route));
}

// The handmade district, as a city (the same shape as what the generator makes), so that the game can ask for either.
const HANDMADE = { seed: null, grid: GRID, layouts: LAYOUTS, crossings: CROSSINGS, start: START, route: TRIAL_ROUTE, par: TRIAL.par };

// A city from a seed: { seed, grid, layouts, crossings, start, route, par }. `blocks` is [east, north] (the table's, if it is left out). A layout with no jump in it
// (which is a dull city) is made again with the next numbers from the same seed.
function generateCity(seed, { blocks = CITY.blocks, table = CITY } = {}) {
  const random = cityRandom(seed);
  const grid = { ...GRID, blocksX: blocks[0], blocksZ: blocks[1] };
  for (let attempt = 0; attempt < 20; attempt++) {
    const layouts = {};
    for (let a = 0; a < grid.blocksX; a++) for (let b = 0; b < grid.blocksZ; b++) layouts[`${a},${b}`] = fitBlock(`${a},${b}`, random, grid, table);
    const crossings = findCrossings(grid, layouts, table);
    if (crossings.length === 0) continue;
    const start = cityStart(grid, layouts, table);
    const city = { seed, grid, layouts, crossings, start, route: cityRoute(grid, layouts, crossings, start) };
    return { ...city, par: cityPar(city) };
  }
  throw new Error(`No city could be made from the seed ${seed}`);
}

// Which city a page asks for: the handmade district, unless the address has `seed=` and a number (or `seed=random`, a number made now). `random` is given so a test
// can say what "random" is.
function cityFor(search, random = Math.random) {
  const seed = new URLSearchParams(search).get("seed");
  if (seed === null) return HANDMADE;
  const number = seed === "random" || seed === "" ? Math.floor(random() * 1e6) : Number(seed);
  return Number.isFinite(number) ? generateCity(Math.abs(Math.floor(number))) : HANDMADE;
}

// A few words that say what a city is.
function describeCity(city) {
  const placed = buildingPlacements(city.grid, city.layouts);
  const name = city.seed === null ? "The handmade district" : `City ${city.seed}`;
  return `${name}: ${city.grid.blocksX} by ${city.grid.blocksZ} blocks, ${placed.length} buildings, ${city.crossings.length} ${city.crossings.length === 1 ? "jump" : "jumps"}`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findCrossings, cityStart, cityRoute, cityPar, HANDMADE, generateCity, cityFor, describeCity };
} else {
  Object.assign(window, { findCrossings, cityStart, cityRoute, cityPar, HANDMADE, generateCity, cityFor, describeCity });
}
