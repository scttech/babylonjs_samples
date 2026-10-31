# Ghost Hunter The Hunt

Step 5 of the Ghost Hunter series. Builds on [Ghost Hunter Creatures](../ghost_hunter_creatures/README.md). Until now every creature was summoned by a key. A horror game is a **rhythm**: a quiet that goes on a little too long, a dread that builds, a strike, and a rest before it starts again. This sample writes the part of the game that keeps it: **the director**. It keeps one number, the **tension**, that rises while nothing happens and falls when something does; when it reaches a threshold that is different every time, it sends for a creature, **out of sight** (behind you, at the edge of the view, to the side, and never in it), and after a creature gets to you there is a **rest** in which nothing new turns up. Spiders sometimes **drop from the ceiling**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Creatures sample. Run `node reset-tutorial.js` to return this folder to the Creatures sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**The director gives orders and does nothing.** `update` returns `{ kind, point, zone }` and the game spawns it, so the director is tested with no creatures and no scene, and the random numbers are an argument, so a seeded generator makes a whole night of hunting happen twice the same way.

**Out of sight, by an angle.** `bearingTo` is the angle between where the player faces and where a point is (-180 to 180, round to the right). The half field of view sideways comes from the field of view and the shape of the screen, so a phone held upright, which sees little sideways, lets things come from nearer the middle than a laptop does. A point that would be in view (and a margin) is refused, not moved.

**Never on the beat.** The threshold at which it strikes is a number between two, chosen again after every strike, so the player cannot count to it.

**Tension decides what, too.** Each kind has a weight at no tension and one at full tension, and is only allowed from an intensity: spiders when it is quiet, ghouls when it is not and the game is hard enough.

## Key code

**The angle to a point.**

```js
difference = ((difference + 180) % 360 + 360) % 360 - 180;
```

**A weighted pick, with the random given in.**

```js
let at = random() * total;
for (const item of items) {
  at -= weightOf(item);
  if (at < 0) return item;
}
```

**A fall.**

```js
this.fall += CREATURE_GRAVITY * seconds;
this.position[1] -= this.fall * seconds;
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Creatures
- `engine.getAspectRatio` for what the camera sees sideways
- A 2D canvas drawn every frame as a debug map of the hunt
- (The director needs no Babylon.js: it is plain arithmetic, tested without it.)

## Controls

- Everything from the Creatures sample
- The hunt begins when you press the button, and **H** switches it off and on
- With **`?dev`**: the dread and where it strikes, the rest, how many have been sent and have got to you, the last one sent, sliders for the rhythm (how fast the dread builds, the rest, the most at once, the distances, how often a spider drops, the intensity), buttons to send one now (from anywhere, behind, the edge) and to calm it down, and a **map** in the corner of the player, the view, the creatures and ghosts and the dread

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check bearings and views (every way the player can face, the shape of the screen), the points the director picks (never in the view, at the table's distances, every zone used, both sides of the edge), the kinds (the weights, the intensity), and the director over simulated minutes (the first strike is in the range the table gives and not always the same, the intensity, the limit, the rest, switching off, nothing ever in the view over twenty minutes, the same random giving the same hunt), and a creature that falls.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The sixth sample is **Jump Scares**: the strike itself. Build-up, silence, and then the lunge, with sound that comes from where the creature is, vibration, and a setting for how scary it is.
