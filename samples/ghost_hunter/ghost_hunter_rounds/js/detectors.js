// Detectors: four gadgets that say where the dead are, from the same numbers about where things are. An **EMF meter** says how near something is, in five lights;
// a **radar** sweeps round and lights a blip where something is, which fades until it is swept again; a **spirit box** is a dial that is tuned to a ghost's own
// frequency, and when it is near enough something is said; and **thermal vision** shows how cold the air round you is (the dead are cold). Nothing here is drawn, and
// no Babylon.js is in it: every gadget is plain arithmetic of the player and a list of **sources**, so a test can say what the meter reads at three metres and when the
// radar sees something behind it. A source is { key, kind, position: [x, y, z], ghost? }. (It uses bearingTo from director.js, and hash from ghost.js.) See ../tests/detectors.tests.js.

const DETECT = {
  // How strongly each kind stirs the EMF meter (a ghost most of all), how much colder the air is within reach of each kind, in degrees, and how far a gadget reaches.
  weight: { ghost: 1, spider: 0.35, ghoul: 0.6, skeleton: 0.5, mummy: 0.6, ghoul_girl: 0.8, doll: 0.7 },
  cold: { ghost: 15, spider: 3, ghoul: 5, skeleton: 8, mummy: 6, ghoul_girl: 10, doll: 9 },
  emf: { range: 9, lights: 5, curve: 1.6 }, // the strength falls with distance by this power: close is much more than far
  radar: { range: 11, period: 3.2, fade: 2.4 }, // seconds for the sweep to go round, and for a blip to fade after it was lit
  box: { range: 8, tolerance: 0.07, wordsPerSecond: 0.9, lowest: 0.1, highest: 0.9, hiss: 0.35 }, // the dial is 0 to 1; a ghost is tuned to somewhere between `lowest` and `highest`
  thermal: { room: 21, coldest: 3, range: 7, curve: 1.4 }, // degrees: the air of the room, and the least it ever reads
  words: {
    far: ["HERE", "COLD", "LISTEN", "WAIT", "WHO"],
    near: ["BEHIND YOU", "LOOK", "LEAVE", "HELP ME", "CLOSE", "TURN AROUND", "I SEE YOU"],
  },
  names: ["emf", "radar", "box", "thermal"],
};

// How far a point is from the player, on the floor.
function distanceFrom(player, position) {
  return Math.hypot(position[0] - player.position[0], position[2] - player.position[2]);
}

// How near something is as a number from 0 (out of reach) to 1 (right on you), falling off by a power of how far it is.
function nearness(distance, range, curve = 1) {
  if (distance >= range) return 0;
  return Math.pow(1 - distance / range, curve);
}

// ---- the EMF meter ----

// What the meter reads: { strength, level, nearest } where `strength` is 0 to 1 (the strongest of the sources: a ghost behind a wall is as strong as one in front),
// `level` is how many of its lights are lit, 0 to 5, and `nearest` is the key of what is making it.
function emfReading(sources, player, table = DETECT) {
  let strength = 0;
  let nearest = null;
  for (const source of sources) {
    const s = (table.weight[source.kind] ?? 0.3) * nearness(distanceFrom(player, source.position), table.emf.range, table.emf.curve);
    if (s > strength) {
      strength = s;
      nearest = source.key;
    }
  }
  strength = Math.min(1, strength);
  return { strength, level: Math.round(strength * table.emf.lights), nearest };
}

// How often the meter ticks, in times a second, for a reading: it is silent with no light, and ticks faster with each one.
function emfTickRate(level) {
  return level <= 0 ? 0 : 1.5 + level * 2.5;
}

// ---- the radar ----

// Whether a sweep that went from `before` to `now` (degrees, going round to the right) went over `target`. It can cross 360, and a sweep of a whole turn or more (a
// long frame) went over everything. Nothing moved is nothing crossed.
function sweepCrossed(before, now, target) {
  if (now === before) return false;
  if (now - before >= 360) return true;
  const wrap = (a) => ((a % 360) + 360) % 360;
  const gone = wrap(now - before);
  const to = wrap(target - before);
  return to > 0 && to <= gone;
}

class Radar {
  constructor(table = DETECT) {
    this.table = table;
    this.sweep = 0; // degrees: where the arm is
    this.blips = new Map(); // key -> { key, kind, angle, radius, light } (angle is from straight ahead going round to the right; radius is 0 at you and 1 at the edge)
  }

  // `seconds` go by. `sources` and `player` are as for the other gadgets. A source in range that the arm goes over is lit, and every blip fades.
  update(seconds, sources, player) {
    const { range, period, fade } = this.table.radar;
    const before = this.sweep;
    const after = before + (seconds / period) * 360; // not wrapped, so that a turn of more than one is known to be
    this.sweep = after % 360;
    for (const blip of this.blips.values()) blip.light = Math.max(0, blip.light - seconds / fade);
    for (const [key, blip] of this.blips) if (blip.light === 0) this.blips.delete(key);
    for (const source of sources) {
      const distance = distanceFrom(player, source.position);
      if (distance > range) continue;
      const angle = (bearingTo(player, source.position) + 360) % 360;
      // the arm is drawn with straight ahead at the top, so it is compared with the bearing from the player's own heading
      if (sweepCrossed(before, after, angle)) this.blips.set(source.key, { key: source.key, kind: source.kind, angle, radius: distance / range, light: 1 });
    }
    return [...this.blips.values()];
  }

  clear() {
    this.blips.clear();
    this.sweep = 0;
  }
}

// ---- the spirit box ----

