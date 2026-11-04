# Tower Defense Screens

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 9 of the Tower Defense series. Builds on [Tower Defense Elements](../tower_defense_elements/README.md). The game began the moment the page loaded, could not be stopped, and ended with a banner and a reload. Now it has **screens**: a **title** over the board with a card for each map (a small picture of it, drawn from the map itself, and the stars it has earned), a **pause** (the button, **P**, **Escape**, or leaving the page), and a **result** for a game won or lost, with **stars** (one for winning, two with half the lives left, three with nine tenths), the numbers of the game (waves, lives left, enemies defeated, gold earned, towers built, upgrades, time) and a note when it is a **best**. The best on each map is remembered in the browser.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Elements sample. Run `node reset-tutorial.js` to return this folder to the Elements sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. A fan project: see the [series README](../README.md).

**Which screen it is, is one small object.** A `Flow` is a table of states (title, playing, paused, won, lost) and what can be done from each. An action that is not allowed from here does nothing and says so, so a pause at the title or a game that is finished twice needs no check at the place that does it. Only `playing` is running, and the game is advanced only then.

**A pause has to stop the animations too.** The scene's own clock makes the enemies swing their arms, and the game's frame doesn't drive it: `scene.animationsEnabled` is switched with the flow.

**The result is worked out where the game ends.** The stars are a function of how it ended and the lives that were left, the numbers come from a `Stats` that the frame and the hand keep, and the screens are only given them.

**Records are kept in storage that can fail.** In a private window, with storage blocked, or when it is full, `localStorage` can be missing, can throw even when it is asked for, or can hold something that isn't records. `safeStorage`, `Records.load` and `Records.update` each take one of those, and the game plays on with no stars.

**A map is drawn from the map.** The card's picture is the parsed grid drawn at a small size, so it can't disagree with the game, and a third map in the list appears on the title with nothing else changed.

**A new map is a new page,** from an address that says which map and whether to begin at once (`go=1`). Starting over means a new scene, towers and director, and a page is certain to have none of what the last game left behind.

## Key code

**The machine is a table.**

```js
const FLOW = {
  title: { start: "playing" },
  playing: { pause: "paused", won: "won", lost: "lost" },
  paused: { resume: "playing" },
  won: {},
  lost: {},
};
```

**A pause stops the walking as well as the clock.**

```js
scene.animationsEnabled = flow.running;
```

## Controls

- The title: tap a map, then **Play**
- **Pause** (the button, or **P**) and **Resume**; **Escape** puts down whatever is in your hand, or pauses if there is nothing
- A result: **Play again**, or **Choose map**
- Building and upgrading as in the last sample; **`?map=1`** in the address picks the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, draw the marks and the minimaps, and play whole games, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Polish. The next sample, [**polish**](../tower_defense_polish/README.md), gives the game its finishing touches: a **speed button**, a limit to how many enemies are drawn, a **detail setting** for slower devices, and a `?dev` panel for tuning.
