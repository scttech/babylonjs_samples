# Ghost Hunter Creeping

Step 10 of the Ghost Hunter series, and a different kind of step: it fixes a **feel**. A player tried the game on a phone and said that they were constantly being attacked, when they wanted creatures that creep around and scare them. So the creatures **creep**. A creature walks up to a distance of its own and then **loiters**: it faces the player, circles slowly, and waits, for as long as its patience lasts. Then it **rushes, once**, the scare happens, and it draws back, fading, and is gone. The director comes a third as often (a strike about every half minute, with a rest of 25 seconds after one), and the red flash is softer at the Creepy and Terrifying levels. Builds on [Ghost Hunter Tools](../ghost_hunter_tools/README.md).

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Tools sample. Run `node reset-tutorial.js` to return this folder to the Tools sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel, where the creeping can be tuned while you play.

**A complaint became numbers.** `CREEP` is a table: how far away a creature loiters, how patient it is, how fast it circles, how long it draws back. Each creature picks its own from the ranges when it is made, and a kind can override any of them (the spider is bolder).

**A rhythm for an enemy.** Stalk, creep, rush, recover, retreat: the waiting is the scare, and the rush is rare.

**Tests that said the old rules were changed** to say the new ones, and a new module says the creep: it stops at its distance, circles and keeps it, rushes after about as long as its patience, is not counted down while stunned, follows a player who goes away, and fades and goes after its rush.

## Key code

**Circling: at right angles to the way to the player.**

```js
const moveX = uz * sideways + ux * radial;
const moveZ = -ux * sideways + uz * radial;
```

**Each creature is its own.**

```js
this.creepAt = creep.distance[0] + random() * (creep.distance[1] - creep.distance[0]);
this.patience = creep.patience[0] + random() * (creep.patience[1] - creep.patience[0]);
```

## Controls

- Everything from the Tools sample
- With **`?dev`**: sliders for how patient they are (least and most), how near they come and how far they stay, how fast they circle, and a read-out of who is loitering and for how long

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The eleventh sample is **Detectors**: an EMF meter, a radar, a spirit box you tune, and thermal vision, to find what you cannot see.
