# Tower Defense Elements

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 8 of the Tower Defense series. Builds on [Tower Defense Variety](../tower_defense_variety/README.md). A bolt did harm and nothing else, and the four nations differed only in how much. Now each has **an effect of its own**: **water slows** the whole crowd near the enemy it hits, **fire burns**, **earth stuns** and **air pushes** an enemy back along the road. A small picture over an enemy's head (the sign of the nation that does it: waves, a flame, a diamond, a swirl of wind) says what is on it, and the card of a chosen tower says what its effect is. Some enemies **resist** an effect and some are **weak** to it: the heavy trooper hardly burns, the Dai Li agent shrugs off a stun, and the corrupted spirit burns easily. An upgraded tower has a more **potent** effect.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Variety sample. Run `node reset-tutorial.js` to return this folder to the Variety sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**An effect is a row of a table, and an enemy has a `Status`.** The status is put an effect on and let go by time, and says how fast to walk and how much to burn. It knows nothing of models, so a test can run a minute of it in a moment. A slow and a stun change the walking speed (a stun beats a slow), a burn is harm over time, and a push is an act (it says how far, and the enemy does it). The same effect again does not add to itself, and a stun can't be repeated at once, or an enemy could be held for ever.

**A slow that touches one enemy slows nothing.** The simulation said so. A tower shoots the enemy that is furthest along, and the one it slowed was passed by the one behind it, so it turned to a new leader and the harm was spread out: with a one-enemy slow the water nation lost *more* lives with its effect than without it. The slow has a `radius`, and slows the crowd.

**An enemy's feet keep up.** A slowed enemy plays its clip slower by the same share, and a stunned one stops in its pose. A burn is `hurt`, the same as a bolt's harm, so an enemy that is burned to nothing falls and is paid for like any other.

**The effect travels with the shot.** The table of benders names it, the brain says it when it fires, the tower puts it in the shot, and the bolt does it when it arrives, to the enemies that it reaches (a function gives the bolt the crowd *when it arrives*, since the enemies change while it flies).

**The pictures are made once.** A mark is drawn on a canvas in white, used as the see-through-ness of a flat square that faces the camera, and given its color by the material. Every enemy shares the same four materials.

**The simulation says each effect earns its keep,** and that the game had become too easy: each wave is now 20 percent tougher than the one before, up from 12.

## Key code

**Who an effect reaches.**

```js
return [enemy, ...enemies.filter((other) => other !== enemy && other.alive && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= radius)];
```

**The feet keep up.**

```js
this.clip.speedRatio = this.clipSpeed * speed;
```

## Controls

- Build towers as in the last sample (drag a podium from the tray, or tap and tap)
- **Tap a tower** to choose it: its card says what its effect is, and **Make ... for N** upgrades it, **Sell for N** sells it
- **Start wave** calls the next wave early; **`?map=1`** in the address for the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, draw the marks and play whole games, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Screens. The next sample gives the game a **start screen** with a choice of map, a **pause**, and a **win and lose screen** that says how you did.
