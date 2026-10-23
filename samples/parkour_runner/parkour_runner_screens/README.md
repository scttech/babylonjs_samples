# Parkour Runner Screens

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 7 of the Parkour Runner series, and the first of three that finish the game. Builds on [Parkour Runner Score](../parkour_runner_score/README.md), reusing its runner, street, obstacles, coins and score. What's new is the front and back of the game: a **title screen** where you type your name and pick a color for the runner, a **pause**, and a **game over screen** with your score and a **leaderboard** of the best runs on this device, with a **High Score** banner for a new best. The game's text now uses the graffiti **font** of the logo.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Score sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**The game is a state machine.** `Game` is a value (`title`, `playing`, `paused` or `over`) and the rules for changing it: you can pause a run that is going, resume one that is paused, and go back to the title from a pause or the end of a run. Time (`dt`) is zero on the title and while paused, but not after a crash, so the runner can finish falling over behind the game over screen. A pause also turns off `scene.animationsEnabled`, because Babylon.js plays animation clips by the clock and not by your `dt`.

**Saved data can't be trusted.** The name, the color and the best scores are kept with `localStorage`, which may be missing, may refuse to save, and holds whatever was last written. `browserStorage`, `readJson` and `writeJson` never throw, and `Profile` and `Leaderboard` check everything they read: a name is cleaned, a color goes through `colorById`, and a leaderboard entry without a name and a positive score is dropped. The game works without storage; it just can't remember. The leaderboard is local: it only knows the scores set in this browser.

**Ask before you change the answer.** The game over screen asks `isBest(score)` *before* `add(...)`. After the score is on the board it is always the best, so asking afterwards would say "New best!" on every run. A tie goes below the score it ties.

**Menus are HTML.** The title, the pause and the game over are plain elements over the canvas, filled in by `Screens`: a real text field and buttons, with layout and focus from the page. Names are put in with `textContent`, never `innerHTML`, so a name can't add anything to the page. Every button lets go of the keyboard when clicked, or the space bar (the jump key) would press it again.

**The runner is the preview.** The mannequin is made from two materials, `M_Main` and `M_Joints`. A color is a pair of hex colors, and `tintRunner` sets those two materials' `albedoColor`, so a choice repaints the runner at once, with no extra cost while running.

**Fonts.** Sedgwick Ave Display is the graffiti handwriting of the logo, for big words and numbers. It is thin, so Bangers does the small text. Both are free fonts from `assets/fonts`. A GUI label draws its text once, so the game waits for the fonts with `document.fonts.load` before it makes the score.

**Keys mean different things in different places.** In a text field the keys are letters, so the handler leaves them alone (apart from Enter). On the title, Enter plays; in a run, the arrows move; in a pause, Enter or P carry on; after a crash, Enter or R run again. T goes to the title.

## Key code

**The rules of the states.**

```js
_change(from, state) {
  if (!from.includes(this.state)) return false;
  this.state = state;
  return true;
}

pause() {
  return this._change([STATES.playing], STATES.paused);
}

togglePause() {
  return this.pause() || this.resume();
}
```

**Reading saved data, without trusting it.**

```js
load() {
  const saved = readJson(this.storage, this.key);
  const list = Array.isArray(saved) ? saved : [];
  this.entries = list
    .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score) && entry.score > 0)
    .map((entry) => ({ name: cleanName(entry.name), score: Math.floor(entry.score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_SIZE);
}
```

**Asking before adding.**

```js
const total = score.total;
const newBest = leaderboard.isBest(total);
const rank = leaderboard.add(profile.name, total);
```

**A pause freezes time and the animations.**

```js
const dt = game.frozen ? 0 : Math.min(engine.getDeltaTime() / 1000, 0.05);
scene.animationsEnabled = game.state !== STATES.paused;
```

**Repainting the runner.**

```js
function tintRunner(root, color) {
  for (const mesh of root.getChildMeshes()) {
    const material = mesh.material;
    if (!material) continue;
    if (material.name === BODY_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.body);
    else if (material.name === JOINTS_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.joints);
  }
}
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Score (an animated character, an endless street, obstacles and coins from a shared pool, a GUI score)
- Changing a model's look through its materials (`PBRMaterial.albedoColor`)
- `scene.animationsEnabled`: holding every animation clip at once
- Fonts in Babylon.js GUI (`TextBlock.fontFamily`), and waiting for them to load
- HTML and CSS menus over a 3D scene, including a text field that doesn't fight the game's keys

## Controls

- **Enter** or the **Play** button — start, on the title
- **Left/Right arrow keys or A/D** — move one lane left or right
- **Up arrow, W or Space** — jump, or vault if a barrier is just ahead
- **Down arrow or S** — slide; in the air, dive and roll
- **P** or **Esc** — pause, and carry on
- **R** — restart the run (not on the title)
- **T** — back to the title, from a pause or the game over screen
- **C** — save a PNG screenshot of the current frame

The game also pauses by itself when the page loses focus or the tab is hidden.

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the game's states and every change between them, the colors and painting the runner (with a stand-in for Babylon.js), `cleanName`, the storage helpers, the profile and the leaderboard (including damaged saves, no storage and storage that throws), the HUD's fonts and hiding, and the screens, with a stand-in page.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street, the obstacles and the coin) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md). The fonts are [Sedgwick Ave Display](https://fonts.google.com/specimen/Sedgwick+Ave+Display) and [Bangers](https://fonts.google.com/specimen/Bangers), under the SIL Open Font License.

## Next up

[**Parkour Runner Effects**](../parkour_runner_effects/README.md) adds sounds, coin sparkles, crash dust, a camera shake, and a banner for big combos.
