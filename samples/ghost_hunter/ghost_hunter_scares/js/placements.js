// Placements: the places the player has marked in the room. A placement is a point on a surface, and a kind (later the places where the
// dead gather). With WebXR a placement can be given an anchor, which is how the phone keeps it where it was put when its idea of the
// room is corrected as it learns more. The list is plain data and rules, so it is tested without a phone.
// See ../tests/placements.tests.js.

const PLACEMENT = {
  max: 8, // how many at a time: past this the oldest goes
  minSeparation: 0.5, // metres: a place this close to another is the same place
};

class Placements {
  constructor(table = PLACEMENT) {
    this.table = table;
    this.items = [];
    this.nextId = 1;
    this.listeners = [];
  }

  // Calls `callback(change)` for every change: { type: "added" | "removed", item }.
  onChange(callback) {
    this.listeners.push(callback);
  }

  _tell(type, item) {
    for (const callback of this.listeners) callback({ type, item });
  }

  // Marks a surface. Gives the new placement, or null if there is already one so close that it is the same place. When there are too
  // many, the oldest goes, and is told of as removed before the new one is told of as added.
  add(surface, kind = "marker") {
    const near = this.items.some((item) => Math.hypot(item.point[0] - surface.point[0], item.point[2] - surface.point[2]) < this.table.minSeparation);
    if (near) return null;
    const item = { id: this.nextId++, kind, point: surface.point.slice(), normal: surface.normal.slice(), anchored: false };
    this.items.push(item);
    while (this.items.length > this.table.max) this.remove(this.items[0].id);
    this._tell("added", item);
    return item;
  }

  get(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  remove(id) {
    const item = this.get(id);
    if (!item) return false;
    this.items = this.items.filter((other) => other !== item);
    this._tell("removed", item);
    return true;
  }

  clear() {
    for (const item of [...this.items]) this.remove(item.id);
  }

  // Says that the phone has anchored a placement, and where the anchor has it now (its point is moved to match).
  anchor(id, point) {
    const item = this.get(id);
    if (!item) return false;
    item.anchored = true;
    if (point) item.point = point.slice();
    return true;
  }

  // The placement nearest to a point (on the floor plan), and how far, or null if there are none.
  nearest(point) {
    let best = null;
    for (const item of this.items) {
      const distance = Math.hypot(item.point[0] - point[0], item.point[2] - point[2]);
      if (!best || distance < best.distance) best = { item, distance };
    }
    return best;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLACEMENT, Placements };
} else {
  Object.assign(window, { PLACEMENT, Placements });
}
