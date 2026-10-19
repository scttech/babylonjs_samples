// The ships the player can choose from on the title screen. Each entry is a
// model file plus the turn needed to make that model sit the way the game wants
// it: nose pointing up the screen (+y), with its top toward the camera. Every
// artist builds models facing a different way, so each one gets its own
// correction, found by looking at it. The game looks straight down the z axis,
// and a ship at angle 0 points along +y.
//
// ShipPicker is only the choosing: which entry is selected, and stepping to the
// next or previous one. It knows nothing about models or the screen. See
// ../tests/ships.tests.js.
const SHIPS = [
  { id: "rocket", name: "Rocket", file: "arunangshubanerjee-rocket-ship-2090.glb", rotation: { x: 0, y: 0, z: 0 } },
  { id: "fighter", name: "Fighter", file: "spaceship.glb", rotation: { x: 0, y: -Math.PI / 2, z: Math.PI / 2 } },
];

class ShipPicker {
  constructor(ships = SHIPS, index = 0) {
    this.ships = ships;
    this.index = index;
  }

  // The entry that is selected right now.
  get current() {
    return this.ships[this.index];
  }

  // Moves to the next ship (direction 1) or the previous one (direction -1),
  // wrapping around at either end, and returns the new selection.
  step(direction) {
    const count = this.ships.length;
    this.index = (((this.index + direction) % count) + count) % count;
    return this.current;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHIPS, ShipPicker };
} else {
  window.SHIPS = SHIPS;
  window.ShipPicker = ShipPicker;
}
