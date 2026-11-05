# Tower Defense Polish

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 10 of the Tower Defense series. Builds on [Tower Defense Screens](../tower_defense_screens/README.md). The game was complete; this sample is what makes it good to play for someone who isn't you. A **speed button** (×1, ×2, ×3) for a player who has built and is waiting for the wave. A **limit** to how many enemies can be on the board, so that a big wave can't be too much for a phone. A **detail setting** (low, medium, high) on the pause screen that is remembered (and so is whether the sound is on), and that the game lowers by itself, once, when it finds that it is running slowly. **Sound**: effects made in code (a table of recipes, one for each nation's shot, for building, upgrading, the horn of a wave and so on) and three tracks of **music** that change with the game: the theme for the title and the end, a calm track for the time between waves, and the battle track for a wave. And a **dev panel**, with `?dev` in the address, of sliders for the numbers of the game, to be tuned by playing it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Screens sample. Run `node reset-tutorial.js` to return this folder to the Screens sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. A fan project: see the [series README](../README.md).

**A faster game is more steps, not longer ones.** The game is written for steps of a fiftieth of a second at the longest (a bolt in a longer step would fly through the enemy it was thrown at), so ×2 takes twice as many of the same steps in a frame. The scene's own animation clock is scaled too, or the enemies would cross the board faster with their legs at the old pace.

**A limit is a table, and is tested against the game that it limits.** An enemy that comes on when the board is full waits, and a wave is not beaten while one waits. The simulation plays the real waves with no towers, and says the board never gets more than three quarters full, so the limit changes nothing in the game as it is.

**Detail is a table, a choice and a guess.** The address, then what the player chose, then the device decide where to start; the choice is kept in storage that can fail. A `FrameMeter` looks at the last three seconds and says *slow* below 28 frames a second: one long frame (a tab coming back) is a stutter, and not a slow game.

**Effects are recipes, and are tested by listening.** Each is a few notes (a tone that glides, or filtered noise) shaped by a rise and a fall, scheduled on any audio context, so a test renders each into numbers and says that it is heard, not too loud, and over when it should be. A browser makes no sound until the page has been touched, so the sound begins with the first tap or key (the title is silent until then).

**Music is one track at a time, streamed.** Which is playing is a function of the screen and the director's phase; a change is a crossfade; a track that is faded out is stopped; a paused game turns the music down and does not stop it; and a hidden page pauses the files.

**A dev panel is built from a table.** A slider is a row with an object and the name of one of its numbers, so it changes the number that the game reads. Reset puts them back, and Log values prints them to be pasted into the tables. The table is a function, so that it doesn't matter which script was loaded first.

## Key code

**A faster game takes more steps.**

```js
for (const step of speed.steps(dt)) advance(world, step);
```

**A slider changes the table itself.**

```js
{ group: "Bolts and towers", label: "bolt speed", object: BOLT, key: "speed", min: 3, max: 25, step: 0.5 }
```

## Controls

- **×1 / ×2 / ×3** (top right, while playing) changes the speed; **Pause** has **Detail: ...** and **Sound: ...** on it; **M** turns the sound off and on
- **`?dev`** in the address: the dev panel; the **`** key shows and hides it
- **`?detail=low`** (or medium, or high) in the address picks the detail for that game
- Everything else as in the last sample

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, draw the marks and the minimaps, and play whole games, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md). The music is by [Mykola Odnoroh](https://pixabay.com/users/ikoliks_aj-48415707/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=346568) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=346568) and by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=349180) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=349180) (two tracks).

## Next up

The editor. The [last sample](../tower_defense_editor/README.md) lets the player build a map: drop pieces of road and scenery on the board, have the route checked, and save and share it.
