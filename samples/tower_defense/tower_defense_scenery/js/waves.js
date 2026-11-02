// The waves: who comes, in what order, and when. A wave is a few groups of one kind of enemy, one group after
// another, and it is data: a table. A *spawner* is walked through a wave by time, and says which enemies have
// come on in that time. Nothing here knows about models or the scene. See ../tests/waves.tests.js.

// The waves, in order. A group is `count` enemies of one `kind`, `gap` seconds apart; the next group begins
// `wait` seconds after the last of this one comes on (2.5 seconds if it doesn't say).
const WAVES = [
  { groups: [{ kind: "grunt", count: 6, gap: 1.8 }] },
  { groups: [{ kind: "grunt", count: 8, gap: 1.5 }] },
  { groups: [{ kind: "grunt", count: 8, gap: 1.2 }, { kind: "scout", count: 5, gap: 0.9 }] },
  { groups: [{ kind: "dai_li", count: 6, gap: 1.4 }, { kind: "grunt", count: 8, gap: 1.0 }] },
  { groups: [{ kind: "heavy", count: 3, gap: 2.5 }, { kind: "scout", count: 10, gap: 0.7 }] },
  { groups: [{ kind: "dai_li", count: 7, gap: 1.3 }, { kind: "scout", count: 5, gap: 0.9 }] },
  { groups: [{ kind: "heavy", count: 4, gap: 2.2 }, { kind: "grunt", count: 8, gap: 1.0 }] },
  { groups: [{ kind: "scout", count: 12, gap: 0.6 }, { kind: "dai_li", count: 8, gap: 1.0 }, { kind: "heavy", count: 3, gap: 2.2 }] },
  { groups: [{ kind: "heavy", count: 8, gap: 1.6 }, { kind: "spirit", count: 1, gap: 1 }] },
  { groups: [{ kind: "grunt", count: 12, gap: 0.7 }, { kind: "heavy", count: 6, gap: 1.6 }, { kind: "spirit", count: 3, gap: 3.0 }] },
];

const WAVE_TOUGHER = 0.12; // each wave is this much tougher (as a share of what the table says) than the one before it
const GROUP_WAIT = 2.5; // the pause between two groups of a wave, if the group doesn't say

// How much tougher than the table the enemies of a wave are: the first (number 0) is not.
function healthScaleFor(index) {
  return 1 + WAVE_TOUGHER * index;
}

// Every enemy of a wave, with the time at which it comes on: [{ time, kind }], in order of time.
function scheduleOf(wave) {
  const schedule = [];
  let time = 0;
  for (const group of wave.groups) {
    for (let n = 0; n < group.count; n++) {
      schedule.push({ time, kind: group.kind });
      if (n < group.count - 1) time += group.gap;
    }
    time += group.wait === undefined ? GROUP_WAIT : group.wait;
  }
  return schedule;
}

// How many enemies there are in a wave, and what they are worth if all are defeated.
function countIn(wave) {
  return wave.groups.reduce((sum, group) => sum + group.count, 0);
}

function rewardOf(wave, enemies = ENEMIES) {
  return wave.groups.reduce((sum, group) => sum + group.count * enemies[group.kind].reward, 0);
}

// Walks through a wave by time. `update(dt)` says which enemies came on in that time, as a list of kinds, in order.
class Spawner {
  constructor(wave) {
    this.schedule = scheduleOf(wave);
    this.next = 0; // how many have come on
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    const kinds = [];
    while (this.next < this.schedule.length && this.schedule[this.next].time <= this.time) kinds.push(this.schedule[this.next++].kind);
    return kinds;
  }

  // Whether every enemy of the wave has come on.
  get finished() {
    return this.next >= this.schedule.length;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WAVES, WAVE_TOUGHER, GROUP_WAIT, healthScaleFor, scheduleOf, countIn, rewardOf, Spawner };
} else {
  Object.assign(window, { WAVES, WAVE_TOUGHER, GROUP_WAIT, healthScaleFor, scheduleOf, countIn, rewardOf, Spawner });
}
