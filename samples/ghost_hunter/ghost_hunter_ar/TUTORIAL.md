# Tutorial: Ghost Hunter AR -- The Floor of the Room

This is the second tutorial of the Ghost Hunter series. The first one put the camera's picture behind a 3D scene and turned the scene's camera to where the phone points. But the game still does not know **anything about the room**: where the floor is, where a ghost could stand. This sample teaches it, in two ways. On an Android phone with Chrome the browser can do **real augmented reality (WebXR)**: the phone finds the floor and the walls itself, and keeps track of where it is in the room. Everywhere else the game **guesses**, from the sensors alone, that the floor is flat and a phone's height below the eye. Both give the same kind of answer, so the rest of the game never has to know which it has.

By the end you'll have:

- **Placeholders**: a way to mark anything made of simple shapes as "this will be a model, or a finished effect, later", and to **hide them all, or a kind of them**, with the P key, the address `?placeholders=off`, or the developer panel (the choice is kept for next time)
- **Surfaces**: a flat-floor guess from a ray and a plane, a surface from the pose a phone reports, and what counts as a floor and as a tap
- **Placements**: the places the player marks, with a limit, a minimum distance between them, and anchors
- **WebXR**: whether the phone can, a session that finds surfaces, the select (a tap) from the phone, and anchors that keep a mark where it was put, with the camera view as the fallback
- A **target** ring that sits on the floor where the player looks, and a **mark** that is put there when the player taps
- A second button on the start screen, for choosing between augmented reality and the camera view
- More in the **developer panel**: the placeholders, and what the game thinks the surface is
- Unit tests for all of it: **133 passing tests**

**What you'll learn:** how to find a point on the floor from a ray (and why that is all a guess needs), how WebXR hit tests and anchors work, how to write the same answer from two different sources, how to test code that talks to a browser feature you cannot run on your desk (with stand-ins), and a habit of the whole series: *everything that stands in for something unfinished can be switched off*.

