# Tower Defense Variety

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 7 of the Tower Defense series. Builds on [Tower Defense Scenery](../tower_defense_scenery/README.md). Every tower was one podium and one throw, and the fire nation punched six times for one flame. Now towers are **different from each other and better over time**: an attack is a list of **hits**, so every punch of the fire nation's combo throws a flame of its own, and a tower has **levels**. Tap a tower and a card comes up with its range shown on the board: **upgrade** it (more harm, more reach, faster; a ring is drawn on the ground for each level) or **sell** it for most of what it cost.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Scenery sample. Run `node reset-tutorial.js` to return this folder to the Scenery sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**An attack is a list of moments.** `attack.hits` says *when* in the clip each hit is (a share of its length) and *where* the hand is then. One hit is an air bender's cast; six are the fire nation's combo. The times and places were measured on the real clip, and a test measures them again. The brain fires every hit whose time has come (a `while`, so that a long step loses none), and the tower throws each from the right hand.

**A level is a row of numbers multiplied into another row.** `statsFor(spec, level)` gives a bender's row with the level worked into it: the same keys, with more damage and reach, and a shorter cooldown and a faster clip by the same amount. A brain that is given it needs to know nothing of levels, which is why this step changed so little of the code that already worked.

**An upgrade never cuts an attack off.** A tower that is upgraded in the middle of a combo finishes it as it was, and the new row is used from the next attack: the brain is given it only when it is idle.

**The rules are small and say why.** `tryUpgrade` and `trySell` give `{ ok, reason }` like `tryBuild`, with sentences (*that costs 105, and there is 100*), and a sold tower comes out of the *same* list that the whole game uses.

**A tower is taller than its cell.** A tap on a bender's head is over the cell behind it, so the hand looks for a tower at three heights, highest first. A finger is not held above itself here, as it is when it drags a podium.

**The simulation was taught about upgrades.** It plays the whole game with a plan that can upgrade, and says that an upgrade is worth its gold and that the game is still a fight.

## Key code

**A level, as a row.**

```js
{ ...spec, damage: spec.damage * row.damage, range: spec.range * row.range, cooldown: spec.cooldown / row.tempo, attack: { ...spec.attack, speed: spec.attack.speed * row.tempo } }
```

**Every hit whose time has come.**

```js
while (this.fired < this.spec.attack.hits.length && this.attackTime >= hitTime(this.spec.attack, this.fired)) {
```

## Controls

- Build towers as in the last sample (drag a podium from the tray, or tap and tap)
- **Tap a tower** to choose it: **Make ... for N** upgrades it, **Sell for N** sells it; tap anywhere else (or press Escape) to put the card away
- **Start wave** calls the next wave early; **`?map=1`** in the address for the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models and measure their animations, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Elements. The next sample gives each nation an **effect** of its own (water slows, fire burns, earth stuns, air pushes back), carried by the bolts.