// The frequency a ghost is tuned to, 0 to 1: its own, from its key, and always between the least and the most the dial can be set to, so that every one can be found.
function ghostFrequency(key, table = DETECT) {
  const text = String(key);
  let n = 0;
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) % 9973;
  return table.box.lowest + hash(n) * (table.box.highest - table.box.lowest);
}

// What a dial setting hears: { lock, hiss, nearest, word? }. `lock` is how well it is tuned to the nearest ghost in reach (1 is exactly, 0 is not at all) and counts
// for nothing if it is out of reach; `hiss` is the loudness of the static, which is full when it is not tuned and falls as it is. A word is said now and then, more
// often the better the lock and the nearer the ghost, and the nearer ones say harder things. `random` gives numbers from 0 up to 1, and `seconds` is how long it has been.
function boxHears(dial, sources, player, seconds, random, table = DETECT) {
  let best = null;
  for (const source of sources) {
    if (source.kind !== "ghost") continue;
    const distance = distanceFrom(player, source.position);
    if (distance > table.box.range) continue;
    const lock = Math.max(0, 1 - Math.abs(dial - ghostFrequency(source.key, table)) / table.box.tolerance);
    const near = nearness(distance, table.box.range);
    if (!best || lock * near > best.lock * best.near) best = { source, lock, near };
  }
  if (!best) return { lock: 0, hiss: 1, nearest: null };
  const chance = best.lock * best.near * table.box.wordsPerSecond * seconds;
  const hiss = 1 - best.lock * (1 - table.box.hiss);
  const result = { lock: best.lock, hiss, nearest: best.source.key };
  if (best.lock > 0 && random() < chance) {
    const list = best.near > 0.5 ? table.words.near : table.words.far;
    result.word = list[Math.floor(random() * list.length)];
  }
  return result;
}

// ---- thermal vision ----

// How warm the air is where the player stands, in degrees: the room's, less how cold each source makes it (the coldest one counts, they do not add up: a room of
// ghosts is not colder than the coldest).
function airTemperature(sources, player, table = DETECT) {
  let drop = 0;
  for (const source of sources) drop = Math.max(drop, (table.cold[source.kind] ?? 2) * nearness(distanceFrom(player, source.position), table.thermal.range, table.thermal.curve));
  return Math.max(table.thermal.coldest, table.thermal.room - drop);
}

// How strong the cold tint over the picture is, 0 (the room's own temperature) to 1 (the coldest it reads).
function chillOf(temperature, table = DETECT) {
  return Math.max(0, Math.min(1, (table.thermal.room - temperature) / (table.thermal.room - table.thermal.coldest)));
}

// How much of a ghost thermal vision shows: the cold of a ghost in reach is seen even where the light is not on it. 0 when the gadget is not in use, or it is too far.
function thermalReveal(source, player, table = DETECT) {
  return nearness(distanceFrom(player, source.position), table.thermal.range * 1.2, 0.5);
}

// ---- all of them ----

// The gadgets, as the game holds them: one in the hand at a time (or none), its dial, and what it says. `random` is given, so a test can play it.
class Detectors {
  constructor(table = DETECT, random = Math.random) {
    this.table = table;
    this.random = random;
    this.selected = null;
    this.dial = 0.5;
    this.radar = new Radar(table);
    this.frame = { selected: null, emf: null, radar: null, box: null, thermal: null };
    this.lastWord = null;
    this.wordAge = 99; // seconds since a word was said
    this.tickWait = 0;
    this.events = []; // what has happened and has not been told of: "tick", "static", "word"
  }

  select(name) {
    if (name !== null && !this.table.names.includes(name)) return false;
    this.selected = this.selected === name ? null : name; // the same one again puts it away
    if (this.selected !== "radar") this.radar.clear();
    return true;
  }

  // The next gadget, in order, and then none.
  cycle() {
    const at = this.selected === null ? -1 : this.table.names.indexOf(this.selected);
    const next = at + 1 >= this.table.names.length ? null : this.table.names[at + 1];
    this.selected = next;
    if (next !== "radar") this.radar.clear();
    return next;
  }

  tune(value) {
    this.dial = Math.max(0, Math.min(1, value));
  }

  // `seconds` go by. `sources` are what there is to be found, and `player` is { position, forward }. Gives the frame: what each gadget in hand reads.
  update(seconds, sources, player) {
    const t = this.table;
    this.wordAge += seconds;
    const frame = { selected: this.selected, emf: null, radar: null, box: null, thermal: null };
    if (this.selected === "emf") {
      frame.emf = emfReading(sources, player, t);
      const rate = emfTickRate(frame.emf.level);
      this.tickWait -= seconds;
      if (rate > 0 && this.tickWait <= 0) {
        this.tickWait = 1 / rate;
        this.events.push("tick");
      }
    } else if (this.selected === "radar") {
      frame.radar = { sweep: this.radar.sweep, blips: this.radar.update(seconds, sources, player) };
    } else if (this.selected === "box") {
      const heard = boxHears(this.dial, sources, player, seconds, this.random, t);
      frame.box = { dial: this.dial, ...heard };
      if (heard.word) {
        this.lastWord = heard.word;
        this.wordAge = 0;
        this.events.push("word");
      }
    } else if (this.selected === "thermal") {
      const temperature = airTemperature(sources, player, t);
      frame.thermal = { temperature, chill: chillOf(temperature, t) };
    }
    this.frame = frame;
    return frame;
  }

  // The events since last asked, and forgets them.
  take() {
    const events = this.events;
    this.events = [];
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal, Detectors };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal, Detectors });
}
