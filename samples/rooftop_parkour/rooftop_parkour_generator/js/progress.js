// How much of the game has loaded, as one number, so the loading screen can show a bar and a percentage. The game loads a lot
// of files (every building, the street, the runner), and they are not all the same size, so each one is given a weight (how
// much of the waiting it is: its size in kilobytes will do), and the progress is the weight that has loaded out of all of it.
// This has no Babylon.js and no page in it, so it is easy to test. See ../tests/progress.tests.js.

class LoadProgress {
  constructor() {
    this.items = new Map(); // name -> { weight, done } where done is from 0 to 1
    this.listeners = [];
  }

  // Says that something has to be loaded, and how much of the wait it is. Adding it again changes its weight.
  add(name, weight) {
    const item = this.items.get(name) || { weight: 1, done: 0 };
    item.weight = weight > 0 ? weight : 1;
    this.items.set(name, item);
    this._changed();
  }

  // Says how much of one thing has loaded, from 0 to 1. A bar that goes backwards is confusing, so it never goes down. Something
  // that was never added is added with a weight of 1.
  update(name, fraction) {
    if (!this.items.has(name)) this.items.set(name, { weight: 1, done: 0 });
    const item = this.items.get(name);
    const clean = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
    item.done = Math.max(item.done, clean);
    this._changed();
  }

  complete(name) {
    this.update(name, 1);
  }

  // How much has loaded, from 0 to 1. With nothing to load, there is nothing to wait for, so it is 1.
  get fraction() {
    let total = 0;
    let loaded = 0;
    for (const item of this.items.values()) {
      total += item.weight;
      loaded += item.weight * item.done;
    }
    return total === 0 ? 1 : loaded / total;
  }

  // A whole number of percent. It says 100 only when everything is done, not when it is nearly there.
  get percent() {
    return this.fraction >= 1 ? 100 : Math.min(99, Math.floor(this.fraction * 100));
  }

  get done() {
    return this.fraction >= 1;
  }

  // The name of something that is still loading (the heaviest one), for the line of words under the bar. Or null if all is done.
  get busy() {
    let heaviest = null;
    for (const [name, item] of this.items) {
      if (item.done < 1 && (!heaviest || item.weight > this.items.get(heaviest).weight)) heaviest = name;
    }
    return heaviest;
  }

  // Calls `listener` every time something changes.
  onChange(listener) {
    this.listeners.push(listener);
  }

  _changed() {
    for (const listener of this.listeners) listener(this);
  }
}

// Moves a number toward where it is going, a share of the way each second, so a bar glides instead of jumping when a big file
// finishes. It never overshoots, and it never goes backwards. `rate` is how quickly: 6 closes most of the gap in half a second.
function easeToward(shown, target, dt, rate = 6) {
  if (target <= shown) return shown;
  return shown + (target - shown) * (1 - Math.exp(-rate * dt));
}

// A fraction as the words on the loading screen: 0.426 is "42%".
function formatPercent(fraction) {
  if (fraction >= 1) return "100%";
  return `${Math.min(99, Math.max(0, Math.floor(fraction * 100)))}%`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LoadProgress, easeToward, formatPercent };
} else {
  Object.assign(window, { LoadProgress, easeToward, formatPercent });
}
