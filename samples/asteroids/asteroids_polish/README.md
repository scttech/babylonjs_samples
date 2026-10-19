# Asteroids Polish

Step 7 of the Asteroids series. Builds on [Asteroids UFO](../asteroids_ufo/README.md), reusing its ship, bullets, rocks, UFO, waves, score, lives, and sounds wholesale. What's new is everything that makes it feel like a finished game: a **title screen**, **pause**, **particle explosions**, **hyperspace**, and a **thrust rumble**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the UFO sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**Game states, and a flag that says what they add up to.** `Game` gains `started` and `paused` alongside the lives it already tracked. `playing` is derived: `started && !paused && !over`. That one getter says in one place what "the game is running" means, so nothing else has to repeat the three-part condition. `togglePause()` returns the new state so the caller can show or hide PAUSED, and it ignores the request on the title screen and after Game Over, since neither can be paused.

**States are early returns.** The frame loop handles each state by stopping the frame early. On the title screen only the rocks drift. When paused, nothing runs. This is simpler and safer than scattering `if (!paused)` through the loop. Bursts are tidied up *above* those returns so they still finish while paused, and the paused branch also switches the UFO siren off (the loop that normally notices the UFO leaving isn't running), which turns back on by itself after resuming.

**A title screen that helps with audio.** Browsers refuse to play sound until the user has done something on the page. The player's first action is now to start the game, with Enter or a click, which unlocks audio from then on. `restartGame` is the old R handler moved into a function, so starting and restarting share one definition of "a fresh game". Once started, R restarts without bringing the title back.

**Explosions are one-shot particle systems.** `Explosions.spawn(x, y, scale)` starts a `BABYLON.ParticleSystem` burst and lets Babylon move and fade every particle. `scale` sets both the count (16 per unit) and the speed (`sqrt(scale)`, so a burst four times bigger flies twice as fast, which looks more natural). Colors can be overridden per burst: red-tinted for the UFO, blue for hyperspace. The burst's lifetime is computed (the ramp-up plus the longest-lived particle) rather than read from Babylon, because right after `start()` Babylon's own "finished" flags still read empty for a frame or two.

**Hyperspace is a gamble with a cooldown.** `Ship.hyperspace(bounds, random)` moves the ship to a random spot, stopped dead, and returns whether it survived. There is a small chance (10%) that the jump itself fails, and the new spot might be on a rock. The 1.5-second cooldown stops it becoming a cheat, and `event.repeat` is ignored so holding H doesn't count as repeated decisions. The ship only moves; what a failed jump *means* is `main.js`'s job, which sends it through the same `loseShip` as every other death. The dice are injectable, like the rocks and the UFO, so a test can script the outcome.

**A rumble that loops seamlessly.** Random noise doesn't join up with itself where a loop restarts, so the buffer is generated a little too long and the extra samples that would have followed the end are blended into the start. The sound is driven by `game.playing && thrust key held`, so pausing or running out of lives silences it even with the key down.

**New classes are shown closed from the start.** The tutorial introduces `Explosions` as a complete, closed class and has you add each method inside it, so the file is valid JavaScript after every step.

## Key code

**What "playing" means.**

```js
get playing() {
  return this.started && !this.paused && !this.over;
}

togglePause() {
  if (!this.started || this.over) return this.paused;
  this.paused = !this.paused;
  return this.paused;
}
```

**States as early returns in the frame loop.**

```js
explosions.update(dt); // finished bursts are tidied up whatever else is happening

if (!game.started) {
  rocks.update(dt, bounds); // title screen: only the rocks drift
  return;
}

if (game.paused) {
  if (sirenOn) {
    sirenOn = false;
    setSiren(false);
  }
  return;
}
```

**One definition of a fresh game.**

```js
const restartGame = () => {
  ship.reset();
  bullets.clear();
  ufoBullets.clear();
  ufo.reset();
  rocks.clear();
  hud.resetScore();
  game.reset();
  hud.setLives(game.lives);
  hud.hideGameOver();
  hud.hidePaused();
  waves.reset();
  hud.setWave(waves.wave);
};

const startGame = () => {
  game.start();
  hud.hideTitle();
  restartGame();
};
```

**A burst of particles.** Two opposite corners of a box of directions let Babylon pick any direction for each particle; a high `emitRate` with `manualEmitCount` empties the burst in about a frame.

```js
const count = Math.min(Math.round(16 * scale), this.maxParticles);
const power = Math.sqrt(scale);

const system = new BABYLON.ParticleSystem("explosion", this.maxParticles, this.scene);
system.particleTexture = this._texture;
system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
system.emitter = new BABYLON.Vector3(x, y, 0);
system.direction1 = new BABYLON.Vector3(-1, -1, 0);
system.direction2 = new BABYLON.Vector3(1, 1, 0);
system.minEmitPower = 2 * power;
system.maxEmitPower = 6 * power;
system.color1 = this._toColor4(colors[0]);
system.color2 = this._toColor4(colors[1]);
system.colorDead = this._toColor4(colors[1], 0); // fades to transparent
system.emitRate = count * 20;
system.manualEmitCount = count;
system.start();

const ttl = count / system.emitRate + this.maxLifeTime + 0.15;
this.systems.push({ system, ttl });
```

**The jump.** Three `random()` calls: the new x, the new y, and the roll for whether the jump fails.

```js
hyperspace(bounds, random = Math.random) {
  this.x = (random() * 2 - 1) * bounds.halfWidth;
  this.y = (random() * 2 - 1) * bounds.halfHeight;
  this.vx = 0;
  this.vy = 0;
  this.hyperspaceTimer = this.hyperspaceCooldown;
  this._syncMesh();
  return random() >= this.hyperspaceFailChance;
}
```

```js
const hyperspace = () => {
  if (!game.playing || !ship.hyperspaceReady) return;
  explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
  const survived = ship.hyperspace({ halfWidth, halfHeight });
  explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
  if (!survived) loseShip();
};
```

**Starting from a click, ignoring key repeat.**

```js
canvas.addEventListener("pointerdown", () => {
  if (!game.started) startGame();
});

if (event.code === "KeyH") {
  if (!event.repeat) hyperspace();
  return;
}
```

**A noise loop that joins up with itself.** The first `fadeLength` samples are blended with the extra samples that "would have come next", so the end flows into the start.

```js
for (let i = 0; i < rumbleLength; i++) {
  let value = raw[i];
  if (i < fadeLength) {
    const mix = i / fadeLength;
    value = raw[i] * mix + raw[rumbleLength + i] * (1 - mix);
  }
  rumbleData[i] = value * 2.5;
}
```

```js
const thrusting = game.playing && anyHeld(THRUST_KEYS);
if (thrusting !== thrustOn) {
  thrustOn = thrusting;
  setThrust(thrustOn);
}
```

## Babylon.js features demonstrated

- Everything from Asteroids UFO (orthographic camera, line-art meshes, GUI over a 3D scene, synthesized and looping sound)
- `BABYLON.ParticleSystem` one-shot bursts with `manualEmitCount`, per-burst colors, additive blending, and a procedurally drawn `DynamicTexture` sprite
- Several centered `BABYLON.GUI.TextBlock` messages shown and hidden by game state
- A user gesture (click or key) as the trigger that unlocks browser audio
- Looping `createSoundAsync(..., { loop: true })` sounds started and stopped by game state

## Controls

- **Enter** or **click** — start from the title screen
- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **H** — hyperspace: jump to a random spot (risky, with a short cooldown)
- **P** — pause and resume
- **R** — restart (doesn't go back to the title screen)
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the game states and pause rules, the title and paused messages, `Explosions` (through a stubbed `BABYLON.ParticleSystem`: particle counts and caps, scaling, colors, the shared texture, and disposal timing), and hyperspace with scripted dice (position, stopped dead, survive or fail, cooldown).

## Notes

Browsers block audio until a user gesture. Starting the game with Enter or a click counts, and Babylon shows its own small unmute prompt if it's still needed.

## Next up

[Asteroids Next Steps](../asteroids_next_steps/README.md) finishes the series: lit 3D rocks, 3D ships and saucers, a ship picker, and an optional chase-camera mode.
