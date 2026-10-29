// The world as the runner's body meets it: the ground, and a list of solid boxes (the buildings). Two questions are asked of it. What is
// there to stand on under a place (supportAt)? And what is in the way of a body moving along (push)? Both are plain arithmetic on boxes, with
// no Babylon.js and no page, so they are tested exactly. A box is { minX, maxX, minY, maxY, minZ, maxZ }, as the plan makes them. See
// ../tests/collision.tests.js.

class World {
  // `boxes` are the solid things, and `ground` says how high the ground is at a place (x, z). It is what is under everything: the road,
  // the sidewalk, and the floor of an alley.
  constructor({ boxes = [], ground = () => 0 } = {}) {
    this.boxes = boxes;
    this.ground = ground;
  }

  // The height of the highest thing to stand on at (x, z) that is at or below `topY`: the top of a box that the place is over (to within
  // `reach` of its edge, so that standing with only a heel over the edge still holds), or the ground. A box whose top is above `topY` is
  // not under the feet, it is beside them or over them, and is not counted. With a `topY` of Infinity it is the highest of all.
  supportAt(x, z, reach, topY) {
    let best = this.ground(x, z);
    for (const box of this.boxes) {
      if (box.maxY > topY || box.maxY <= best) continue;
      if (x < box.minX - reach || x > box.maxX + reach || z < box.minZ - reach || z > box.maxZ + reach) continue;
      best = box.maxY;
    }
    return best;
  }

  // The boxes that are walls to a body whose feet are at height `y` and that is `height` tall: those that reach up higher than the body can
  // step (`stepHeight`) and that start below its head. A box whose top is only a step above the feet is something to climb onto, not a wall,
  // and a box that is all above the head is something to walk under.
  wallsAt(y, height, stepHeight) {
    return this.boxes.filter((box) => box.maxY > y + stepHeight && box.minY < y + height);
  }

  // Pushes a body out of the walls, as a circle of `radius` on the ground at (x, z): where it should be, { x, z }. It takes two passes, so
  // that being pushed out of one wall doesn't leave it in the next.
  push(x, z, radius, y, height, stepHeight) {
    const walls = this.wallsAt(y, height, stepHeight);
    let at = { x, z };
    for (let pass = 0; pass < 2; pass++) {
      for (const wall of walls) at = pushOutOfBox(at.x, at.z, radius, wall);
    }
    return at;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { World };
} else {
  window.World = World;
}
