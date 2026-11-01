# Tower Defense Path

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 2 of the Tower Defense series. Builds on [Tower Defense World](../tower_defense_world/README.md). The board was there and nothing was on it. This sample gives it a **road**, written as text, and **enemies** that walk it: five kinds, each with a model, a size, a speed and an animation of its own. The road is laid from a map, with the right piece in every cell turned to join its neighbors, and it has a glowing ring at each end. Nothing can be built or shot yet: an enemy of each kind in turn comes on every few seconds and walks to the goal, so that you can see them.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the World sample. Run `node reset-tutorial.js` to return this folder to the World sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**A map is text, and text can be checked.** One string for every row, one character for every cell (`.` grass, `#` road, `S` the start, `G` the goal). `mapProblems` says in words everything that is wrong with a map and where (a row the wrong length, two goals, a fork, a dead end), and `pathProblems` says if the road isn't one road from the start to the goal. The game won't start a map that has problems, and says what they are.

**Autotiling.** Which piece goes in a cell is worked out from which of its four sides have road, as four bits (back 1, right 2, front 4, left 8). `BASE_SIDES` says what each piece joins when it is not turned, `turnSides` turns a set of sides a quarter turn clockwise by shifting the bits (the one that falls off the top comes back at the bottom), and a table made once says which piece and turn joins exactly the sides you have. A test checks that for every set of sides the piece joins exactly those, and another that on the real maps every piece joins every road beside it.

**A road is a line.** The path is the road followed from the start to the goal. It is made into points in the world, with one more at each end out at the edge of the island, and each corner is rounded by a quadratic Bezier curve between the middles of its two sides. `pointAlong(route, distance)` says where something is after it has walked that far, and which way it faces.

**A walker knows distance, speed and time, and nothing else.** No models, no scene. It stops at the end, has a `speedScale` for slowing it down later, and has `progress` from 0 to 1 for knowing which enemy is furthest ahead. It is tested by walking a whole map in a few milliseconds.

**Characters with skeletons are cloned, not instanced.** An instance shares the pose of its source, and two enemies have to be in different poses, so every enemy gets a copy of the skeleton and the animations (the triangles and the pictures are still shared). Each enemy plays one clip, looping, at a speed that matches its feet to the ground: its speed against the stride of the clip, scaled to its size. The strides are measured by eye, and are the numbers to change if a walk looks like skating. A test says that taking an enemy away leaves nothing behind in the scene.

## Key code

**Turning a set of sides a quarter turn: shift the bits, and let the one that falls off come back.**

```js
return ((sides << t) | (sides >> (4 - t))) & 15;
```

**Rounding a corner: a mix of the start, the corner and the end.**

```js
x: u * u * from.x + 2 * u * t * b.x + t * t * to.x,
```

## Controls

- None yet: Space takes a screenshot
- **`?map=1`** in the address for the second map

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The benders. The next sample is [**benders**](../tower_defense_benders/README.md): a podium on the board, a bender standing on it, its idle, and its attacks played in place.
