# Rolling Rampage Levels

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 4 of the Rolling Rampage series. Builds on [Rolling Rampage Tilt](../rolling_rampage_tilt/README.md). What's new is that the game plays **levels** drawn as a **grid of heights**: a few lines of text, each character the height of one corner of the floor. A row of rising digits is a ramp, equal digits are a flat deck, and a dot is a hole to fall into. There are two levels, **Practice Run** and **The Bridge**, and **N** (or the *Next level* button) goes on to the next. A marble that falls off a level is put back at its start.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Tilt sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**A level is data.** `LEVELS` is a list of `{ name, start, rows }`, where `rows` is text. `parseLevel` turns it into numbers once (a digit is that many steps of `HEIGHT_STEP`, a dot is `null`), and everything else asks questions of the grid: `cornerHeight`, `cellExists` (a square has floor only if all four of its corners are there) and `heightAt`. Because squares share their corners, the floor is always joined up: slopes are free, and a drop is a gap made with a dot.

**The height of the floor comes from the same triangles as the mesh.** Each square is two triangles, split from its first corner to its last. `heightAt` works out where a place falls in them, and `levelGeometry` makes the very same triangles, so the height the code promises is the height the marble finds. A test checks the two against each other, triangle by triangle, in every level.

**A mesh from plain lists of numbers.** `levelGeometry` returns `positions`, `uvs` and `indices`, with no Babylon.js in it. The floor shares its corner points so slopes are smooth, and wherever a square has no square beside it a **wall** hangs from that edge, with points of its own so its corner stays sharp. `buildLevel` puts the lists in a `VertexData`, asks Babylon.js for the normals, and gives the mesh a Havok **mesh shape**, so the marble rolls on the triangles themselves.

**The order of a triangle's points is its front.** Only the front of a triangle is drawn, and which side that is depends on the order of its three points. Get it wrong and the floor vanishes and the *inside* of the far walls shows. The tests take the triangles apart again and ask which way each faces, with the same sum Babylon.js uses: the floor up, and every wall away from the middle of the level.

**A level is built, and taken away.** `buildLevel` returns `{ grid, mesh, aggregate, dispose }`. Going on to the next level disposes of the old one (the physics body too, or an invisible floor would stay in the world), builds the next, and moves the same marble and the camera to its start. The fall limit comes from the level: a margin below its lowest floor.

## Key code

**A level.**

```js
{
  name: "Practice Run",
  start: { col: 1.5, row: 2 },
  rows: [
    "8888765432222",
    "8888765432222",
    ".........2222",
    // ...
  ],
}
```

**The height of the floor, in either triangle of a square.**

```js
if (u <= v) return h00 + (h11 - h01) * u + (h01 - h00) * v;
return h00 + (h11 - h10) * v + (h10 - h00) * u;
```

**A mesh from numbers, with a mesh shape.**

```js
const data = new BABYLON.VertexData();
data.positions = positions;
data.uvs = uvs;
data.indices = indices;
data.normals = [];
BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
data.applyToMesh(mesh);
const aggregate = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH, { mass: 0, ...SURFACES.deck }, scene);
```

**Testing which way a triangle faces.**

```js
const normal = BABYLON.Vector3.Cross(c.subtract(a), b.subtract(a));
assert.true(normal.y > 0.99); // the floor faces up
```

**Falling off any level.**

```js
if (hasFallen(marble.position.y, fallLimit(level.grid))) dropAgain();
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Tilt
- `Mesh` and `VertexData`: `positions`, `indices`, `uvs`, `normals`, `ComputeNormals`, `applyToMesh`
- `PhysicsShapeType.MESH`, for static terrain
- `PhysicsAggregate.dispose`, and disposing of a mesh, material and texture, to take a level away

## Controls

- **N**, or the **Next level** button: build the next level (after the last, the first)
- **Arrow keys or WASD**, **touch and drag**, or **tilt**: roll the marble, as before
- **R**, or the **Drop again** button: put the marble back at the start of the level
- **C**: save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the levels as data, the grid (corners, holes, squares), the height of the floor and the start and fall limit, the triangles (their lengths, which way every one faces, the walls, that the floor is the triangles `heightAt` uses, and the steepness of every slope), and real marbles on real levels: coming to rest at the start, rolling down a ramp along it, keeping to the floor, falling through a hole, being stopped by a wall, and levels being built and taken away.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

[**Rolling Rampage Clock**](../rolling_rampage_clock/README.md) adds a goal, checkpoints and a countdown with time bonuses, using trigger zones.
