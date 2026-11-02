# Tower Defense Scenery

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 6 of the Tower Defense series. Builds on [Tower Defense Waves](../tower_defense_waves/README.md). The board played well and looked like a diagram. This sample gives it **scenery**: a cabbage cart, a spirit shrine, a koi pond, a lemur perch and a sky bison camp, written in the map's own text (a letter in a row puts one in that cell), standing on the grass, and **in the way of a tower**: drag a podium over one and the outline is red and the line above the tray says *there is a spirit shrine there*.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Waves sample. Run `node reset-tutorial.js` to return this folder to the Waves sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**A new thing in a data format, and everything old still works.** A prop is one more character in a map's rows (`c`, `k`, `s`, `l`, `b`). The cell it stands on is still grass, and the prop is in a list of its own, so everything that asked whether a cell was road, counted the road beside it, laid a tile, or checked a map goes on being right. `GROUND` says what a cell can be that is not scenery, and anything else in the legend is a prop: adding one is a line in the legend and a row in the table.

**A table that is read twice.** `PROPS` gives the model and the width to the loader, and gives the *name* to the rule that says why a tower can't be built: *there is a spirit shrine there*. The names are written to be read in that sentence, and a test checks it.

**Models of every shape, made to fit by measuring.** The perch is tall and thin and the pond low and wide. Each is scaled so that its longer side is the width in the table, stood on the ground by its bottom, and centered by the middle of its box, with the same four functions as the tiles. A test measures the real, placed models: on the ground, in the middle of the cell, under the roof of the view, and still in the middle when turned.

**Instances, so that scenery is free.** Every prop is an instance of one loaded model, so a map covered in carts draws no slower than one with a single cart.

**One rule, one new line.** `canBuild` already said why not for the edge of the board, road, and a tower. A prop is two more lines there, and everything that asked it (the outline, the message, `tryBuild` and the list of cells where a tower could go) now knows.

## Key code

**A prop is a fact about a grass cell.**

```js
if (meaning && !GROUND.includes(meaning)) props.push({ kind: meaning, col, row });
```

**The reason, from the table.**

```js
if (prop) return { ok: false, reason: `there is ${PROPS[prop.kind].name} there` };
```

## Controls

- As in the last sample: drag a podium from the tray (or tap, and tap), and **Start wave**
- **`?map=1`** in the address for the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Variety. The next sample, [**variety**](../tower_defense_variety/README.md), gives the benders **upgrades** (tap a tower to make it better for gold, or to sell it), and makes the fire nation's combo do what it looks like: every punch throws its own bolt.