**Before you start:** do the [Room tutorial](../ghost_hunter_room/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Room sample, plus placeholders for the new files and their tests:

```
ghost_hunter_ar/
├── index.html, tests.html   (already list the new scripts, and the second start button)
├── css/                     (as in the Room sample; start.css changes in Step 5)
├── js/
│   ├── placeholders.js      (placeholder -- Step 1)
│   ├── surface.js           (placeholder -- Step 2)
│   ├── placements.js        (placeholder -- Step 3)
│   ├── xr.js                (placeholder -- Step 4)
│   ├── start.js, main.js    (change in Steps 5 and 6)
│   └── everything else, from the Room sample
└── tests/
    ├── placeholders.tests.js, surface.tests.js, placements.tests.js, xr.tests.js   (placeholders)
    └── everything else, from the Room sample
```

Open `tests.html` before you change anything. You should see **79 passing tests**: the ones of the Room sample.

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, and for a phone an HTTPS tunnel (see the [series README](../README.md#what-you-need)). Add **`?dev`** to the address for the developer panel.

**Real augmented reality needs an Android phone with Chrome (and Google's ARCore installed, which most phones have), and the page over HTTPS.** Everything else in this tutorial can be tried on a desktop, and the code that talks to WebXR is tested with stand-ins, so it is worth reading even if you do not have such a phone.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Placeholders**: a set of things that can be hidden.
2. **Surfaces**: a floor from a ray, and a surface from a pose.
3. **Placements**: the marks the player makes.
4. **WebXR**: finding the floor with the phone's own help.
5. **The start screen**: a second way in.
6. **The game**: a target, marks, and everything joined together.
7. **Try it**.

## Step 1: Placeholders

Until the models arrive, much of the game is made of **placeholders**: glowing posts, orbs, bars, spheres on sticks. They are not a mistake, they are scaffolding. But scaffolding should come down without taking the building with it, and a game should be seen **with and without** it all the time, so that it never quietly depends on a stand-in. So every placeholder is **registered**, with a kind, in one place, and one table says which are shown.

Open `js/placeholders.js` (the placeholder) and **replace the TODO line** with:

```js
// Placeholders: things made out of simple shapes that stand in for what will be a model, or a finished effect, later. The game keeps a
// list of them and can hide them, all together or by kind, from one table, so that it can be seen with and without them as it is
// built: with the address ending ?placeholders=off, with the P key, or from the developer panel. See ../tests/placeholders.tests.js.

const PLACEHOLDERS = {
  show: true, // the switch for all of them
  kinds: { marker: true, creature: true }, // and one for each kind (a kind not in the table is shown)
};

const PLACEHOLDER_KEY = "ghost-hunter.placeholders"; // where the choice is kept in the browser

// Are placeholders wanted? The address wins (?placeholders=off or ?placeholders=on), then what was kept in the browser ("off" or "on"),
// and with neither they are.
function placeholdersWanted(search, stored) {
  const asked = new URLSearchParams(search || "").get("placeholders");
  if (asked === "off" || asked === "hide") return false;
  if (asked === "on" || asked === "show") return true;
  return stored !== "off";
}

class PlaceholderSet {
  constructor(table = PLACEHOLDERS) {
    this.table = table;
    this.items = []; // { node, kind }
  }

  // Is a kind of placeholder shown now?
  visible(kind) {
    return this.table.show && this.table.kinds[kind] !== false;
  }

  // Takes a mesh (or any node) as a placeholder of a kind, shows or hides it as the table says, and gives it back.
  add(node, kind = "marker") {
    node.metadata = { ...(node.metadata || {}), placeholder: kind };
    this.items.push({ node, kind });
    node.setEnabled(this.visible(kind));
    return node;
  }

  // A placeholder that is not wanted any more (it is not disposed: that is for whoever made it).
  remove(node) {
    this.items = this.items.filter((item) => item.node !== node);
  }

  // Shows or hides every one, as the table says now.
  refresh() {
    for (const { node, kind } of this.items) node.setEnabled(this.visible(kind));
  }

  setShow(show) {
    this.table.show = show;
    this.refresh();
  }

  setKind(kind, show) {
    this.table.kinds[kind] = show;
    this.refresh();
  }

  // How many there are, of a kind or in all.
  count(kind) {
    return this.items.filter((item) => kind === undefined || item.kind === kind).length;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLACEHOLDERS, PLACEHOLDER_KEY, placeholdersWanted, PlaceholderSet };
} else {
  Object.assign(window, { PLACEHOLDERS, PLACEHOLDER_KEY, placeholdersWanted, PlaceholderSet });
}
```

Things to notice:

- **One table** (`PLACEHOLDERS`) with a switch for all of them and one for each kind. A kind that is not in the table is shown, so a new kind needs nothing but being used.
- **Three ways to choose**, in the order of strength: the address (`?placeholders=off`), then what the browser kept from last time, then "shown". `placeholdersWanted` is a function of two strings so that a test can try every way.
- **`add` marks a node** (`metadata.placeholder`) and shows or hides it at once, so a placeholder that is made while they are hidden starts hidden. It works on a mesh or on a group of them (a `TransformNode`): `setEnabled` hides the children too.
- **`remove` only forgets.** Whoever made a thing disposes of it.

### Tests

Open `tests/placeholders.tests.js` and **replace the TODO line** with:

```js
QUnit.module("placeholdersWanted", () => {
  QUnit.test("they are wanted unless something says not", (assert) => {
    assert.true(placeholdersWanted("", null));
    assert.true(placeholdersWanted("?dev", undefined));
  });

  QUnit.test("the address can switch them off or on", (assert) => {
    assert.false(placeholdersWanted("?placeholders=off", null));
    assert.false(placeholdersWanted("?dev&placeholders=hide", null));
    assert.true(placeholdersWanted("?placeholders=on", "off"));
  });

  QUnit.test("what the browser kept counts when the address says nothing, and the address wins", (assert) => {
    assert.false(placeholdersWanted("", "off"));
    assert.true(placeholdersWanted("", "on"));
    assert.false(placeholdersWanted("?placeholders=off", "on"));
  });
});

QUnit.module("PlaceholderSet", () => {
  const node = () => ({ enabled: true, metadata: null, setEnabled(value) { this.enabled = value; } });
  const table = () => ({ show: true, kinds: { marker: true, creature: true } });

  QUnit.test("a placeholder is shown, and is marked with its kind", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "creature");
    assert.true(a.enabled);
    assert.strictEqual(a.metadata.placeholder, "creature");
    assert.strictEqual(set.add(node()).metadata.placeholder, "marker", "a marker unless it says");
  });

  QUnit.test("one switch hides them all, and shows them again", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    const b = set.add(node(), "creature");
    set.setShow(false);
    assert.false(a.enabled);
    assert.false(b.enabled);
    set.setShow(true);
    assert.true(a.enabled);
    assert.true(b.enabled);
  });

  QUnit.test("a kind can be hidden by itself", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    const b = set.add(node(), "creature");
    set.setKind("creature", false);
    assert.true(a.enabled);
    assert.false(b.enabled);
  });

  QUnit.test("a placeholder added while they are hidden starts hidden", (assert) => {
    const set = new PlaceholderSet({ show: false, kinds: {} });
    assert.false(set.add(node()).enabled);
  });

  QUnit.test("a kind that is not in the table is shown", (assert) => {
    const set = new PlaceholderSet(table());
    assert.true(set.visible("something-new"));
  });

  QUnit.test("it counts them, and forgets one that is removed", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    set.add(node(), "creature");
    set.add(node(), "creature");
    assert.strictEqual(set.count(), 3);
    assert.strictEqual(set.count("creature"), 2);
    set.remove(a);
    assert.strictEqual(set.count("marker"), 0);
  });

  QUnit.test("the table of the game has everything shown", (assert) => {
    assert.true(PLACEHOLDERS.show);
    assert.true(Object.values(PLACEHOLDERS.kinds).every(Boolean));
  });
});
```

Open `tests.html`. You should see **89 passing tests**: 10 more.

## Step 2: Surfaces

Where can a ghost stand? On a **surface**: a point, and which way is up from it (the normal). With WebXR the phone says so. Without, the game has the one thing the Room sample gave it, the line of sight, and one assumption: **the floor is flat and level, and its height is known** (the eye is `LOOK.eyeHeight` above it). A ray from the eye along the line of sight meets that flat floor at one point, if the player is looking down at all, and that point is the guess.

Both answers have the same shape, `{ point, normal, distance, guessed }`, so the rest of the game cannot tell which it has, except for the one flag, which the developer panel shows.

Open `js/surface.js` (the placeholder) and **replace the TODO line** with:

```js
// Surfaces: where in the room a thing can stand. With WebXR the phone finds the floor and the walls itself and reports them as poses;
// with only the camera's picture the game has to guess, and its guess is that the floor is flat, level and one phone's height below
// the eye. Both kinds of answer are the same shape, { point, normal, distance, guessed }, so the rest of the game cannot tell which it
// has. All plain arithmetic, tested without a phone. See ../tests/surface.tests.js.

const SURFACE = {
  floorY: 0, // the height of the floor in the game's world (the eye is LOOK.eyeHeight above it)
  maxDistance: 6, // metres: further than this a guess about the floor is not believed
  minDownDegrees: 8, // how far below the horizon the camera must look to be looking at the floor
  upDot: 0.8, // a surface whose normal points this far up (the dot with straight up) is a floor
  tapPixels: 10, // a press that moves further than this is a drag, not a tap
  tapMilliseconds: 450, // and one that lasts longer is a hold
};

const length = (v) => Math.hypot(v[0], v[1], v[2]);

// Where a ray (a point and a direction, not necessarily of length one) meets a flat level surface at height `planeY`. Nothing if
// it never does: it runs level, or away from it.
function hitPlane(origin, direction, planeY) {
  if (Math.abs(direction[1]) < 1e-9) return null;
  const t = (planeY - origin[1]) / direction[1];
  if (t <= 0) return null;
  return {
    point: [origin[0] + direction[0] * t, planeY, origin[2] + direction[2] * t],
    distance: t * length(direction),
  };
}

// The game's guess at the floor: where the line of sight meets it, as long as the camera looks down enough and it is not too far.
function findFloor(origin, forward, table = SURFACE) {
  const looking = (Math.asin(Math.max(-1, Math.min(1, forward[1] / (length(forward) || 1)))) * 180) / Math.PI;
  if (looking > -table.minDownDegrees) return null;
  const hit = hitPlane(origin, forward, table.floorY);
  if (!hit || hit.distance > table.maxDistance) return null;
  return { point: hit.point, normal: [0, 1, 0], distance: hit.distance, guessed: true };
}

// A vector turned by a rotation (a quaternion: { x, y, z, w }).
function rotateByQuaternion(v, q) {
  const [x, y, z] = v;
  // t = 2 * cross(q.xyz, v); result = v + w * t + cross(q.xyz, t)
  const tx = 2 * (q.y * z - q.z * y);
  const ty = 2 * (q.z * x - q.x * z);
  const tz = 2 * (q.x * y - q.y * x);
  return [x + q.w * tx + (q.y * tz - q.z * ty), y + q.w * ty + (q.z * tx - q.x * tz), z + q.w * tz + (q.x * ty - q.y * tx)];
}

// A surface from the pose WebXR gives for a hit: where it is, and the rotation of a flat thing laid on it, whose up is the normal.
function surfaceFromPose(position, rotation, distance = null) {
  return { point: [position[0], position[1], position[2]], normal: rotateByQuaternion([0, 1, 0], rotation), distance, guessed: false };
}

// Is a surface a floor (or a table, or the top of anything level), and not a wall?
function isFloor(surface, table = SURFACE) {
  return surface !== null && surface.normal[1] >= table.upDot;
}

// Was a press and its release a tap? `down` and `up` are { x, y, time } (pixels, milliseconds).
function isTap(down, up, table = SURFACE) {
  return Math.hypot(up.x - down.x, up.y - down.y) <= table.tapPixels && up.time - down.time <= table.tapMilliseconds;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SURFACE, hitPlane, findFloor, rotateByQuaternion, surfaceFromPose, isFloor, isTap };
} else {
  Object.assign(window, { SURFACE, hitPlane, findFloor, rotateByQuaternion, surfaceFromPose, isFloor, isTap });
}
```

Things to notice:

- **`hitPlane` is the whole of the guess**: where a ray meets a flat level surface, from `t = (planeY - origin.y) / direction.y`. If the ray runs level, or away, there is no hit (`t` is zero or less).
- **A guess has limits.** Looking along the room is not looking at the floor (`minDownDegrees`), and a floor a long way off is a floor you are not sure of (`maxDistance`). Both are in the table, and the developer panel has sliders for them.
- **A quaternion is a rotation**, written `{ x, y, z, w }`. `rotateByQuaternion` turns a vector by one, and a test says it agrees with Babylon.js. A surface from a pose is "which way does the up of a flat thing laid there point?", so a pose that is not turned is a floor, and one turned a quarter turn is a wall.
- **`isFloor` and `isTap` are rules with numbers in the table**: how level a surface must be, and how far a press may move and how long it may last to be a tap and not a drag. A phone that is turned to look around must not mark the floor as it goes.

### Tests

Open `tests/surface.tests.js` and **replace the TODO line** with:

```js
QUnit.module("hitPlane", () => {
  QUnit.test("a ray that goes down meets the floor", (assert) => {
    const hit = hitPlane([0, 1.4, 0], [0, -1, 1], 0);
    assert.deepEqual(hit.point.map((n) => Math.round(n * 1000) / 1000), [0, 0, 1.4]);
    assert.true(Math.abs(hit.distance - Math.hypot(1.4, 1.4)) < 1e-9);
  });

  QUnit.test("the length of the direction does not matter", (assert) => {
    const a = hitPlane([0, 1.4, 0], [0, -1, 1], 0);
    const b = hitPlane([0, 1.4, 0], [0, -10, 10], 0);
    assert.true(Math.abs(a.distance - b.distance) < 1e-9);
    assert.true(Math.abs(a.point[2] - b.point[2]) < 1e-9);
  });

  QUnit.test("a ray that runs level or upwards never does", (assert) => {
    assert.strictEqual(hitPlane([0, 1.4, 0], [0, 0, 1], 0), null);
    assert.strictEqual(hitPlane([0, 1.4, 0], [0, 1, 1], 0), null);
  });

  QUnit.test("a plane above the eye is met by a ray that goes up", (assert) => {
    assert.true(hitPlane([0, 1.4, 0], [0, 1, 0], 2.8) !== null);
  });
});

QUnit.module("findFloor", () => {
  QUnit.test("looking down at the floor gives a flat level surface", (assert) => {
    const floor = findFloor([0, 1.4, 0], [0, -0.7071, 0.7071]);
    assert.deepEqual(floor.normal, [0, 1, 0]);
    assert.true(floor.guessed);
    assert.true(Math.abs(floor.point[2] - 1.4) < 1e-3);
    assert.strictEqual(floor.point[1], 0);
  });

  QUnit.test("looking along the room gives nothing: that is not the floor", (assert) => {
    assert.strictEqual(findFloor([0, 1.4, 0], [0, 0, 1]), null);
    assert.strictEqual(findFloor([0, 1.4, 0], [0, -0.05, 1]), null);
    assert.strictEqual(findFloor([0, 1.4, 0], [0, 0.5, 1]), null);
  });

  QUnit.test("a floor too far away is not believed", (assert) => {
    const forward = [0, -Math.sin((SURFACE.minDownDegrees + 1) * Math.PI / 180), Math.cos((SURFACE.minDownDegrees + 1) * Math.PI / 180)];
    assert.strictEqual(findFloor([0, 1.4, 0], forward), null, "a shallow look meets the floor far away");
    assert.true(findFloor([0, 1.4, 0], forward, { ...SURFACE, maxDistance: 100 }) !== null);
  });

  QUnit.test("the numbers are the table's: a floor at another height", (assert) => {
    const floor = findFloor([0, 3, 0], [0, -1, 1], { ...SURFACE, floorY: 1 });
    assert.strictEqual(floor.point[1], 1);
    assert.true(Math.abs(floor.point[2] - 2) < 1e-9);
  });
});

QUnit.module("rotateByQuaternion and surfaceFromPose", () => {
  const near = (assert, got, want) => got.forEach((n, i) => assert.true(Math.abs(n - want[i]) < 1e-9, `${got} should be ${want}`));

  QUnit.test("no rotation changes nothing", (assert) => {
    near(assert, rotateByQuaternion([1, 2, 3], { x: 0, y: 0, z: 0, w: 1 }), [1, 2, 3]);
  });

  QUnit.test("a quarter turn about z turns x into y", (assert) => {
    const s = Math.SQRT1_2;
    near(assert, rotateByQuaternion([1, 0, 0], { x: 0, y: 0, z: s, w: s }), [0, 1, 0]);
  });

  QUnit.test("it agrees with Babylon.js", (assert) => {
    const q = BABYLON.Quaternion.RotationYawPitchRoll(0.7, -0.4, 1.1);
    const want = new BABYLON.Vector3(0.3, 1, -0.6).applyRotationQuaternion(q);
    const got = rotateByQuaternion([0.3, 1, -0.6], q);
    got.forEach((n, i) => assert.true(Math.abs(n - [want.x, want.y, want.z][i]) < 1e-5));
  });

  QUnit.test("a pose that is not turned is a floor, and one on its side is a wall", (assert) => {
    const floor = surfaceFromPose([1, 0, 2], { x: 0, y: 0, z: 0, w: 1 });
    assert.deepEqual(floor.normal, [0, 1, 0]);
    assert.false(floor.guessed);
    assert.true(isFloor(floor));
    const s = Math.SQRT1_2;
    const wall = surfaceFromPose([1, 1, 2], { x: s, y: 0, z: 0, w: s }); // a quarter turn about x
    assert.false(isFloor(wall));
  });

  QUnit.test("nothing is not a floor", (assert) => {
    assert.false(isFloor(null));
  });
});

QUnit.module("isTap", () => {
  const press = { x: 100, y: 100, time: 1000 };

  QUnit.test("a short press that does not move is a tap", (assert) => {
    assert.true(isTap(press, { x: 103, y: 102, time: 1150 }));
  });

  QUnit.test("a press that moves is a drag", (assert) => {
    assert.false(isTap(press, { x: 160, y: 100, time: 1150 }));
  });

  QUnit.test("a press that is held is not a tap", (assert) => {
    assert.false(isTap(press, { x: 100, y: 100, time: 2000 }));
  });

  QUnit.test("the numbers are the table's", (assert) => {
    assert.true(isTap(press, { x: 150, y: 100, time: 1100 }, { ...SURFACE, tapPixels: 80 }));
  });
});
```

Open `tests.html`. You should see **106 passing tests**: 17 more.

## Step 3: Placements

A **placement** is a place the player has marked: a point on a surface, with a kind (later, the places where the dead gather). The list of them is plain data and a few rules: not too many (the oldest goes), not two on top of each other, and each one can be told it has been **anchored**, which is the phone's promise to keep it in the same real place even as its idea of the room gets corrected.

Open `js/placements.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

Things to notice:

- **It tells of every change** (`added`, `removed`) to whoever is listening, and does not know what a mark looks like. The game turns a placement into something to see; the list only keeps the facts.
- **A placement keeps its own copy** of the surface it was made from, so a surface that is changed later does not move it.
- **The distance is measured on the floor plan** (x and z): a place above another is the same place.
- **When there are too many, the oldest is told of as removed before the new one is told of as added**, so a listener never sees more than the table's number.

### Tests

Open `tests/placements.tests.js` and **replace the TODO line** with:

```js
QUnit.module("Placements", () => {
  const floor = (x, z) => ({ point: [x, 0, z], normal: [0, 1, 0] });

  QUnit.test("marks a surface, and gives the placement an id", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(1, 2));
    assert.deepEqual(item.point, [1, 0, 2]);
    assert.strictEqual(item.kind, "marker");
    assert.false(item.anchored);
    assert.strictEqual(placements.items.length, 1);
    assert.strictEqual(placements.add(floor(5, 5)).id, item.id + 1);
  });

  QUnit.test("a place next to another is the same place", (assert) => {
    const placements = new Placements();
    placements.add(floor(0, 0));
    assert.strictEqual(placements.add(floor(0.2, 0.1)), null);
    assert.true(placements.add(floor(0.6, 0)) !== null);
    assert.strictEqual(placements.items.length, 2);
  });

  QUnit.test("a placement keeps its own copy of the surface", (assert) => {
    const placements = new Placements();
    const surface = floor(1, 1);
    const item = placements.add(surface);
    surface.point[0] = 99;
    assert.strictEqual(item.point[0], 1);
  });

  QUnit.test("past the most, the oldest goes", (assert) => {
    const placements = new Placements({ max: 3, minSeparation: 0.5 });
    const first = placements.add(floor(0, 0));
    for (let i = 1; i <= 3; i++) placements.add(floor(i * 2, 0));
    assert.strictEqual(placements.items.length, 3);
    assert.strictEqual(placements.get(first.id), null);
  });

  QUnit.test("it tells of every change, the oldest going before the new one coming", (assert) => {
    const placements = new Placements({ max: 1, minSeparation: 0.5 });
    const told = [];
    placements.onChange(({ type, item }) => told.push(`${type} ${item.id}`));
    placements.add(floor(0, 0));
    placements.add(floor(3, 0));
    placements.clear();
    assert.deepEqual(told, ["added 1", "removed 1", "added 2", "removed 2"]);
  });

  QUnit.test("removes one by its id, and says whether it was there", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(0, 0));
    assert.true(placements.remove(item.id));
    assert.false(placements.remove(item.id));
  });

  QUnit.test("an anchor says where the phone has the place now", (assert) => {
    const placements = new Placements();
    const item = placements.add(floor(0, 0));
    assert.true(placements.anchor(item.id, [0.05, 0, 0.02]));
    assert.true(item.anchored);
    assert.deepEqual(item.point, [0.05, 0, 0.02]);
    assert.false(placements.anchor(999));
  });

  QUnit.test("finds the nearest, on the floor plan", (assert) => {
    const placements = new Placements();
    assert.strictEqual(placements.nearest([0, 0, 0]), null);
    placements.add(floor(0, 3));
    const far = placements.add(floor(0, 10));
    const near = placements.nearest([0, 5, 9]); // the height does not count
    assert.strictEqual(near.item, far);
    assert.strictEqual(near.distance, 1);
  });

  QUnit.test("the table of the game is sensible", (assert) => {
    assert.true(PLACEMENT.max >= 1);
    assert.true(PLACEMENT.minSeparation > 0);
  });
});
```

Open `tests.html`. You should see **115 passing tests**: 9 more.

## Step 4: WebXR

WebXR is the browser's way of letting a page use the phone's own understanding of the world. For us it is three things: **a session** (the phone shows its camera and keeps track of where it is), **hit tests** (ask where a line from the screen meets the real world, and get a pose), and **anchors** (a point the phone promises to keep in the same real place). Babylon.js wraps all three; `xr.js` wraps Babylon.js once more, so that the rest of the game sees a few plain methods.

The file is built in three pieces: the decisions (plain functions), one conversion, and the class that holds the session.

### The decisions

Open `js/xr.js` (the placeholder) and **replace the TODO line** with:

```js
// WebXR: real augmented reality, where the browser has it (Chrome on an Android phone, today). The phone then finds the floor and the
// walls itself, keeps track of where it is in the room, and draws the camera's picture for the page. The game uses it if it can, and
// falls back to the camera's picture and the motion sensors of Step 1 if it can't, and every other part of the game is written to
// work with either. The decisions here are plain code; ArSession is the part that talks to Babylon.js and the browser, and it takes
// both as arguments so that the tests can give it stand-ins. See ../tests/xr.tests.js.

