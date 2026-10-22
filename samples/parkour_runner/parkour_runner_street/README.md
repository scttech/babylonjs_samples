# Parkour Runner Street

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 3 of the Parkour Runner series. Builds on [Parkour Runner Runner](../parkour_runner_runner/README.md), reusing its runner, lanes, animation and camera. What's new is the street: it is now **endless**. The runner can run as far as you like, and the street never ends and never gets bigger. Pieces are made a little way ahead of him, and the ones far behind are recycled and used again in front.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Runner sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**An endless world is a fixed number of pieces.** The street is never built all at once. `StreetStream` is told where the runner is and answers with what changed: the pieces that should now exist (up to 150 units ahead, about as far as the fog lets anyone see) and the ones that have fallen more than 30 units behind. It works with plain data and never touches Babylon.js, so it is easy to test, and `main.js` does the making and hiding.

**The street is described one piece at a time.** `rowPieces(n)` says what is in row number *n*, and `buildingAt` says what the next building is, starting here. Nothing in a row depends on another row, so they can be made in any order, at any time.

**Repeatable, whatever the frame rate.** The left and right sides of the street each have their own seeded random numbers. If they shared one generator, the buildings you got would depend on which side was built first, and that depends on how far the runner moved between updates. With separate generators the street is the same on every computer, and the same after you restart.

**A pool instead of making and destroying.** The runner makes and drops about a dozen pieces a second. `PiecePool` hides a dropped piece and keeps it, and hands it out again the next time a piece of that kind is needed. A new piece is only made when there is no spare one, so after the first few seconds nothing new is made at all. One test runs a street of five pieces for a thousand steps and checks that exactly five were made.

## Key code

**What exists for where the runner is.** Rows and buildings are made in order, as far ahead as the fog hides them, and anything far behind is dropped.

```js
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
```

**One generator per side.** The same seed always gives the same street, however the updates are spaced out.

```js
this.sides = [
  { side: -1, nextZ: startZ, random: seededRandom(this.seed) },
  { side: 1, nextZ: startZ, random: seededRandom(this.seed + 1) },
];
```

**The pool.** Reuse before making; hide instead of destroying.

```js
acquire(name, placement) {
  const spares = this.spare.get(name);
  if (spares && spares.length > 0) {
    const piece = spares.pop();
    this.library.moveTo(piece, placement);
    piece.setEnabled(true);
    return piece;
  }
  this.made++;
  return this.library.place(name, placement);
}

release(name, piece) {
  piece.setEnabled(false);
  if (!this.spare.has(name)) this.spare.set(name, []);
  this.spare.get(name).push(piece);
}
```

**Keeping the street up with the runner.** Pieces that fell behind go back to the pool first, so they can be reused straight away.

```js
const buildStreet = (z) => {
  const { added, removed } = stream.update(z);
  for (const piece of removed) release(piece);
  for (const piece of added) nodes.set(piece.id, pool.acquire(piece.piece, piece));
};
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Runner (an animated character, clips and blending, a follow camera, instanced pieces, fog, a splash screen)
- Disabling nodes with `setEnabled(false)` to hide pieces cheaply, and `setEnabled(true)` to bring them back
- Moving instanced pieces after they are made, to reuse them
- A world that is a fixed size however far the player goes

## Controls

- **Left/Right arrow keys or A/D** — move one lane left or right (one lane per press)
- **R** — start again from the beginning (the street starts again too, and is the same as before)
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover `buildingAt` and `rowPieces` (positions, facing, lights, ends), the `StreetStream` (what is built ahead and dropped behind, no gaps or overlaps however far it runs, the same street for the same seed whatever the update spacing, a bounded number of pieces, `reset`), the `PiecePool` (through a stand-in library: reuse, per-kind spares, a bounded number made), and `PieceLibrary.moveTo`.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md).

## Next up

[Parkour Runner Moves](../parkour_runner_moves/README.md) gives the runner a jump, a slide and a roll, played with the character's animation clips.
