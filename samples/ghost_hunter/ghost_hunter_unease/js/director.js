// The director: the part of the game that decides what turns up, where and when. A horror game is not a pile of monsters; it is a
// rhythm: a quiet that goes on a little too long, a dread that builds, a strike, and a rest to get your breath before it starts again. The
// director keeps a number for that, the **tension**, which rises while nothing happens and falls when something does, and when it is high
// enough it sends for a creature. It also decides where: out of sight first (behind you, at the edge of the view, to the side), and
// never in the middle of the screen, where a thing that pops in is only a thing that popped in. Everything is plain arithmetic of
// the player's position and the time, with the randomness given in, so a test can run a whole hunt. (It uses toRadians and toDegrees
// from look.js.) See ../tests/director.tests.js.

const HUNT = {
  enabled: true,
  intensity: 1, // how hard it is: multiplies how fast the dread builds (the rounds of a later step change it)
  riseRate: 0.02, // tension a second while it is quiet, at an intensity of 1: something about every half minute
  spawnAt: [0.65, 0.95], // the tension at which it strikes: a number between these, chosen each time, so it is never on the beat
  afterSpawn: 0.35, // the tension left after something turns up
  afterScare: 0.1, // and after the player has been got at
  cooldown: 25, // seconds after a scare in which nothing new turns up: the rest
  maxActive: 2, // creatures alive at once, at an intensity of 1 (it rises with the intensity)
  distance: [4.5, 8], // metres from the player at which something turns up
  edgeMargin: [8, 40], // degrees beyond the edge of the view that the edge zone starts and ends
  zones: [
    { name: "behind", from: 120, to: 240, weight: 3 }, // degrees from straight ahead, going round to the right
    { name: "edge", weight: 2 }, // just outside the view, on either side
    { name: "flank", from: 80, to: 115, weight: 1 }, // and its mirror
  ],
  kinds: [
    { kind: "spider", weight: [4, 2], from: 0 }, // weight at no tension and at full tension; from: the intensity it begins at
    { kind: "skeleton", weight: [1, 3], from: 0.8 },
    { kind: "ghoul", weight: [0, 3], from: 1 },
    { kind: "doll", weight: [0, 2], from: 0.8 },
    { kind: "floater", weight: [0, 2], from: 1.2 },
    { kind: "horde", weight: [0, 1], from: 1.8 },
  ],
  dropHeight: 2.3, // a spider that comes down from the ceiling starts this high
  dropChance: 0.4, // how often a spider does
  viewMargin: 6, // degrees: a point this close to the view's edge counts as in it
};

// The half-angle of what the camera sees from side to side, from the field of view top to bottom and the shape of the screen. (A phone
// held upright sees much less sideways than a laptop.)
function horizontalHalfFov(verticalDegrees, aspect) {
  return toDegrees(Math.atan(Math.tan(toRadians(verticalDegrees) / 2) * aspect));
}

// Which way a point is from the player, in degrees from straight ahead (the way the player faces on the floor) going round to the
// right: -180 to 180.
function bearingTo(player, point) {
  const facing = Math.atan2(player.forward[0], player.forward[2]);
  const toward = Math.atan2(point[0] - player.position[0], point[2] - player.position[2]);
  let difference = toDegrees(toward - facing);
  difference = ((difference + 180) % 360 + 360) % 360 - 180;
  return difference;
}

// Is a point in the view, or close to it?
function inView(player, point, halfFov, margin = HUNT.viewMargin) {
  return Math.abs(bearingTo(player, point)) <= halfFov + margin;
}

// A point on the floor, `distance` metres from the player, `bearing` degrees from straight ahead.
function pointAt(player, bearing, distance) {
  const facing = Math.atan2(player.forward[0], player.forward[2]);
  const angle = facing + toRadians(bearing);
  return [player.position[0] + Math.sin(angle) * distance, 0, player.position[2] + Math.cos(angle) * distance];
}

// Where a point is on a small map with the player in the middle and the way it faces at the top, `scale` pixels to the metre, on a
// square of `size` pixels. Nothing in the game uses it: it is for the developer panel, to see what the director is doing.
function mapPoint(player, point, scale, size) {
  const bearing = toRadians(bearingTo(player, point));
  const distance = Math.hypot(point[0] - player.position[0], point[2] - player.position[2]);
  return [size / 2 + Math.sin(bearing) * distance * scale, size / 2 - Math.cos(bearing) * distance * scale];
}