const XR = {
  mode: "immersive-ar", // the kind of session: the camera's picture, with the game over it
  space: "local-floor", // measured from the floor under where the session began
  required: ["hit-test"], // without this there is no finding the floor
  optional: ["anchors", "dom-overlay"], // anchors keep things in place; the overlay keeps the page's words on the screen
};

// Can this browser and this device do augmented reality? Asks, and says no to anything that goes wrong.
async function xrAvailable(nav = navigator) {
  if (!nav || !nav.xr || typeof nav.xr.isSessionSupported !== "function") return false;
  try {
    return Boolean(await nav.xr.isSessionSupported(XR.mode));
  } catch (error) {
    return false;
  }
}

// Which experience to use: "xr" when the browser can and the address does not say ?xr=off, and otherwise "camera".
function chooseExperience(available, search) {
  const asked = new URLSearchParams(search || "").get("xr");
  return available && asked !== "off" ? "xr" : "camera";
}

// The words for the start screen about augmented reality.
function xrStatus(available, search) {
  if (!available) return "";
  return chooseExperience(available, search) === "xr"
    ? "Your phone can do real augmented reality: it will find the floor of your room."
    : "Real augmented reality is switched off by the address: the camera view will be used.";
}

// What to ask the browser for when starting a session. The overlay is the page itself, so that its words stay on the screen.
function sessionInit(overlayRoot) {
  const init = { requiredFeatures: XR.required.slice(), optionalFeatures: XR.optional.slice() };
  if (overlayRoot) init.domOverlay = { root: overlayRoot };
  return init;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { XR, xrAvailable, chooseExperience, xrStatus, sessionInit };
} else {
  Object.assign(window, { XR, xrAvailable, chooseExperience, xrStatus, sessionInit });
}
```

Things to notice:

- **Every question the browser might answer badly is asked defensively.** `xrAvailable` is a promise that is `false` for a browser with no `xr`, one that cannot answer, and one that throws.
- **The address can say no** (`?xr=off`): handy for trying the camera view on a phone that does have augmented reality.
- **The session is asked for in the table's terms**: it *requires* hit tests (without them there is no floor), and *optionally* anchors and the page overlay (the page's own words stay on the screen in augmented reality).

### A hit

In `js/xr.js`, find the export block (lines 45 to 52) and **delete it**. Add this in its place, and the export block under it:

```js
// A hit of the phone's, from the matrix Babylon.js gives it, as a surface.
function surfaceFromHit(hit) {
  const matrix = hit.transformationMatrix;
  const position = new BABYLON.Vector3();
  const rotation = new BABYLON.Quaternion();
  matrix.decompose(new BABYLON.Vector3(), rotation, position);
  return surfaceFromPose([position.x, position.y, position.z], rotation);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit };
} else {
  Object.assign(window, { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit });
}
```

Things to notice:

- **A hit is a matrix**, and `decompose` takes it apart into a position and a rotation, which is what `surfaceFromPose` wants. This is the one place where WebXR's idea of a surface becomes the game's.

### The session

In `js/xr.js`, find the export block (lines 54 to 61) and **delete it**. Add this in its place, and the export block under it:

```js
// A session of augmented reality. `scene` is the Babylon.js scene; `api` is Babylon.js itself (for the names of its features).
class ArSession {
  constructor(scene, api = BABYLON) {
    this.scene = scene;
    this.api = api;
    this.experience = null;
    this.hitTest = null;
    this.anchors = null;
    this.latest = null; // the newest hit, as the phone gave it
    this.inside = false;
    this.selectCallbacks = [];
    this.enterCallbacks = [];
    this.exitCallbacks = [];
  }

