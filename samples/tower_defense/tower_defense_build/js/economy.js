// Gold: what a tower costs and what there is to spend. The prices are in the BENDERS table, and
// the numbers about money that are not a price are in ECONOMY. A wallet knows only how much there is,
// and whether it can pay. See ../tests/economy.tests.js.

const ECONOMY = {
  startGold: 400, // what there is at the start
  trickle: 12, // gold a second that comes in for now, with no one to defeat: the next tutorial pays for defeats instead
};

class Wallet {
  constructor(gold = ECONOMY.startGold) {
    this.gold = gold;
  }

  // Whether there is enough to pay `cost`.
  canAfford(cost) {
    return this.gold >= cost;
  }

  // Pays `cost`, if there is enough, and says whether it did. If there is not enough, nothing is taken.
  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost;
    return true;
  }

  // Takes in `amount`.
  earn(amount) {
    this.gold += amount;
  }

  // What to show: whole gold, rounded down (gold that comes in a bit at a time has a fraction, and 99.9 is not 100).
  get shown() {
    return Math.floor(this.gold);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ECONOMY, Wallet };
} else {
  Object.assign(window, { ECONOMY, Wallet });
}
