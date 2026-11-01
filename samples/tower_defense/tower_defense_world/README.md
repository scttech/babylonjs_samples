# Tower Defense World

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 1 of the Tower Defense series: a tower defense game in the world of *Avatar: The Last Airbender*. This first step is the **world**: a board of real 3D tiles on a lump of rock that floats in the sky, with clouds drifting by below, seen by a fixed camera that fits any screen, on a page made for a phone. Nothing moves but the clouds, and nothing can be built yet. The road across the middle is a stand-in, to show that two kinds of tile fit together; the next step lays a real one from a map.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from empty files. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. A fan project: see the [series README](../README.md).

**Models are made web-sized first.** The tiles came out of the model maker with up to 1.7 million triangles and 78 MB each; a script (`assets/optimize-models.js`) welds, simplifies and shrinks them to a few thousand triangles and about a megabyte. A model with a skeleton is only given smaller pictures, because simplifying it would have to move the weights of its bones.

**One copy, many instances.** A tile is loaded once into a *container*, and every cell is an *instance* of it: it shares the triangles and the materials, and Babylon.js draws all the instances of a mesh at once. A test says that two tiles of one kind are instances of the same mesh.

**A model is measured, not trusted.** `measure`, `fitScale`, `topOffset` and `centerOffset` turn "a box that holds a model" into how to scale and lift it so that it stands on the ground and fits its cell. A test says that the five tiles are the same size, which is what makes them fit together.

**The board is data.** Every size is in one table (`BOARD`), and `cellCenter` and `cellAt` turn a column and row into a place in the world and back. Nothing else in the game repeats a size, so a board of another size is one line.

**A camera that is given the edges of its view.** An orthographic camera has no field of view: it is given a box. `viewExtents` projects the corners of the board onto the screen's right and up (a dot product each way), finds the box that holds them and makes it the screen's shape. It works for any camera angle, and a test checks the camera's axes against a real one.

**A floating island, made in code.** Rings of points round the board's outline, each lower and smaller than the last and nudged by a seeded random number, joined into triangles that are each lit flat. A seeded random number gives the same rock every time; the tests check that no point sticks out past the board and that every triangle faces away from the middle.

**The sky costs the scene nothing.** The canvas is see-through (`alpha: true`) and the page paints the sky with a CSS gradient behind it. The clouds are billboards with one picture, drawn in code with radial gradients; where they are and how they drift is plain numbers, tested without a scene.

## Key code

**Turning a cell into a place, with the far row at the top.**

```js
return {
  x: (col - (board.cols - 1) / 2) * board.cell,
  z: ((board.rows - 1) / 2 - row) * board.cell,
};
```

**Instances, not clones.**

```js
tile.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
```

## Controls

- None yet: Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The road. The next sample is **path**: a map as text, the right road piece laid in every cell, and an enemy that walks it.
