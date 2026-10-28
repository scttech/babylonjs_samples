# Rolling Rampage Polish

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 9 of the Rolling Rampage series. Builds on [Rolling Rampage Screens](../rolling_rampage_screens/README.md). What's new is **feel**, and **length**: there are now **ten levels**, not three. A bump throws **sparks** and **shakes** the screen, a checkpoint **glitters**, the goal sets off a **firework**, the slime's win is a green **puff**, and a marble going fast leaves a **trail**. And there is something for the person making the game: a **developer panel**. Add `?dev` to the address and a panel of sliders appears, for the marble's look, how it feels to roll, the lights and the effects, so you can tune them while you play.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Screens sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. For the panel, open it with `?dev` on the end, for example `.../rolling_rampage_polish/?dev`.

**A burst and a stream.** Each kind of effect is a Babylon.js `ParticleSystem` that is made once and fired by hand, so nothing is made while the game runs. A *burst* makes a number of particles at once at a point (`manualEmitCount`). The *trail* is a stream, made by the second (`emitRate`, with `manualEmitCount` of `-1`), and only as much of it as the marble's speed earns (`trailRate`).

**Effects are data.** What each kind looks like (how many, which colours, how big, how long, how fast, which way gravity pulls) is a row in `PARTICLE_PRESETS`. A new effect is a new row. Overlapping particles add their light (`BLENDMODE_ONEONE`), so sparks glow, and each fades out as it dies (`colorDead`).

**A shake is a number that dies away.** `shakeFade` falls quickly and then settles, as a knock feels, and `shakeOffset` wobbles across and up at different speeds so the view jumps about. `Shake` keeps how old the shake is and how big, with no Babylon.js. The game moves the four edges of the orthographic view by the offset (`showView`), and puts them back the next frame.

**Everything stops in a pause.** `effects.setFrozen(game.frozen)` holds every particle still, and the shake is given a `dt` of 0, so nothing about the pause had to be written for the new effects.

**Every effect has a dial.** `effects.amount` scales all the particles and `shake.strength` the shake, and 0 turns either off. They are useful twice over: a player who finds them too much, and you, deciding how much is enough.

**Seven more levels, which are only data.** A level is a grid of heights with a start, a goal, checkpoints and hazards, so *Switchback*, *Stepping Stones*, *Crusher Row*, *Slime Pit*, *Ferry Crossing*, *Hill Climb* and *Rampage* need no new code: `LEVELS` just gets longer, and the game, the **N** key, the score and the end of the game all go by `LEVELS.length`. The tests from earlier tutorials already check every level (zones on flat floor, pistons on flat floor, platforms that meet the floor), and new ones check that the goal and every checkpoint can be walked to from the start (a flood fill that treats a moving platform as a bridge) and that the clock is fair.

**A developer mode from a table.** `devEnabled(location.search)` is on only with `?dev`. The panel (`DevPanel`) is built from rows: a label, a range, and how to read and write the number (`control`, or `slider` for a property of an object). Adding a slider is adding a line. It folds up to a title bar, hides with the key under Esc, lets go of the keyboard after a slider is moved so the arrow keys steer again, starts folded up on a phone, and **Copy values** puts the numbers on the clipboard to paste into the code.

**The panel reaches into the game.** The marble's push and top speed work because the player's `Marble` is given an empty `steer` object, which `steeringForce` reads `force` and `topSpeed` from when they are there.

## Key code

**A burst, and the trail.**

```js
burst(name, x, y, z) {
  const system = this.systems[name];
  if (!system) throw new Error(`There is no kind of burst called "${name}"`);
  system.emitter.x = x;
  system.emitter.y = y;
  system.emitter.z = z;
  const preset = PARTICLE_PRESETS[name];
  system.manualEmitCount = Math.min(preset.capacity, Math.round(preset.count * this.amount));
}
```

**How much trail a speed earns.**

```js
function trailRate(speed, topSpeed, rate = PARTICLE_PRESETS.trail.rate) {
  const share = Math.min(1, speed / topSpeed);
  if (share < TRAIL_MIN_SHARE) return 0;
  return Math.round(rate * ((share - TRAIL_MIN_SHARE) / (1 - TRAIL_MIN_SHARE)));
}
```

**A shake fades quickly and then settles.**

```js
function shakeFade(age, duration = SHAKE_DURATION) {
  if (age >= duration) return 0;
  const left = 1 - Math.max(0, age) / duration;
  return left * left;
}
```

**Moving the view without moving the camera.**

```js
const showView = (across = 0, up = 0) => {
  camera.orthoLeft = -view.halfWidth + across;
  camera.orthoRight = view.halfWidth + across;
  camera.orthoBottom = -view.halfHeight + up;
  camera.orthoTop = view.halfHeight + up;
};
```

**A row of the panel.**

```js
slider("shine", steel, "specularPower", 1, 512, 1),
control("gravity", () => -physics.gravity.y, (value) => physics.setGravity(new BABYLON.Vector3(0, -value, 0)), 1, 30, 0.1),
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Screens
- `ParticleSystem`: `emitter`, `emitRate`, `manualEmitCount`, `minSize`/`maxSize`, `minLifeTime`/`maxLifeTime`, `minEmitPower`/`maxEmitPower`, `gravity`, `direction1`/`direction2`, `color1`/`color2`/`colorDead`, `blendMode` (`BLENDMODE_ONEONE` and `BLENDMODE_STANDARD`), `updateSpeed`
- A particle texture drawn on a `DynamicTexture`
- Moving an orthographic camera's view by changing `orthoLeft`, `orthoRight`, `orthoBottom` and `orthoTop`
- `PhysicsEngine.setGravity`
- Changing a `StandardMaterial` and its `FresnelParameters` live
- (The panel is the browser's: HTML, `input type="range"` and the clipboard.)

## Controls

- Everything from the Screens sample
- **`?dev` on the address, then the key under Esc**: hide and show the developer panel. Its **Dev** bar folds it up, and **Copy values** copies the numbers

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover ten levels that can be finished, every preset, how much trail every speed earns, the particle systems against a stand-in for Babylon.js (what each is set to, a burst, the trail, the amount, the pause and disposing of them), the fade and offset of a shake and the `Shake` that keeps them, and the panel: `?dev`, rows, the numbers shown, the sliders against a stand-in page, folding up, hiding, and copying.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md). The particles follow the pattern of the Parkour Runner series.

## Next up

This finishes the game. The challenges at the end of the [tutorial](TUTORIAL.md) suggest where to take it next.

[**Rolling Rampage Editor**](../rolling_rampage_editor/README.md) gives the game a level editor, so anyone can make, test, save, play and share levels of their own.
