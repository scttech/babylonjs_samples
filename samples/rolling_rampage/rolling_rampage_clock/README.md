# Rolling Rampage Clock

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 5 of the Rolling Rampage series. Builds on [Rolling Rampage Levels](../rolling_rampage_levels/README.md). What's new is that a level is now a **game**: there is a **clock** counting down, a **goal** to roll into, and **checkpoints** on the way that add bonus seconds and are where the marble starts again if it falls off. Reach the goal and the next level comes up; run out of time and the level starts again. The goal and the checkpoints are **zones**: round patches of floor that do something when the marble rolls into them, made with Havok **triggers**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Levels sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**A run is a state machine, kept apart from the screen.** `Run` is one attempt at a level, and it is always `ready` (the splash is still up), `running`, `won` or `timeup`. It has the time left and the checkpoints already reached, and a few methods that change them (`start`, `tick`, `reachCheckpoint`, `finish`). It is plain numbers, so every rule has a test: the clock stops at zero, a bonus is paid once, a bonus that arrives in time saves the run, and the goal doesn't win a run that is already over. The clock counts in seconds from the frame's `dt`, so it runs at the same speed on any screen, and `formatTime` rounds up so it only says `0:00` when the time is really out.

**Zones are level data.** Each level has a `time`, a `goal` and a list of `checkpoints` (with a `bonus` each), in the same grid units as its start. A test checks every zone of every level is on flat floor all the way round, so the disc that marks it lies flat, and that none is on the start or on another zone.

**A trigger is a body that only reports.** A zone is two things: a glowing disc to *see*, and an invisible, taller cylinder to *feel*. The cylinder is a physics shape marked `isTriggerShape`, so the marble passes through it as if it weren't there, and Havok says so through `onTriggerCollisionObservable` (`TRIGGER_ENTERED`, once, on the way in). `buildZones` finds which zone it was, and calls `onEnter(zone, node)` with *what* entered, because later on enemies will roll into zones too and only the marble may win.

**A timer must not act on a level that has gone.** After a win, the game waits a moment and goes on to the next level, and the player might press **N** in that moment. Each wait remembers which run it was set for, and does nothing if that is no longer the one being played.

**Zones look like a construction site.** Each disc sits in a black and yellow hazard-striped border, like the buttons. The stripes are drawn in code on a canvas (`makeStripeTexture`), as a repeating texture on a flat ring that glows, and the border has to lie flat on the floor like the disc does, which a test checks.

**The stylesheet is split by part of the page.** The single `game.css` had grown past 300 lines, with a comment over each part. Each part is now a file of its own (`theme.css`, `page.css`, `splash.css`, `buttons.css`, `responsive.css`, `stick.css`, `tilt.css`, `levels.css`, and this sample's `hud.css` for the clock and the banner), linked in that order from `index.html`.

**The goal stops the marble.** Once a run is won the marble can't be steered, but it would still roll on with its momentum, over the edge of the landing. `Marble.stop()` takes its speed and spin away at once and damps it hard, and `Marble.glideTo()` then rolls it to the middle of the goal (a trigger fires when the marble first touches the zone, which is its edge), where it rests. `reset` gives the normal damping back. The goal disc greys out, as a used checkpoint's does.

**Everything that puts the marble back goes to the checkpoint.** A checkpoint changes `marble.start`. **R**, the *Drop again* button, and falling off the level all call the same code, so all three now start again from the last checkpoint, with no more code.

## Key code

**A run.**

```js
tick(dt) {
  if (this.status !== "running") return;
  this.remaining = Math.max(0, this.remaining - dt);
  if (this.remaining === 0) this.status = "timeup";
}
```

**A bonus, paid once.**

```js
reachCheckpoint(index) {
  if (this.status !== "running" || this.reached.has(index)) return 0;
  this.reached.add(index);
  this.remaining += this.bonuses[index];
  return this.bonuses[index];
}
```

**A trigger zone.**

```js
const aggregate = new BABYLON.PhysicsAggregate(trigger, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0, isTriggerShape: true }, scene);

plugin.onTriggerCollisionObservable.add((event) => {
  if (event.type !== "TRIGGER_ENTERED") return;
  // find which of our triggers it was, and what rolled in
});
```

**Only the marble counts.**

```js
const reachZone = (zone, node) => {
  if (node !== marble.mesh) return;
  if (zone.kind === "goal") run.finish();
  else if (run.reachCheckpoint(zone.index) > 0) marble.start = levelStart(level.grid, zone);
};
```

**A timer for the right run.**

```js
setTimeout(() => run === thisRun && nextLevel(), END_PAUSE_MS);
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Levels
- Havok trigger shapes: `PhysicsAggregate` with `isTriggerShape: true`, and `HavokPlugin.onTriggerCollisionObservable`
- `CreateCylinder`, and an emissive `StandardMaterial` with `disableLighting`, for something that glows
- Taking physics bodies, meshes and observers away when a level goes

## Controls

- **Arrow keys or WASD**, **touch and drag**, or **tilt**: roll the marble, while the clock is running
- **R**, or the **Drop again** button: put the marble back at the last checkpoint (the clock keeps running)
- **N**, or the **Next level** button: go to the next level, with a fresh clock
- **C**: save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the time as words, every rule of a run, the clock and zones of every level (some time, bonuses worth having, zones on flat floor, none overlapping), and the zones in the real physics world: a marble landing in the goal and in a checkpoint, rolling through without being stopped or reported twice, something that isn't the marble being reported as what it is, a checkpoint being greyed out, zones being taken away and built for another level, and a marble being stopped and set free again.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

**Rolling Rampage Hazards** (coming next) adds moving platforms, pistons and slime.
