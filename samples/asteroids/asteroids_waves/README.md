# Asteroids Waves

Step 5 of the Asteroids series. Builds on [Asteroids Lives](../asteroids_lives/README.md), reusing its ship, bullets, rocks, score, lives, and sounds wholesale. What's new is that clearing the screen no longer just spawns four more rocks: the game now has **waves** that get bigger and faster, a short breather with a "WAVE N" announcement between them, and rocks that each have their own shape.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Lives sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**A director that's told the facts.** `Waves` knows nothing about rocks, ships, or the screen. Every frame `main.js` tells it how many rocks are left, and it answers one question: should a new wave start now? `main.js` does the actual spawning, so `Waves` and `RockField` never need to know the other exists, in the same spirit as `Game` in the previous step.

**Difficulty is two small functions.** `rocksFor(wave)` starts at four rocks and adds one per wave, capped at nine; `speedScaleFor(wave)` starts at normal speed and adds 12% per wave, capped at double. The caps keep the late game playable, and the whole curve lives in one place.

**A small state machine.** `update()` has two states, waiting or not. Rocks on screen means not waiting. An empty screen starts a countdown once, counts it down by `dt`, and when it runs out bumps the wave number and returns `true` for exactly one frame. The first wave works the same way, since the game starts with no rocks: two seconds of "WAVE 1", then the rocks come in, with no special case for starting.

**Speed that lasts down the whole split chain.** `RockField` gets a `speedScale` that multiplies every random speed, including the kick given to the pieces when a rock splits. If only the starting rocks were faster, shooting one would produce pieces at the old speed and the escalation would vanish after the first hit. A velocity passed in explicitly is never scaled.

**No two rocks alike.** Each rock now picks its own corner count (8 to 13) and its own roughness (how far corners may be pulled in). Corners are only ever pulled in, never pushed out, so the visible outline still sits inside the collision circle and hits never feel unfair. The drawing code never assumed ten corners, so it needed no change.

**Tests that change for good reasons.** Replacing the `vertices` option broke two existing rock tests, and a third kept passing only by coincidence: its scripted `random()` sequence happened to line up. All three were updated, because a test that passes for the wrong reason is worse than one that fails.

## Key code

**The progression rules.**

```js
rocksFor(wave) {
  return Math.min(3 + wave, 9);
}

speedScaleFor(wave) {
  return Math.min(1 + 0.12 * (wave - 1), 2);
}

update(dt, rocksLeft) {
  if (rocksLeft > 0) {
    this.waiting = false;
    return false;
  }

  // The screen is clear: start the breather the first time we notice.
  if (!this.waiting) {
    this.waiting = true;
    this.countdown = this.breather;
  }

  this.countdown -= dt;
  if (this.countdown > 0) return false;

  this.waiting = false;
  this.wave += 1;
  return true;
}
```

**A random whole number in a range, and a shape per rock.** The `+ 1` is what makes `maxVertices` reachable, because `random()` never reaches 1.

```js
const vertexCount = this.minVertices + Math.floor(this._random() * (this.maxVertices - this.minVertices + 1));
const roughness = this.minRoughness + this._random() * (this.maxRoughness - this.minRoughness);
const shape = [];
for (let i = 0; i < vertexCount; i++) {
  shape.push(1 - this._random() * roughness);
}
```

**The speed scale, applied to the pieces too.**

```js
// in _randomVelocity()
const speed = (config.minSpeed + this._random() * (config.maxSpeed - config.minSpeed)) * this.speedScale;

// in destroy()
const speed =
  (childConfig.minSpeed + this._random() * (childConfig.maxSpeed - childConfig.minSpeed)) * this.speedScale;
```

**Making randomness predictable in a test.** A `random()` that always returns 0 makes every choice take its minimum: slowest speed, heading 0 (straight right), fewest corners.

```js
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const normal = new RockField({ random: sequence([0]) }).spawn("large", 0, 0);
const doubled = new RockField({ speedScale: 2, random: sequence([0]) }).spawn("large", 0, 0);

assert.true(Math.abs(doubled.vx - 2 * RockField.SIZES.large.minSpeed) < 1e-9);
```

**A reusable on-screen message.** The announcement's text isn't fixed, so the same label can announce "WAVE 2" now and something else later. With no `top` or `verticalAlignment` it keeps the GUI's default centering.

```js
this.announcementLabel = new BABYLON.GUI.TextBlock();
this.announcementLabel.color = "white";
this.announcementLabel.fontSize = 40;
this.announcementLabel.outlineWidth = 5;
this.announcementLabel.outlineColor = "#050508";
this.announcementLabel.isVisible = false;
this.announcementLabel.isHitTestVisible = false;
this.ui.addControl(this.announcementLabel);

showAnnouncement(text) {
  if (!this.announcementLabel) return;
  this.announcementLabel.text = text;
  this.announcementLabel.isVisible = true;
}
```

**Starting a wave and driving the director each frame.** During the breather `waves.wave` is still the wave just cleared, so the announcement says `wave + 1`.

```js
const startWave = () => {
  rocks.speedScale = waves.speedScaleFor(waves.wave);
  rocks.populate(waves.rocksFor(waves.wave), { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
  hud.setWave(waves.wave);
};

// in the frame loop
if (!game.over) {
  if (waves.update(dt, rocks.rocks.length)) startWave();
  if (waves.between) hud.showAnnouncement(`WAVE ${waves.wave + 1}`);
  else hud.hideAnnouncement();
}
```

## Babylon.js features demonstrated

- Everything from Asteroids Lives (orthographic camera, line-art meshes, GUI over a 3D scene, synthesized sound)
- Procedurally generated `CreateLines` outlines that vary per rock in corner count and roughness
- Several `BABYLON.GUI.TextBlock` labels working together: a counter pinned to the top, and a centered message with outline whose text changes
- A difficulty curve driving a 3D scene, with no physics engine

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **R** — restart: back to a breather before wave 1, with the ship in the center, bullets cleared, score zero, three lives
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/wrap.js`, `js/collision.js`, `js/ship.js`, `js/bullets.js`, `js/rocks.js`, `js/hud.js`, `js/game.js`, and `js/waves.js`. The new tests cover the difficulty curves and their caps, the wave state machine (including cancelling a breather and resetting), per-rock shape variety and the speed scale using scripted `random()` sequences, and the HUD's wave counter and announcement.

## Notes

Browsers block audio until a user gesture. Pressing a key counts, and Babylon shows its own small unmute prompt if it's still needed.

## Next up

[Asteroids](../README.md) continues with the UFO, an enemy saucer that crosses the screen and fires back.
