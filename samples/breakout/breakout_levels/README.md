# Breakout Levels

![Breakout Levels](../../../img/breakout_levels/breakout_levels.png)

Step 4 of the Breakout series. Builds on [Breakout Lives](../breakout_lives/README.md), reusing its ball/paddle physics (including the open-bottom miss detection), particle sparks, procedural bounce sound, and score/lives tracking wholesale. What's new is an actual finish line: three brick layouts to clear in sequence, tougher multi-hit bricks along the way, and a win state once the last one falls.

**`BrickGrid` is now driven by a level *pattern*, not a rows x cols rectangle.** A pattern is a 2D array of durability values — `0` means no brick in that cell, `N > 0` means a brick that survives `N` hits — so a level's silhouette doesn't have to be a solid rectangle (level 3 is a diamond). `main.js` defines `LEVELS` as arrays of character strings (`"."` for empty, a digit for durability) and a small `parseLevel()` converts each into the number grid `BrickGrid` expects. `BrickGrid.load(pattern)` replaces the old `reset()` — it's used both to advance to the next level and, on the Reset button, to restart at level 0.

**Bricks can now take more than one hit.** A brick record gained an `hits` field (initialized from its pattern durability); `BrickGrid.checkCollision()` decrements it on every hit and only destroys the brick once it reaches 0 — otherwise it recolors the brick's mesh and lets the ball bounce off normally. Color is keyed to a brick's *remaining* hits (green = 1 hit left, yellow = 2, orange = 3, red = 4), not its starting durability, so a battered tough brick and a fresh weak brick with the same hits left look identical — remaining hits is always readable at a glance. `Ball.bounceOffBrick()` itself is untouched; durability is entirely a `BrickGrid` concern.

**Clearing a level advances it; clearing the last one wins.** `main.js` checks `brickGrid.isCleared()` after every brick hit. If the board's empty, `advanceLevel()` loads the next pattern and relaunches the ball with score and lives untouched — or, once `levelIndex` runs past the end of `LEVELS`, sets a new `won` flag and shows `Hud`'s "You Win!" overlay instead. `won` gates paddle input and the physics step exactly the way `gameOver` already did (see Breakout Lives), and both flags are checked together (`gameOver || won`) everywhere that matters — a finished game freezes the same way whether the player ran out of lives or ran out of bricks.

**`Hud` gained a level label and a second overlay.** `Level: N` sits alongside `Score`/`Lives` in the top panel; `showWin()`/`hideWin()` and a `winLabel` mirror `showGameOver()`/`hideGameOver()`/`gameOverLabel` exactly, factored through a shared `_createOverlayLabel()` helper so both overlays (added straight to `ui`, not the top-pinned panel, so they keep `BABYLON.GUI`'s default center/center alignment) stay in sync.

## Key code

**Levels as text.** A level is an array of strings: `.` is an empty cell and a digit is a brick that survives that many hits. `parseLevel()` turns it into the number grid `BrickGrid` expects, so adding a level is just adding strings.

```js
const LEVELS = [
  ["11111111", "11111111", "11111111", "11111111", "11111111"],
  ["22222222", "11111111", "22222222", "11111111", "22222222"],
  ["..1111..", ".122221.", "12333321", ".122221.", "..1111.."], // a diamond
];

const parseLevel = (rows) => rows.map((row) => row.split("").map((ch) => (ch === "." ? 0 : Number(ch))));
```

**Laying out any shape.** `_build()` skips cells whose durability is 0, so a pattern doesn't have to be a rectangle. The grid is centered using its widest row.

```js
const cols = this.pattern.reduce((max, row) => Math.max(max, row.length), 0);
// ...
for (let row = 0; row < this.pattern.length; row++) {
  for (let col = 0; col < this.pattern[row].length; col++) {
    const durability = this.pattern[row][col];
    if (durability <= 0) continue; // no brick here
    // ...create a brick with hits: durability
  }
}
```

**Multi-hit bricks.** A hit decrements the brick's `hits`. At zero it's destroyed; otherwise its material is recolored in place. Color is looked up by *remaining* hits, so a damaged tough brick looks the same as a fresh weak one with the same hits left.

```js
const DEFAULT_COLORS_BY_HITS = {
  1: "#2ecc71", // green: one more hit destroys it
  2: "#f1c40f", // yellow
  3: "#e67e22", // orange
  4: "#e74c3c", // red
};

brick.hits -= 1;
if (brick.hits <= 0) {
  brick.alive = false;
  this._disposeBrickMesh(brick);
} else if (brick.mesh) {
  brick.mesh.material.diffuseColor = BABYLON.Color3.FromHexString(this._colorFor(brick.hits));
}
```

**Advancing levels and winning.** After every brick hit, `main.js` checks for a cleared board. Past the last level it sets a `won` flag instead, which freezes the game exactly like `gameOver` does. `load()` replaces the old `reset()`: it disposes the current bricks and builds the next pattern.

```js
const advanceLevel = () => {
  levelIndex += 1;
  if (levelIndex >= LEVELS.length) {
    won = true;
    hud.showWin();
    return;
  }
  brickGrid.load(parseLevel(LEVELS[levelIndex]));
  hud.setLevel(levelIndex + 1);
  paddle.reset();
  const relaunch = randomLaunchVelocity();
  ball.reset(0, 0, relaunch.vx, relaunch.vy);
};

const brickHit = brickGrid.checkCollision(ball);
if (brickHit) {
  handleBounce(brickHit.event);
  hud.recordScore(brickHit.points);
  if (brickGrid.isCleared()) {
    advanceLevel();
    if (won) return; // frozen now
  }
}
```

**Two overlays from one helper.** "Game Over" and "You Win!" share the same construction, including the `isHitTestVisible = false` trick from Breakout Lives that keeps a full-screen label from blocking the Reset button.

```js
this.gameOverLabel = this._createOverlayLabel("Game Over", "white");
this.winLabel = this._createOverlayLabel("You Win!", "#ffd54f");

_createOverlayLabel(text, color) {
  const label = new BABYLON.GUI.TextBlock();
  label.text = text;
  label.color = color;
  label.fontSize = 48;
  label.outlineWidth = 6;
  label.outlineColor = "#202020";
  label.isVisible = false;
  label.isHitTestVisible = false;
  this.ui.addControl(label);
  return label;
}
```

## Babylon.js features demonstrated

- Everything from Breakout Lives (orthographic camera, lit meshes, particle bursts, synthesized bounce sound, mouse + keyboard paddle control, scoring, lives, open-bottom miss detection)
- Data-driven level layouts: a 2D durability grid parsed from plain strings, decoupled entirely from the rectangular rows x cols generation earlier samples used
- Stateful destructible meshes: a brick's `BABYLON.StandardMaterial.diffuseColor` is mutated in place across multiple hits instead of the mesh being disposed on first contact
- Two independently triggerable, identically structured `BABYLON.GUI` overlays sharing one creation helper

## Controls

- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **Reset button** (top of screen) — always available, even after Game Over or a win: restarts at level 1, restores lives, zeroes the score, and relaunches the ball
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/bricks.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
