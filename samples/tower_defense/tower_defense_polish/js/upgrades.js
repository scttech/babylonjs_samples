// Levels: a tower can be made better for gold, twice. A level is a row of a table, and what it says is *how much
// better*: more harm in a hit, a longer reach, and faster (the attack is played faster, and the wait for the next is
// shorter, by the same amount). What a tower can do at a level is the bender's own row of the BENDERS table with those
// numbers worked into it (`statsFor`), so that a brain that is given it needs to know nothing of levels. This file
// is the numbers and the rules for paying; the tower that shows it is in tower.js. See ../tests/upgrades.tests.js.

// One row for each level, the first (which is the bender as it is) to the last. `cost` is what it costs to get to
// the level from the one before, as a share of what the podium cost, and the others say how many times as much of
// each thing there is at the level as at the first. `potency` is how much stronger its effect is (see effects.js).
const LEVELS = [
  { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1, potency: 1 },
  { name: "Adept", cost: 0.6, damage: 1.4, range: 1.1, tempo: 1.2, potency: 1.3 },
  { name: "Master", cost: 0.9, damage: 2, range: 1.2, tempo: 1.45, potency: 1.7 },
];
const MAX_LEVEL = LEVELS.length;

// A price in whole gold that ends in a five or a nought, since that is what a price looks like.
const tidy = (gold) => Math.round(gold / 5) * 5;

// What a bender can do at a level, as a row like its own in the BENDERS table (and so, for the first level, the same
// numbers): its damage and its range are more, its cooldown is shorter, and its attack is played faster.
function statsFor(spec, level) {
  const row = LEVELS[level - 1];
  return {
    ...spec,
    damage: spec.damage * row.damage,
    range: spec.range * row.range,
    cooldown: spec.cooldown / row.tempo,
    attack: { ...spec.attack, speed: spec.attack.speed * row.tempo },
    potency: row.potency,
  };
}

// What it costs to take a bender from a level to the next, or null at the last level, where there is no next.
function upgradeCost(spec, level) {
  if (level >= MAX_LEVEL) return null;
  return tidy(spec.cost * LEVELS[level].cost);
}

// What a tower has cost in all: the podium, and every upgrade it has had.
function worthOf(spec, level) {
  let gold = spec.cost;
  for (let from = 1; from < level; from++) gold += upgradeCost(spec, from);
  return gold;
}

// What selling a tower of a level gives back: a share of what it is worth.
function refundFor(spec, level) {
  return Math.floor(worthOf(spec, level) * ECONOMY.refund);
}

// Makes a tower one level better, if it can be and there is the gold. `state` is { towers, wallet }, and a tower is
// anything with a `kind`, a `level` and a `setLevel(level)`. It says { ok, reason }, and if it did not upgrade, nothing has been paid.
function tryUpgrade(state, tower, benders = BENDERS) {
  const cost = upgradeCost(benders[tower.kind], tower.level);
  if (cost === null) return { ok: false, reason: "that is as good as it gets" };
  if (!state.wallet.canAfford(cost)) return { ok: false, reason: `that costs ${cost}, and there is ${state.wallet.shown}` };
  state.wallet.spend(cost);
  tower.setLevel(tower.level + 1);
  return { ok: true, reason: "" };
}

// Takes a tower out of `state.towers` and pays for it. It says { ok, refund }; a tower that is not there is not sold.
// (It is the same list, with one fewer in it, because the game goes on using it.)
function trySell(state, tower, benders = BENDERS) {
  const at = state.towers.indexOf(tower);
  if (at < 0) return { ok: false, refund: 0 };
  const refund = refundFor(benders[tower.kind], tower.level);
  state.towers.splice(at, 1);
  state.wallet.earn(refund);
  return { ok: true, refund };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor, tryUpgrade, trySell };
} else {
  Object.assign(window, { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor, tryUpgrade, trySell });
}