  // Makes the experience and turns on the features (finding surfaces, and anchors if the phone has them). Nothing is shown until `enter`.
  async create() {
    this.experience = await this.scene.createDefaultXRExperienceAsync({
      disableDefaultUI: true,
      disablePointerSelection: true,
      disableTeleportation: true,
      optionalFeatures: true,
    });
    const features = this.experience.baseExperience.featuresManager;
    const names = this.api.WebXRFeatureName || {};
    this.hitTest = features.enableFeature(names.HIT_TEST || "xr-hit-test", "latest");
    this.hitTest.onHitTestResultObservable.add((results) => {
      this.latest = results.length ? results[0] : null;
    });
    try {
      this.anchors = features.enableFeature(names.ANCHOR_SYSTEM || "xr-anchor-system", "latest", { doNotRemoveAnchorsOnSessionEnd: true });
    } catch (error) {
      this.anchors = null; // a phone without anchors still plays
    }
    this.experience.baseExperience.onStateChangedObservable.add((state) => {
      const states = this.api.WebXRState || { IN_XR: 2, NOT_IN_XR: 3 };
      if (state === states.IN_XR) {
        this.inside = true;
        const session = this.experience.baseExperience.sessionManager.session;
        session.addEventListener("select", () => this.selectCallbacks.forEach((callback) => callback()));
        this.enterCallbacks.forEach((callback) => callback());
      } else if (state === states.NOT_IN_XR) {
        this.inside = false;
        this.latest = null;
        this.exitCallbacks.forEach((callback) => callback());
      }
    });
  }

