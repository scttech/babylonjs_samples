# Tower Defense Benders

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 3 of the Tower Defense series. Builds on [Tower Defense Path](../tower_defense_path/README.md). The road had enemies on it and nothing to stop them. This sample gives the board **defenders**: a tower is a **podium** with a **bender** standing on it, one for each nation (air, water, earth and fire). It plays an idle while it waits, turns to face the enemy it has chosen, plays an attack **on the spot**, and at the moment its hand is out it throws a **bolt** that flies to the enemy and follows it. The bolt does nothing yet, and nothing can be built yet: four towers stand beside the road on each map, put there to shoot at the enemies that walk it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Path sample. Run `node reset-tutorial.js` to return this folder to the Path sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**An attack that stays where it is built.** Many of the animations move the character a long way (a spin jump travels two meters): the animation moves the hips along the ground as well as posing the body. A tower doesn't move, so loading a bender **rewrites the keys of the hips track** of every idle and attack so that the hips keep their height (the bender still crouches and jumps) but stay at one place along and across the ground. A test steps through each attack and says the hips never leave the middle of the cell, and another loads the clips *unheld* and says that they did wander.

**Numbers measured on the real clip.** When the hand is out furthest (`hitAt`), where it is (`muzzle`) and which way the attack points (`aim`) are rows in a table, and each was measured by playing the clip a frame at a time and asking where the hands are. A test measures them again, so a table that goes out of date (a different clip, a different speed) fails with the numbers it found.

**A brain that is a state machine with events.** `TowerBrain` knows nothing of models or of the scene. Each frame it is given the enemies and says what happened: `start`, `fire` (when the hand is out, with who it was at and where they were) and `end`. It turns by the short way round a circle, no faster than a turn rate; waits for its cooldown (from the start of one attack to the start of the next); starts an attack only when it is facing the target; keeps its eye on who it is shooting at, and shoots where they were last seen if they have gone. Angles that wrap round are the main trouble, and the tests go across the half turn.

**Targeting is a table of scores.** `first` (furthest along the road), `last` and `closest` are functions of an enemy; the highest score is shot, a tie goes to the first in the list, and an enemy that has got to the end is nobody. An enemy to the targeting is anything with `x`, `z`, `progress` and `done`, so a test makes one in a line.

**Where a tower can go is one function that says why not.** `canBuild` says whether a cell is on the board, is grass and is free, and gives the reason as a sentence, which the next sample shows to the player.

**The hand in the world is arithmetic.** The measured muzzle is in the bender's own units from his feet; the hand in the world is the tower's place, plus the podium's height, plus the muzzle scaled and turned by the bender's yaw. A test plays the real animation to the moment of the fire, asks the real skeleton where its hands are, and checks that one is within 0.15 of what the tower said.

## Key code

**Holding the hips still: keep the height, change the rest.**

```js
key.value = new BABYLON.Vector3(home.x, key.value.y, home.z);
```

**The short way round a circle.**

```js
const difference = angleDifference(current, desired);
if (Math.abs(difference) <= maxStep) return wrapAngle(desired);
return wrapAngle(current + Math.sign(difference) * maxStep);
```

## Controls

- None yet: Space takes a screenshot
- **`?map=1`** in the address for the second map

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models and play the real animations, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Building. The next sample is [**build**](../tower_defense_build/README.md): dragging a podium from a tray onto the board, with an outline that is red where you can't build and green where you can, and gold to pay for it.
