# Parkour Runner Effects

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 8 of the Parkour Runner series, the second of the three that finish the game. Builds on [Parkour Runner Screens](../parkour_runner_screens/README.md), reusing its states, screens, leaderboard and colors. What's new is feel: **sounds** for every move, coin and crash, made with code and no sound files; **gold sparkles** where a coin was picked up; **dust** and a **camera shake** when the runner crashes; and a **Sick Combo banner** each time the combo reaches 5, 10, 15 and so on. A **Sound** button and the **M** key turn the sound off and on, and the choice is remembered.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Screens sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**Sound is made, not loaded.** The Web Audio API works like a synthesizer: an oscillator makes a wave at a pitch, a gain node sets its volume, and a filter shapes noise. Each sound in `SOUNDS` is a short list of parts (a tone gliding from one pitch to another, or a burst of filtered noise), each with a start, a length and a volume, and one small player turns any list into sound by scheduling it in *audio time*. There is nothing to download or license.

**The browser keeps quiet until the player does something.** An audio context made before a click or a key press starts "suspended". `Sounds.unlock()` makes it, and wakes it, and the game calls it from the first `pointerdown` or key. Without Web Audio it returns `false` and the game carries on silent.

**Sounds follow changes.** `lastMove` is last frame's move: when this frame's is different, a move has *started*, and `soundForMove` says which sound, if any. A vault that was queued from an early press sounds when it happens, and the runner never has to know sounds exist. Coins pitch up with the multiplier (`rate`).

**Particles are made once and fired by hand.** One `ParticleSystem` per kind, with `emitRate = 0`, started once. A burst moves the emitter to a point and sets `manualEmitCount`, so nothing is created while the game runs. What each kind looks like (size, life, power, gravity, additive light or not) is plain data in `PARTICLE_PRESETS`. The soft round particle picture is drawn into a `DynamicTexture`, so there is no image to load.

**The shake dies away.** `CameraShake` gives a random offset up to `strength`, scaled by the square of the time left, so it settles quickly and then gently. The offset is added to where the camera would have been each frame, so the camera can't drift. With no time passing (a pause) the offset stays as it was.

**A milestone is a step into a higher bucket.** `comboMilestone(before, after)` compares `floor(combo / 5)`: 4 to 5 is a milestone, 5 to 6 isn't, and a lost combo isn't.

**Restarting a CSS animation takes a trick.** The banner's pop-and-fade plays when the class `show` is added. To play it again while it is still showing, the class has to come off and go back on, and the page must notice in between, which reading `offsetWidth` forces.

## Key code

**A sound is data, and one function plays any of them.**

```js
const SOUNDS = {
  coin: [
    { wave: "square", from: 988, to: 988, start: 0, length: 0.07, volume: 0.18 },
    { wave: "square", from: 1319, to: 1319, start: 0.07, length: 0.2, volume: 0.18 },
  ],
  slide: [{ noise: true, filter: 1800, start: 0, length: 0.35, volume: 0.18 }],
};

const oscillator = this.context.createOscillator();
oscillator.type = part.wave;
oscillator.frequency.setValueAtTime(part.from * rate, at);
oscillator.frequency.exponentialRampToValueAtTime(part.to * rate, at + part.length);
oscillator.connect(gain);
oscillator.start(at);
oscillator.stop(at + part.length);
```

**A burst of particles.**

```js
burst(name, x, y, z) {
  const system = this.systems[name];
  system.emitter.x = x;
  system.emitter.y = y;
  system.emitter.z = z;
  system.manualEmitCount = PARTICLE_PRESETS[name].count;
}
```

**Hearing a move start.**

```js
if (game.playing && runner.move !== lastMove) {
  const sound = soundForMove(runner.move);
  if (sound) sounds.play(sound);
}
lastMove = runner.move;
```

**A combo milestone.**

```js
function comboMilestone(before, after) {
  return after > before && Math.floor(after / COMBO_MILESTONE) > Math.floor(before / COMBO_MILESTONE);
}
```

**The shake, added on top of the follow camera.**

```js
const view = followPosition(runner);
const jolt = shake.update(dt);
camera.position.set(view.x + jolt.x, view.y + jolt.y, view.z);
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Screens (states, HTML screens, a leaderboard, colors, fonts)
- `ParticleSystem`: emitters, lifetimes, power, gravity, colors that fade, additive blending, `manualEmitCount`, and `updateSpeed` to hold them in a pause
- `DynamicTexture`: a texture drawn on a canvas in code
- Web Audio (outside Babylon.js, and needing no files): `AudioContext`, oscillators, gain, a lowpass filter and a buffer of noise

## Controls

- **Enter** or the **Play** button — start, on the title
- **Left/Right arrow keys or A/D** — move one lane left or right
- **Up arrow, W or Space** — jump, or vault if a barrier is just ahead
- **Down arrow or S** — slide; in the air, dive and roll
- **P** or **Esc** — pause, and carry on
- **M** or the **Sound** button — sound off and on
- **R** — restart the run (not on the title)
- **T** — back to the title, from a pause or the game over screen
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the sounds as data and the player with a stand-in audio context (what it makes, how it is wired, when it starts and stops, the noise being made once, muting and unlocking), the rules for the effects (which move makes which sound, combo milestones, the shake), the particle presets and the bursts with a stand-in for Babylon.js, the profile's sound setting, and the screens' banner and sound button.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street, the obstacles and the coin) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md). The fonts are [Sedgwick Ave Display](https://fonts.google.com/specimen/Sedgwick+Ave+Display) and [Bangers](https://fonts.google.com/specimen/Bangers), under the SIL Open Font License. The sounds are made by the code.

## Next up

[**Parkour Runner Touch**](../parkour_runner_touch/README.md) adds swipe controls and a layout for phones and tablets.