  // Starts the session: the phone shows its camera and the game is drawn over it.
  async enter(overlayRoot) {
    const base = this.experience.baseExperience;
    await base.enterXRAsync(XR.mode, XR.space, this.experience.renderTarget, sessionInit(overlayRoot));
  }

  onSelect(callback) { this.selectCallbacks.push(callback); }
  onEnter(callback) { this.enterCallbacks.push(callback); }
  onExit(callback) { this.exitCallbacks.push(callback); }

  // The surface the phone is looking at, as it has found it now, or null.
  surface() {
    return this.latest ? surfaceFromHit(this.latest) : null;
  }

  // Asks the phone to anchor the newest hit, so that the thing put there stays where it was put. Gives the node that follows the
  // anchor, or null if the phone has no anchors or says no.
  async anchorHere() {
    if (!this.anchors || !this.latest) return null;
    try {
      const anchor = await this.anchors.addAnchorPointUsingHitTestResultAsync(this.latest);
      return anchor && anchor.attachedNode ? anchor.attachedNode : null;
    } catch (error) {
      return null;
    }
  }

  exit() {
    if (this.inside) return this.experience.baseExperience.exitXRAsync();
    return Promise.resolve();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit, ArSession };
} else {
  Object.assign(window, { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit, ArSession });
}
```

Things to notice:

- **`create` and `enter` are two things.** `create` makes the experience and turns the features on; nothing is shown until `enter`, which must be called from a tap (the phone asks the person, and a page that asks out of the blue is refused).
- **Anchors are optional.** `enableFeature` throws on a phone that does not have them, and the session carries on without: `anchors` is `null`, and `anchorHere` says `null`.
- **The select is the phone's tap.** In a session the page does not get ordinary pointer events from the screen; the session sends a `select` event, and `onSelect` passes it on.
- **`latest` is the newest hit.** Hit testing runs every frame and reports a list; the first is the nearest. No hit is `null`, and so is no surface.
- **The page must be see-through, or the room is hidden.** In a session the phone draws its camera picture itself and the page is an overlay on it (`dom-overlay`). The rule `body:xr-overlay` in `css/page.css` (from the first sample) takes the page's dark background away, and hides the camera's `<video>` and the canvas of the camera view, while the overlay is up. Without it the overlay is an opaque black sheet and the player sees nothing at all.
- **`api` is a parameter.** The class takes Babylon.js as an argument for the names of its features, and the scene as another, so that a test can give plain objects.

### Tests

Open `tests/xr.tests.js` and **replace the TODO line** with:

```js
QUnit.module("xrAvailable, chooseExperience and xrStatus", () => {
  QUnit.test("a browser with no xr says no", async (assert) => {
    assert.false(await xrAvailable({}));
    assert.false(await xrAvailable(null));
    assert.false(await xrAvailable({ xr: {} }));
  });

  QUnit.test("it asks for augmented reality, and believes the answer", async (assert) => {
    let asked = null;
    const nav = { xr: { isSessionSupported: async (mode) => { asked = mode; return true; } } };
    assert.true(await xrAvailable(nav));
    assert.strictEqual(asked, "immersive-ar");
    assert.false(await xrAvailable({ xr: { isSessionSupported: async () => false } }));
  });

  QUnit.test("a question that fails is a no", async (assert) => {
    assert.false(await xrAvailable({ xr: { isSessionSupported: async () => { throw new Error("blocked"); } } }));
  });

  QUnit.test("it is used when it can be, and not when the address says not", (assert) => {
    assert.strictEqual(chooseExperience(true, ""), "xr");
    assert.strictEqual(chooseExperience(true, "?dev"), "xr");
    assert.strictEqual(chooseExperience(true, "?xr=off"), "camera");
    assert.strictEqual(chooseExperience(false, ""), "camera");
  });

  QUnit.test("says something only when there is something to say", (assert) => {
    assert.strictEqual(xrStatus(false, ""), "");
    assert.true(xrStatus(true, "").includes("floor"));
    assert.true(xrStatus(true, "?xr=off").includes("switched off"));
  });
});

QUnit.module("sessionInit", () => {
  QUnit.test("asks for the table's features", (assert) => {
    const init = sessionInit(null);
    assert.deepEqual(init.requiredFeatures, XR.required);
    assert.deepEqual(init.optionalFeatures, XR.optional);
    assert.false("domOverlay" in init);
  });

  QUnit.test("gives the page as the overlay when there is one", (assert) => {
    const root = {};
    assert.strictEqual(sessionInit(root).domOverlay.root, root);
  });

  QUnit.test("the finding of surfaces is required, and anchors are not", (assert) => {
    assert.true(XR.required.includes("hit-test"));
    assert.false(XR.required.includes("anchors"));
    assert.true(XR.optional.includes("anchors"));
  });

  QUnit.test("it does not change the table", (assert) => {
    sessionInit({}).requiredFeatures.push("x");
    assert.false(XR.required.includes("x"));
  });
});

