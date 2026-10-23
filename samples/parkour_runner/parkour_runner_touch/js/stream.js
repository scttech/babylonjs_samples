// The endless street: which pieces exist right now, given how far the runner has
// run. The street is never built all at once. Pieces are made a little way ahead
// of the runner, and dropped once they are far behind, so only a few dozen pieces
// exist at a time however far the runner goes. This works out *what* to add and
// remove, as plain data (no Babylon.js), so it is easy to test; main.js does the
// adding and removing. See ../tests/stream.tests.js.
//
// Rows (road, sidewalks, lights) are generated in order, one after another, and
// each side of the street has its own line of buildings with its own random
// numbers. Because nothing is shared, the street is the same however the calls
// to update() are spaced out: the same seed always gives the same street.

const STREET_AHEAD = 150; // how far in front of the runner the street is built; about as far as the fog lets you see
const STREET_BEHIND = 30; // how far behind the runner it is kept, a little more than the camera is behind

class StreetStream {
  constructor({ seed = 1, ahead = STREET_AHEAD, behind = STREET_BEHIND } = {}) {
    this.seed = seed;
    this.ahead = ahead;
    this.behind = behind;
    this.active = new Map(); // id -> placement, for every piece that exists right now
    this._start();
  }

  // Puts the street back to before anything was built.
  _start() {
    this.nextId = 0;
    this.nextRow = -1; // the first row is one behind the start, so there is street behind the camera
    // Each side builds its own line of buildings, starting where the first row starts.
    const startZ = this.nextRow * TILE - TILE / 2;
    this.sides = [
      { side: -1, nextZ: startZ, random: seededRandom(this.seed) },
      { side: 1, nextZ: startZ, random: seededRandom(this.seed + 1) },
    ];
  }

    // Remembers a new piece, giving it an id so it can be found again to remove.
  _add(placement) {
    const piece = { ...placement, id: this.nextId++ };
    this.active.set(piece.id, piece);
    return piece;
  }

  // Brings the street up to date for a runner at `z`: builds whatever is now
  // within `ahead` of it, and drops whatever has fallen more than `behind` behind
  // it. Returns what changed: { added, removed }, each a list of placements with
  // an `id`. Calling it again for the same `z` changes nothing.
  update(z) {
    const added = [];
    const removed = [];

    const front = z + this.ahead;
    while (this.nextRow * TILE - TILE / 2 < front) {
      for (const placement of rowPieces(this.nextRow)) added.push(this._add(placement));
      this.nextRow++;
    }
    for (const side of this.sides) {
      while (side.nextZ < front) {
        const building = buildingAt(side.side, side.nextZ, side.random);
        added.push(this._add(building));
        side.nextZ = building.endZ + BUILDING_GAP * WORLD_SCALE;
      }
    }

    const back = z - this.behind;
    for (const [id, piece] of this.active) {
      if (piece.endZ < back) {
        this.active.delete(id);
        removed.push(piece);
      }
    }
    return { added, removed };
  }

  // Takes every piece away and starts the street again from the beginning, as if
  // it had never been built: the next update() builds the same street as before.
  // Returns the pieces that were taken away.
  reset() {
    const removed = [...this.active.values()];
    this.active.clear();
    this._start();
    return removed;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STREET_AHEAD, STREET_BEHIND, StreetStream };
} else {
  Object.assign(window, { STREET_AHEAD, STREET_BEHIND, StreetStream });
}
