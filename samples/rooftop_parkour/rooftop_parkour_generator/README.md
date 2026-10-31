# Rooftop Parkour Generator

Step 10, the last, of the Rooftop Parkour series. Builds on [Rooftop Parkour Touch](../rooftop_parkour_touch/README.md). The district is a map somebody drew by hand, and a hand-drawn map is a place you learn by heart. This sample makes a **city from a seed**: add **`?seed=12`** to the address (or `?seed=random`) and the blocks, the buildings, the fire escapes, the jumps across the alleys, the tokens and the trial are all made by rules, the same each time for the same seed. Without a seed it is the handmade district, and **the same code plays both**.

A generated city has nobody to check that it can be played, so a **bot that plays the game proves it**: every building can be got onto from the street, and every jump is one the runner really makes. The rules of what can be jumped are not the generator's, they are the runner's.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Touch sample. Run `node reset-tutorial.js` to return this folder to the Touch sample, to work through the changes yourself.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** for the developer panel.

**A city is made block by block.** A random number from a seed (`cityRandom`) that is always the same for the same seed picks a **pattern** for each block (a tower, two side by side, two back to back, two rows of two), buildings from the kit, and where they stand. A pattern only *tries*: `fitBlock` asks the plan's own check (`planProblems`: inside the block, no overlaps, no alley narrower than `MIN_ALLEY`) and tries again if it says no. What is on each building (the fire escape, the sills, what is on the roof) is **not invented**: it is what the handmade district was proved with, moved a little.

**The jumps are asked of the bot.** Every pair of buildings whose walls are a jumpable gap apart, with the second roof lower than the first (the way up is a fire escape), is played by the runner's own controller (`playCrossing`): if it lands, the gap is a crossing, and if it falls, it is not. The runner begins on the street in front of the first fire escape; the trial goes up the fire escape of the building with a jump nearest it, and across it; and **the par is how long the bot takes**, as it was for the handmade district.

**A bug that only a city could find.** The bot looked up the lower roof that a fire escape reaches by the *name* of the building (`"medium_1 ledge"`). The handmade district has one medium_1, so it worked; a city can have two, and the second's fire escape was climbed against the first's roof. Fixed by taking the lower roofs in the order of the buildings. A generator asks the code questions that the handmade data never did.

**Both ways, one shape.** A city is `{ seed, grid, layouts, crossings, start, route, par }`, and the handmade district is made into the same shape, so the game asks `cityFor(location.search)` and does not know which it was given. Everything that took the district for granted (the tokens, the trial, the bot's routes) now takes a start, a route and a list of jumps, with the old thing as its default.

## Key code

**The same seed, the same numbers.**

```js
function cityRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
```

**A pattern only tries.**

```js
if (entries && planProblems(grid, { [key]: entries }).length === 0) return entries;
```

**A gap is a crossing if the runner makes it.**

```js
if (playCrossing(env.world, env.ledges, env.roofs[from], env.roofs[to]).landed) made.push({ from, to });
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Touch
- A whole world made from data, so a different layout is different data (the models, boxes, ledges and goals all follow it)
- (The generator needs no Babylon.js: it is plain numbers and arithmetic, and the bot that proves it is the game's own controller, run without a screen.)

## Controls

- Everything from the Touch sample
- **`?seed=12`** (any number) is a city made from that seed; **`?seed=random`** is one made now; no seed is the handmade district
- With **`?dev`**: a **City** section that says which city it is, with a button for a new random one and one to go back to the handmade district

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check that a seed always makes the same city, that every block the generator makes is one the plan has no problem with (for many seeds), that every building has a fire escape and every jump is down across a gap that can be jumped, that the runner begins on open ground facing the first fire escape, that the goals follow the city, that two buildings of one kind each reach their own roof, and, with the bot, that whole cities can be played: every building reached, every jump made, every jump a shortcut, and a believable par.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## The end of the series

That is the series: from a loading bar and a runner, through jumps, ledges, vaults, wall kicks, fire escapes and goals, to a game with a title, sound and a phone's controls, and a city that nobody drew. Where next is up to you: more kinds of building, ladders and bridges, a larger world made as the runner goes, or a different kind of goal.