QUnit.module("surfaceFromHit and ArSession", () => {
  const hitAt = (x, y, z, rotation = new BABYLON.Quaternion()) => ({
    transformationMatrix: BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 1, 1), rotation, new BABYLON.Vector3(x, y, z)),
  });

  const fakeObservable = () => {
    const callbacks = [];
    return { add: (callback) => callbacks.push(callback), notify: (value) => callbacks.forEach((callback) => callback(value)) };
  };

  // What Babylon.js gives (the parts of it that are used), made of plain objects.
  const fakeScene = ({ anchorsWork = true } = {}) => {
    const log = { entered: null, sessionEvents: {} };
    const hitTest = { onHitTestResultObservable: fakeObservable() };
    const anchors = {
      added: [],
      addAnchorPointUsingHitTestResultAsync: async (hit) => {
        if (!anchorsWork) throw new Error("no anchors");
        log.anchoredHit = hit;
        return { attachedNode: { name: "anchor-node" } };
      },
    };
    const state = fakeObservable();
    const experience = {
      renderTarget: { name: "target" },
      baseExperience: {
        featuresManager: {
          enableFeature: (name) => {
            log.features = (log.features || []).concat(name);
            if (name === "xr-hit-test") return hitTest;
            if (!anchorsWork) throw new Error("not supported");
            return anchors;
          },
        },
        onStateChangedObservable: state,
        sessionManager: { session: { addEventListener: (type, callback) => { log.sessionEvents[type] = callback; } } },
        enterXRAsync: async (...args) => { log.entered = args; },
        exitXRAsync: async () => { log.exited = true; },
      },
    };
    return { scene: { createDefaultXRExperienceAsync: async (options) => { log.options = options; return experience; } }, log, hitTest, state };
  };
  const api = { WebXRFeatureName: { HIT_TEST: "xr-hit-test", ANCHOR_SYSTEM: "xr-anchor-system" }, WebXRState: { IN_XR: 2, NOT_IN_XR: 3 } };

  QUnit.test("a hit becomes a surface", (assert) => {
    const surface = surfaceFromHit(hitAt(1, 0.5, -2));
    assert.deepEqual(surface.point.map((n) => Math.round(n * 1000) / 1000), [1, 0.5, -2]);
    assert.deepEqual(surface.normal.map((n) => Math.round(n)), [0, 1, 0]);
    assert.false(surface.guessed);
  });

  QUnit.test("a hit that is turned has a normal that is turned", (assert) => {
    const surface = surfaceFromHit(hitAt(0, 1, 0, BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Right(), Math.PI / 2)));
    assert.false(isFloor(surface));
  });

  QUnit.test("create turns on the finding of surfaces, and has no default button", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    assert.true(log.options.disableDefaultUI);
    assert.deepEqual(log.features, ["xr-hit-test", "xr-anchor-system"]);
    assert.strictEqual(ar.surface(), null, "nothing found yet");
  });

  QUnit.test("the newest hit is the surface, and no hit is no surface", async (assert) => {
    const { scene, hitTest } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2), hitAt(0, 0, 5)]);
    assert.strictEqual(Math.round(ar.surface().point[2]), 2, "the first of the hits is the nearest");
    hitTest.onHitTestResultObservable.notify([]);
    assert.strictEqual(ar.surface(), null);
  });

  QUnit.test("enter starts the session of the table, over the page", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    const root = {};
    await ar.enter(root);
    assert.strictEqual(log.entered[0], "immersive-ar");
    assert.strictEqual(log.entered[1], "local-floor");
    assert.strictEqual(log.entered[2].name, "target");
    assert.strictEqual(log.entered[3].domOverlay.root, root);
    assert.deepEqual(log.entered[3].requiredFeatures, ["hit-test"]);
  });

  QUnit.test("it tells when the session starts and ends, and passes on a select", async (assert) => {
    const { scene, log, state } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    const told = [];
    ar.onEnter(() => told.push("enter"));
    ar.onExit(() => told.push("exit"));
    ar.onSelect(() => told.push("select"));
    state.notify(2);
    assert.true(ar.inside);
    log.sessionEvents.select();
    state.notify(3);
    assert.false(ar.inside);
    assert.deepEqual(told, ["enter", "select", "exit"]);
  });

  QUnit.test("anchoring gives the node of the anchor, or nothing", async (assert) => {
    const working = fakeScene();
    const ar = new ArSession(working.scene, api);
    await ar.create();
    assert.strictEqual(await ar.anchorHere(), null, "nothing to anchor yet");
    working.hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2)]);
    assert.strictEqual((await ar.anchorHere()).name, "anchor-node");

    const broken = fakeScene({ anchorsWork: false });
    const plain = new ArSession(broken.scene, api);
    await plain.create();
    broken.hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2)]);
    assert.strictEqual(await plain.anchorHere(), null, "a phone without anchors still plays");
  });

  QUnit.test("leaving does nothing if it never started", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    await ar.exit();
    assert.true(log.exited === undefined);
  });
});
```

Things to notice:

- **A fake scene** is a few plain objects with the same methods as the parts of Babylon.js the class uses: `createDefaultXRExperienceAsync`, a features manager, an observable with `add`, a session with `addEventListener`. The tests say what the class *asks of* them, and what it does with what comes back.
- **What a test like this cannot say** is whether a real phone does what the stand-in does. For that, Step 7: try it.

Open `tests.html`. You should see **132 passing tests**: 17 more.

## Step 5: The start screen

Two small changes to what the Room sample made, so that there are **two ways in**: augmented reality, and the camera view. The second button is hidden until the game knows that the phone has augmented reality, and then says which way it is *not* going.

The page (`index.html`) already has the button. The stylesheet and the class need a little.

In `js/start.js`, after line 20, add:

```js
    this.alternative = get("start-alternative"); // a second way in, for when there are two (real AR, or the camera view)
```

Things to notice: the second button is looked for in the page like the others, and is **not required to exist** by the tests of the Room sample, which is why its test stand-in has to be given one below.

In `js/start.js`, after line 35, add:

```js
    this.alternative.disabled = busy;
```

In `js/start.js`, after line 43, add:

```js
  // Shows the second button, with its words.
  offerAlternative(text) {
    this.alternative.textContent = text;
    this.alternative.classList.remove("hidden");
  }

  onAlternative(callback) {
    this.alternative.addEventListener("click", callback);
  }

```

In `js/start.js`, after line 57, add:

```js
  // Shows it again (when augmented reality has ended).
  show() {
    this.root.classList.remove("hidden");
  }

```

Now the style, for the new button and the waiting state of both:

In `css/start.css`, **replace** line 65:

```css
#start-button:disabled {
```

with:

```css
#start-alternative {
  padding: 6px 16px;
  border: 1px solid var(--ecto);
  background: transparent;
  color: var(--ecto);
  font: 15px var(--small-font);
  cursor: pointer;
}
#start-alternative.hidden {
  display: none;
}
#start-button:disabled, #start-alternative:disabled {
```

And the tests. The stand-in element needs a `remove`, and the stand-in page the new button (hidden, as the page has it):

In `tests/start.tests.js`, **replace** line 22:

```js
      this.classList = { add: (name) => this.classes.add(name), contains: (name) => this.classes.has(name) };
```

with:

```js
      this.classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name), contains: (name) => this.classes.has(name) };
```

In `tests/start.tests.js`, **replace** line 28:

```js
    const elements = { start: new FakeElement(), "start-status": new FakeElement(), "start-warning": new FakeElement(), "start-button": new FakeElement("button") };
```

with:

```js
    const elements = { start: new FakeElement(), "start-status": new FakeElement(), "start-warning": new FakeElement(), "start-button": new FakeElement("button"), "start-alternative": new FakeElement("button") };
    elements["start-alternative"].classes.add("hidden");
```

And two new tests:

In `tests/start.tests.js`, after line 64, add:

```js
  QUnit.test("a second way in is hidden until it is offered, and then says what it is", (assert) => {
    const { screen, elements } = make();
    assert.true(elements["start-alternative"].classes.has("hidden"));
    let chosen = 0;
    screen.onAlternative(() => { chosen += 1; });
    screen.offerAlternative("Use the camera view");
    assert.false(elements["start-alternative"].classes.has("hidden"));
    assert.strictEqual(elements["start-alternative"].textContent, "Use the camera view");
    elements["start-alternative"].listeners.click();
    assert.strictEqual(chosen, 1);
    screen.setBusy(true);
    assert.true(elements["start-alternative"].disabled);
  });

```

In `tests/start.tests.js`, after line 83, add:

```js
    screen.show();
    assert.false(screen.hidden);
```

Open `tests.html`. You should see **133 passing tests**: 1 more.

## Step 6: The game

Everything joined together, in `js/main.js`. It changes in a number of places, and the page works after each of the groups below.

### The placeholders in the game

The game now has a **set of placeholders**, which starts as the address and the browser say; a place for the **systems** (what the game does every frame, which every later part of the series adds to); and the posts of the Room sample are registered as placeholders.

In `js/main.js`, **replace** line 16:

```js
let panel = null; // the developer panel, if there is one (see the end of this file)
```

with:

```js
let mode = "camera"; // what the game is drawn over: "camera" (the picture of the camera) or "xr" (real augmented reality)
let xrOk = false; // can this phone do real augmented reality? (found out a moment after the page opens)
let panel = null; // the developer panel, if there is one (see the end of this file)

// What the browser remembers between visits. A browser can refuse, so every use of it is allowed to fail.
const remembered = (key) => { try { return localStorage.getItem(key); } catch (error) { return null; } };
const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (error) { /* it is only a preference */ } };

const placeholders = new PlaceholderSet();
placeholders.table.show = placeholdersWanted(location.search, remembered(PLACEHOLDER_KEY));
```

Things to notice: **`remembered` and `remember` allow the browser to refuse.** A browser in a private window, or with its storage blocked, throws; a preference is not worth an error.

In `js/main.js`, **replace** lines 48 to 49:

```js
// Some things to look at, so that looking around can be seen to work: a ring of glowing posts round the player, every 45 degrees,
// with the bearing on each, and one straight up. They stand where the ghosts will.
```

with:

```js
// Everything the game does every frame is a system: a function of the seconds that have gone and of the player. Each part of the game
// adds its own to this list.
const systems = [];

// Some things to look at, so that looking around can be seen to work: a ring of glowing posts round the player, every 45 degrees,
// with the bearing on each, and one straight up. They are placeholders: the game works without them, and they can be hidden.
```

In `js/main.js`, **replace** line 85:

```js
  label(String(bearing).padStart(3, "0")).position.set(x, LOOK.eyeHeight * 2 + 0.4, z);
