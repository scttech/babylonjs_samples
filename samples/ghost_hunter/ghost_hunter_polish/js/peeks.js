// Peeks: a creature that leans out for a second or two and goes back, and the jump scare that is the same thing without the leaning (a **pop**).
// The game knows very little of the room, so a peek comes from one of two places. The first is the edge of the view: the creature is just
// outside the picture, leans in until half of it can be seen, and draws back, so the edge of the screen is the corner. The second is a spot
// the player has marked (the foot of a doorway, the end of a wall): it leans out of that. This file works out where a peek goes and when one
// comes, with the randomness given in, so a test can run a whole game of them. (It uses bearingTo, inView and pickWeighted from director.js.)
// See ../tests/peeks.tests.js.

const PEEKS = {
  enabled: true,
  first: [15, 30], // seconds before the first
  gap: [22, 45], // seconds between one and the next
  popChance: 0.25, // how often it is a pop and not a peek
  popGapFactor: 1.6, // and a pop makes the quiet after it longer
  maxActive: 1, // creatures alive at once, at which no peek comes
  distance: [2.8, 3.8], // metres from the player
  popDistance: [2.2, 3],
  hidden: 10, // degrees past the edge of the view that the middle of the creature is, while it is hidden
  leaned: 1, // degrees inside the edge that it is when it has leaned out
  spotChance: 0.6, // how often it is a marked spot, when there is one in view
  spotRange: [2.5, 9], // how far a marked spot may be
  spotBehind: [0.6, 0.5], // metres: how far to the side and back from a spot it waits
  spotLean: 0.35, // and how far past the spot it leans
  kinds: [
    { kind: "ghoul_girl", weight: 2 },
    { kind: "doll", weight: 3 },
    { kind: "mummy", weight: 1 },
    { kind: "skeleton", weight: 2 },
    { kind: "spider", weight: 2 },
  ],
};

const between = (range, random) => range[0] + random() * (range[1] - range[0]);

// A peek from the edge of the view: { from, to, side, pop }, the points as [x, z]. `side` is 1 for the right edge, -1 for the left.
function peekAtEdge(player, halfFov, table, random, pop = false) {
  const side = random() < 0.5 ? -1 : 1;
  const distance = between(pop ? table.popDistance : table.distance, random);
  const hidden = pointAt(player, side * (halfFov + table.hidden), distance);
  const leaned = pointAt(player, side * (halfFov - table.leaned), distance);
  return { from: [hidden[0], hidden[2]], to: [leaned[0], leaned[2]], side, pop };
}

// A peek from a marked spot (a point on the floor): it waits behind it, to the side and back, and leans out past it towards the middle of the view.
function peekAtSpot(player, spot, table, pop = false) {
  const dx = spot[0] - player.position[0];
  const dz = spot[2] - player.position[2];
  const length = Math.hypot(dx, dz) || 1;
  const along = [dx / length, dz / length];
  let across = [along[1], -along[0]]; // sideways, to one side of the line of sight
  const towardMiddle = (sign) => Math.abs(bearingTo(player, [spot[0] + across[0] * sign * 0.1, 0, spot[2] + across[1] * sign * 0.1]));
  if (towardMiddle(1) < towardMiddle(-1)) across = [-across[0], -across[1]]; // across points away from the middle of the view
  const side = bearingTo(player, spot) >= 0 ? 1 : -1;
  const [aside, back] = table.spotBehind;
  const from = [spot[0] + across[0] * aside + along[0] * back, spot[2] + across[1] * aside + along[1] * back];
  const to = [spot[0] - across[0] * table.spotLean, spot[2] - across[1] * table.spotLean];
  return { from, to, side, pop };
}

// The one that sends peeks. `update` is told how things are and gives an order, { kind, peek }, when one is due, and nothing the rest of the time.
class Peeker {
  constructor(table = PEEKS, random = Math.random) {
    this.table = table;
    this.random = random;
    this.timer = between(table.first, random);
    this.last = "none";
  }

  // `state` is { player, halfFov, spots, active, playing }: `spots` are the marked points, [x, y, z], and `active` is how many creatures are alive.
  update(seconds, state) {
    const table = this.table;
    if (!table.enabled || !state.playing) return null;
    this.timer -= seconds;
    if (this.timer > 0) return null;
    if (state.active >= table.maxActive) {
      this.timer = 2; // not now: soon
      return null;
    }
    const pop = this.random() < table.popChance;
    this.timer = between(table.gap, this.random) * (pop ? table.popGapFactor : 1);
    return this.order(state, pop);
  }

  // An order for a peek (or a pop) now, whether one is due or not.
  order(state, pop) {
    const table = this.table;
    const kind = pickWeighted(table.kinds, (k) => k.weight, this.random).kind;
    const near = (state.spots || []).filter((spot) => {
      const distance = Math.hypot(spot[0] - state.player.position[0], spot[2] - state.player.position[2]);
      return distance >= table.spotRange[0] && distance <= table.spotRange[1] && inView(state.player, spot, state.halfFov, 0);
    });
    const fromSpot = near.length > 0 && this.random() < table.spotChance;
    const peek = fromSpot ? peekAtSpot(state.player, near[Math.floor(this.random() * near.length)], table, pop) : peekAtEdge(state.player, state.halfFov, table, this.random, pop);
    this.last = `${pop ? "pop" : "peek"} ${kind} from ${fromSpot ? "a marked spot" : "the edge"}`;
    return { kind, peek };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PEEKS, peekAtEdge, peekAtSpot, Peeker };
} else {
  Object.assign(window, { PEEKS, peekAtEdge, peekAtSpot, Peeker });
}