// A pick from a list of { weight }, with `random` giving a number from 0 up to 1.
function pickWeighted(items, weightOf, random) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  if (total <= 0) return null;
  let at = random() * total;
  for (const item of items) {
    at -= weightOf(item);
    if (at < 0) return item;
  }
  return items[items.length - 1];
}

// The bearing range of a zone: the edge zone depends on the view, and is on a side, which is picked here.
function zoneRange(zone, halfFov, table, random) {
  if (zone.name === "edge") {
    const side = random() < 0.5 ? -1 : 1;
    const [a, b] = table.edgeMargin;
    return [side * (halfFov + a), side * (halfFov + b)].sort((x, y) => x - y);
  }
  if (zone.name === "flank") {
    const side = random() < 0.5 ? -1 : 1;
    return [side * zone.from, side * zone.to].sort((x, y) => x - y);
  }
  return [zone.from, zone.to];
}

// Where something should turn up: a zone, a bearing in it and a distance, and the point. Nothing if the point would be in the view
// (which can happen when the view is very wide, and an edge is behind you).
function chooseSpawn(player, halfFov, table, random) {
  const zone = pickWeighted(table.zones, (z) => z.weight, random);
  const [from, to] = zoneRange(zone, halfFov, table, random);
  const bearing = from + random() * (to - from);
  const distance = table.distance[0] + random() * (table.distance[1] - table.distance[0]);
  const point = pointAt(player, bearing, distance);
  if (inView(player, point, halfFov, table.viewMargin)) return null;
  return { zone: zone.name, bearing, distance, point };
}

// Which kind: the weights go from the first to the second number as the tension goes from 0 to 1, and a kind that is not yet allowed at
// this intensity has none.
function chooseKind(tension, intensity, table, random) {
  return pickWeighted(table.kinds, (k) => (intensity >= k.from ? k.weight[0] + (k.weight[1] - k.weight[0]) * tension : 0), random);
}

class Director {
  constructor(table = HUNT, random = Math.random) {
    this.table = table;
    this.random = random;
    this.tension = 0;
    this.resting = 0; // seconds of rest left
    this.target = this._nextTarget();
    this.spawned = 0;
    this.scares = 0;
  }

  _nextTarget() {
    const [low, high] = this.table.spawnAt;
    return low + this.random() * (high - low);
  }

  // How many creatures at once the intensity allows.
  get limit() {
    return Math.max(1, Math.round(this.table.maxActive * Math.sqrt(this.table.intensity)));
  }

  // The player has been got at: the strike was a success. The dread drops, and there is a rest.
  noteScare() {
    this.scares += 1;
    this.tension = Math.min(this.tension, this.table.afterScare);
    this.resting = this.table.cooldown;
  }

  // Time going by. `world` is { player, halfFov, active }: where the player is and what it sees, and how many creatures are alive. Gives
  // the orders for this frame (none, most of the time): { kind, point, zone, height }.
  update(seconds, world) {
    const table = this.table;
    const orders = [];
    if (!table.enabled) return orders;
    if (this.resting > 0) {
      this.resting = Math.max(0, this.resting - seconds);
      return orders;
    }
    if (world.active >= this.limit) {
      this.tension = Math.min(this.tension, this.target); // it waits, and does not store it up
      return orders;
    }
    this.tension = Math.min(1, this.tension + table.riseRate * table.intensity * seconds);
    if (this.tension < this.target) return orders;

    const spot = chooseSpawn(world.player, world.halfFov, table, this.random);
    if (!spot) return orders; // not now: it tries again next frame
    const pick = chooseKind(this.tension, table.intensity, table, this.random);
    if (!pick) return orders;
    const height = pick.kind === "spider" && this.random() < table.dropChance ? table.dropHeight : 0;
    orders.push({ kind: pick.kind, point: [spot.point[0], height, spot.point[2]], zone: spot.zone });
    this.tension = table.afterSpawn;
    this.target = this._nextTarget();
    this.spawned += 1;
    return orders;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind, Director };
} else {
  Object.assign(window, { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind, Director });
}