```

with:

```js
  placeholders.add(post, "marker");
  const words = label(String(bearing).padStart(3, "0"));
  words.position.set(x, LOOK.eyeHeight * 2 + 0.4, z);
  placeholders.add(words, "marker");
```

In `js/main.js`, after line 92, add:

```js
placeholders.add(above, "marker");
```

Open the page with `?placeholders=off`: the ring of posts is gone, and the game carries on. (The P key, a little later in this step, does it while the game runs.)

### The player, the target and the marks

Now the heart of the sample. In one piece, because the parts need each other:

In `js/main.js`, after line 103, add:

```js
// The player: where the eye is and which way it looks, as plain numbers, whatever is moving the camera. The camera's picture and a
// dark room have the eye in one place, turned; augmented reality has it wherever the phone is in the room. Every system reads this.
const player = { position: [0, LOOK.eyeHeight, 0], forward: [0, 0, 1], up: [0, 1, 0] };

function updatePlayer(view) {
  if (mode === "xr") {
    const camera = scene.activeCamera;
    const here = camera.globalPosition;
    const ahead = camera.getDirection(BABYLON.Axis.Z);
    const top = camera.getDirection(BABYLON.Axis.Y);
    player.position = [here.x, here.y, here.z];
    player.forward = [ahead.x, ahead.y, ahead.z];
    player.up = [top.x, top.y, top.z];
  } else {
    player.position = [eye.position.x, eye.position.y, eye.position.z];
    player.forward = view.forward;
    player.up = view.up;
  }
}

// Where the player is looking at the floor, and a mark on it. The surface is what the phone has found (real augmented reality) or the
// game's guess that the floor is flat and a phone's height below the eye (the camera's picture): the same shape either way.
let surface = null;
const target = BABYLON.MeshBuilder.CreateTorus("target", { diameter: 0.5, thickness: 0.02, tessellation: 48 }, scene);
target.material = green;
target.rotationQuaternion = new BABYLON.Quaternion();
target.isVisible = false;
const tilt = new BABYLON.Quaternion();

function updateTarget() {
  surface = mode === "xr" ? (xr.surface()) : findFloor(player.position, player.forward);
  target.isVisible = surface !== null;
  if (!surface) return;
  target.position.set(surface.point[0], surface.point[1] + 0.01, surface.point[2]);
  BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(...surface.normal), tilt);
  target.rotationQuaternion.copyFrom(tilt);
}
systems.push(updateTarget);

// The places the player has marked. Each is a glowing orb standing on a ring, which is a placeholder for what will haunt the place.
const placements = new Placements();
const marks = new Map(); // placement id -> the node that shows it

placements.onChange(({ type, item }) => {
  if (type === "removed") {
    const mark = marks.get(item.id);
    if (mark) {
      placeholders.remove(mark);
      mark.dispose();
    }
    marks.delete(item.id);
    return;
  }
  const mark = new BABYLON.TransformNode(`mark-${item.id}`, scene);
  mark.position.set(item.point[0], item.point[1], item.point[2]);
  const orb = BABYLON.MeshBuilder.CreateSphere(`orb-${item.id}`, { diameter: 0.18 }, scene);
  orb.parent = mark;
  orb.position.y = 0.3;
  orb.material = cyan;
  const base = BABYLON.MeshBuilder.CreateTorus(`base-${item.id}`, { diameter: 0.4, thickness: 0.015, tessellation: 32 }, scene);
  base.parent = mark;
  base.position.y = 0.01;
  base.material = cyan;
  placeholders.add(mark, "marker");
  marks.set(item.id, mark);
  if (mode === "xr") {
    xr.anchorHere().then((node) => {
      if (!node || !marks.has(item.id)) return;
      mark.parent = node; // the phone keeps the anchor where it was put, and the mark goes with it
      mark.position.set(0, 0, 0);
      placements.anchor(item.id);
    });
  }
});

// Marks the floor where the target is. Says so if there is nothing to mark.
function placeAtReticle() {
  if (!surface || !isFloor(surface)) {
    notice.textContent = "Look at the floor to mark it.";
    return;
  }
  notice.textContent = "";
  placements.add(surface);
}

// Real augmented reality, if the phone has it. Nothing happens until the player asks.
const xr = new ArSession(scene);
xr.onSelect(placeAtReticle);
xr.onExit(() => {
  mode = "camera";
  start.show();
});
xrAvailable().then((available) => {
  xrOk = available;
  start.setStatus(`${startStatus(support)} ${xrStatus(available, location.search)}`.trim());
  if (available) {
    const other = chooseExperience(available, location.search) === "xr" ? "camera" : "xr";
    start.offerAlternative(other === "camera" ? "Use the camera view instead" : "Use real augmented reality");
    start.onAlternative(() => enter(other));
  }
});

```

Things to notice:

- **`player` is plain numbers**: where the eye is and which way it faces, whether the camera is turned by the sensors or the phone is walking about a room in augmented reality. Every system from now on reads `player`, and nothing else, which is why the camera view and augmented reality can share one game.
- **`updateTarget` is a system**: every frame it finds the surface, from the phone (`xr.surface()`) or from the guess (`findFloor`), and stands a ring on it, turned so that the ring lies on whatever the surface is. `FromUnitVectorsToRef` makes the rotation that takes straight up to the normal.
- **The marks are made by listening.** `placements.onChange` adds a node when a placement is added, and takes it away when one is removed. The marks are *placeholders* of kind `marker`: the orb and ring will be replaced by what the player is hunting.
- **In augmented reality the mark is given an anchor**, and **goes with it** (`mark.parent = node`, with its position zeroed: the anchor node is where the mark belongs). A mark with no anchor stays put in the game's own world.
- **`placeAtReticle` says why when it cannot.** "Look at the floor to mark it" is better than nothing happening.
- **`xr` is created here but does nothing** until the player asks for it. `xrAvailable` is a promise; when it answers, the start screen says what the phone can do, and the second button appears.

### The frame, dragging and the keys

Every frame the player is brought up to date and the systems run. Dragging now also notices a **tap**.

In `js/main.js`, **replace** lines 217 to 218:

```js
  const view = aim();
  compass.textContent = bearingText(bearingOf(view.forward), pitchOf(view.forward));
```

with:

```js
  const view = mode === "xr" ? null : aim();
  updatePlayer(view);
  compass.textContent = bearingText(bearingOf(player.forward), pitchOf(player.forward));
  const seconds = Math.min(engine.getDeltaTime() / 1000, 0.1);
  for (const system of systems) system(seconds, player);
```

In `js/main.js`, **replace** lines 225 to 228:

```js
// Dragging to look: for a desktop, and for a phone with no motion sensors.
let dragging = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
```

with:

```js
// Dragging to look, for a desktop and for a phone with no motion sensors; and a tap (a press that does not move) marks the floor.
let dragging = null;
let pressed = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  pressed = { x: event.clientX, y: event.clientY, time: performance.now() };
```

In `js/main.js`, **replace** lines 238 to 240:

```js
const endDrag = () => { dragging = null; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
```

with:

```js
canvas.addEventListener("pointerup", (event) => {
  if (pressed && isTap(pressed, { x: event.clientX, y: event.clientY, time: performance.now() })) placeAtReticle();
  dragging = null;
  pressed = null;
});
canvas.addEventListener("pointercancel", () => {
  dragging = null;
  pressed = null;
});
```

In `js/main.js`, **replace** lines 252 to 253:

```js
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") recentre();
```

with:

```js

// The placeholders, hidden or shown, and the choice kept for next time.
function showPlaceholders(show) {
  placeholders.setShow(show);
  remember(PLACEHOLDER_KEY, show ? "on" : "off");
  if (panel) panel.refresh();
}
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") recentre();
  if (event.code === "KeyP") showPlaceholders(!placeholders.table.show);
```

Things to notice:

- **The camera is only aimed by the sensors in the camera view.** In augmented reality the phone turns the camera itself (`aim` is not called, and the view is `null`).
- **A tap is a press that does not move**, judged by `isTap` with the table's numbers. Without that, every drag would mark the floor where it ended.
- **P** shows and hides the placeholders, and keeps the choice.

### Entering

The button now has two ways to go: augmented reality, and the camera view. The camera view is what the Room sample did, moved into a function that gives back the notices; augmented reality tries first, and **falls back to the camera view** if the phone will not start it, and says so.

In `js/main.js`, **replace** lines 278 to 280:

```js
// The button. A phone wants the questions asked straight from the tap, so the motion sensors are asked for first, before anything waits.
async function enter() {
  start.setBusy(true);
```

with:

```js
// The camera's picture with the motion sensors. A phone wants the questions asked straight from the tap, so the motion sensors are
// asked for first, before anything waits. Gives the notices for whatever did not work.
async function enterCamera() {
```

In `js/main.js`, after line 284, add:

```js
  mode = "camera";
```

In `js/main.js`, **replace** lines 291 to 294:

```js
  notice.textContent = problems.join(" ");

  gyro.recentre();
  floor.isVisible = !feed.live; // no camera, no room: so there is a floor
```

with:

```js
  gyro.recentre();
  floor.isVisible = !feed.live; // no camera, no room: so there is a floor
  return problems;
}

// Real augmented reality: the phone shows its camera and finds the floor itself. If it will not start, the camera's picture is used.
async function enterAr() {
  try {
    await xr.create();
    await xr.enter(document.body);
    mode = "xr";
    floor.isVisible = false;
    return [];
  } catch (error) {
    const problems = await enterCamera();
    return ["Augmented reality would not start, so this is the camera view.", ...problems];
  }
}

// The button (or the second button). `experience` is "xr" or "camera".
async function enter(experience = chooseExperience(xrOk, location.search)) {
  start.setBusy(true);
  const problems = experience === "xr" ? await enterAr() : await enterCamera();
  notice.textContent = problems.join(" ");
```

In `js/main.js`, **replace** line 320:

```js
start.onEnter(enter);
```

with:

```js
start.onEnter(() => enter());
```

Things to notice:

- **`enter` takes the experience as an argument**, so the main button and the second button are the same function, and the button that is "the other one" depends on the phone: a phone with augmented reality has the second button say "Use the camera view instead".
- **A session that will not start is not an error the player sees.** It is a notice, and the camera view.

### Developer mode

In `js/main.js`, after line 342, add:

```js
      {
        title: "Placeholders",
        rows: [
          toggle("show placeholders (P)", () => placeholders.table.show, showPlaceholders),
          ...Object.keys(placeholders.table.kinds).map((kind) => toggle(`show ${kind}s`, () => placeholders.table.kinds[kind], (value) => placeholders.setKind(kind, value))),
          readout("placeholders", () => placeholders.count()),
        ],
      },
      {
        title: "Surfaces",
        rows: [
          readout("experience", () => (mode === "xr" ? "augmented reality" : "camera view")),
          readout("augmented reality", () => (xrOk ? "available" : "not available")),
          readout("surface", () => (surface ? `${surface.guessed ? "guessed" : "found"} floor at ${surface.distance === null ? "?" : surface.distance.toFixed(1)} m` : "none")),
          readout("marks", () => `${placements.items.length} (${placements.items.filter((item) => item.anchored).length} anchored)`),
          slider("furthest floor guess (m)", SURFACE, "maxDistance", 2, 12, 0.5),
          slider("least look down (degrees)", SURFACE, "minDownDegrees", 0, 40, 1),
          action("Mark the floor here", placeAtReticle),
          action("Clear the marks", () => placements.clear()),
        ],
      },
```

In `js/main.js`, **replace** line 372:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr }; // for poking at from the console
```

Things to notice:

- **Three groups of rows**: the looking (as before), the placeholders (a switch for all, one for each kind, and how many there are), and the surfaces (which experience, whether the phone has augmented reality, what the surface is and how far it is, how many marks and how many are anchored, sliders for the limits of the floor guess, and buttons to mark the floor and clear the marks).
- **The kinds of placeholder are read from the table**, so a new kind of placeholder gets its switch without anyone writing one.

## Step 7: Try it

**On a desktop** (with `?dev`, press the button):

- You are in the dark room of the Room sample. **Drag** to look down: a green **ring** is on the floor in the middle of the screen. Look up, and it goes. Look along the room at the horizon, and it is gone: that is not the floor.
- **Click** (do not drag) to mark the floor: a glowing orb on a ring is left where the target was. Mark a few. Mark one on top of another: nothing happens. Mark more than the limit (8): the oldest goes.
- Press **P**: the posts and the marks are gone, and the target is still there: the target is the game's, not a placeholder. Press it again. Reload: the choice is remembered. Open the page with `?placeholders=on` to override it.
- In the panel, the **Surfaces** group says that the surface is a *guessed floor at 2.1 m*. Change **least look down** to 40: you must look much further down before there is a floor.

**On an Android phone with Chrome**, over HTTPS:

- The start screen says *Your phone can do real augmented reality*, and has a second button, **Use the camera view instead**. Press the main button and allow the camera.
- The picture of the camera is now drawn by the phone, and the game over it. **Move the phone slowly over the floor**: the ring finds the floor after a moment, and sits on it, and when you walk the ring stays in the right place on the floor. It also finds **a table or a bed**: any flat surface that is level.
- **Tap** to mark. The mark has an **anchor**: in the panel it says `1 (1 anchored)` after a moment. Walk round it: the mark stays where it was put.
- If augmented reality will not start, you get the camera view and a notice that says so. If it does start and something is wrong (the ring does not appear, the mark does not stay), tell me what the panel's **Surfaces** group says: that is how the code is made to be mended.

**On an iPhone** the second button is not there: there is no WebXR in Safari, and the camera view is the game. The ring and the marks work as on the desktop, with the floor a guess: hold the phone at about chest height and look at the floor, and tap.

## Step 8: Tests, all together

Open `tests.html`. You should see **133 passing tests**. The placeholders are tested with stand-ins for nodes, the surfaces and the placements as plain arithmetic and plain data, WebXR with stand-ins for Babylon.js, and the start screen with stand-ins for the page.

## Recap: what you built

| What | Where |
|------|-------|
| Things that stand in for models, and the switch for them | `PLACEHOLDERS`, `PlaceholderSet`, `placeholdersWanted` in `placeholders.js` |
| The guess at the floor, a surface from a pose, taps | `hitPlane`, `findFloor`, `surfaceFromPose`, `isFloor`, `isTap` in `surface.js` |
| The marks the player makes | `Placements` in `placements.js` |
| Real augmented reality | `xrAvailable`, `chooseExperience`, `sessionInit`, `surfaceFromHit`, `ArSession` in `xr.js` |
| A second way in | `offerAlternative`, `onAlternative`, `show` in `start.js` |
| The player, the target and the marks, and the two experiences | `main.js` |

## Challenges

- **Walls.** WebXR also finds walls. Show a different ring (vertical, in cyan) on a surface that is not a floor, and keep the placements that are on walls apart from those on floors (a `kind`).
- **A plane you choose.** Add a slider to the developer panel for `SURFACE.floorY`, for a phone used on a table or a stair, and a test that the guess follows it.
- **Remember the marks.** Keep the placements in `localStorage` as plain data (point, normal, kind) and bring them back when the game starts in the camera view. (In augmented reality they cannot come back: the phone's idea of the room is new each time. Why?)
- **A better tap.** A tap that is a *long* press could clear the nearest mark (`placements.nearest`). Add it, with a test that uses a made-up `isTap`-like function for a hold.
