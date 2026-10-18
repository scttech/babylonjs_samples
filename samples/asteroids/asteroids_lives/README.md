# Asteroids Lives

Step 4 of the Asteroids series. Builds on [Asteroids Rocks](../asteroids_rocks/README.md), reusing its ship, bullets, rocks, score, and sounds wholesale. What's new is that the rocks are now **dangerous**: touching one costs a life, the ship respawns protected for a few seconds, and losing the last life ends the game.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Rocks sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**Ship against rocks.** The same circle-vs-circle check that lets bullets hit rocks now lets the ship hit them. Rather than write the rock search a second time, `RockField.findCollision(x, y, radius)` pulls it out as a method that takes any circle, and both `collideBullets` and the ship use it. Ramming a rock destroys it and scores it, as in the arcade original, so crashing into a large rock leaves two medium ones.

**Game rules in one small class.** `Game` holds the number of lives and whether the game is over, and knows nothing about ships, rocks, or the screen. `over` is a getter (a fact derived from `lives`, so it can never disagree with it) while `loseLife()` is a method (it changes state, and returns the remaining count). `main.js` decides what happens when a life is lost; `Game` only keeps the count.

**Protection after a respawn.** `Ship.respawn()` puts the ship back in the middle at rest and starts `invulnerableTime` counting down. While it runs the ship ignores rocks, and it blinks so the player can see it. The blink is a formula rather than a timer: `Math.floor(invulnerableTime * 10) % 2 === 0` is true for a tenth of a second and false for the next, as the countdown falls, so it can never drift out of step with the protection and a test can pick any instant and know the answer.

**Hiding the ship.** On game over the ship disappears entirely (`setVisible(false)`), and steering and firing stop, while the rocks and any bullets in flight carry on. A mesh's `isVisible` only affects that one mesh, not its children, so the hull and the exhaust flame are handled separately, and the flame never shows while the hull is hidden.

**A lives counter and a Game Over message.** The `Hud` gains a `Lives:` label below the score and a centered two-line "GAME OVER / Press R to restart" message that starts hidden. Both set `isHitTestVisible = false`, so a text block that fills the screen can't swallow pointer events.

**A test that failed for the right reason.** Adding labels meant the HUD now creates three GUI controls, not one, so an existing test that expected one had to change. Updating it is the point: the failure said exactly what behavior had changed.

## Key code

**One collision search for everything that's a circle.**

```js
findCollision(x, y, radius) {
  return this.rocks.find((r) => circlesOverlap(x, y, radius, r.x, r.y, r.radius)) || null;
}

// in collideBullets()
const rock = this.findCollision(bullet.x, bullet.y, bulletSystem.radius);
```

**The rules.**

```js
class Game {
  constructor({ startingLives = 3 } = {}) {
    this.startingLives = startingLives;
    this.lives = startingLives;
  }

  get over() {
    return this.lives <= 0;
  }

  loseLife() {
    if (this.over) return this.lives;
    this.lives -= 1;
    return this.lives;
  }

  reset() {
    this.lives = this.startingLives;
  }
}
```

**Protection and the blink.**

```js
get invulnerable() {
  return this.invulnerableTime > 0;
}

get drawn() {
  if (!this.visible) return false;
  if (!this.invulnerable) return true;
  return Math.floor(this.invulnerableTime * 10) % 2 === 0;
}

respawn(invulnerableSeconds = 3) {
  this.reset();
  this.makeInvulnerable(invulnerableSeconds);
}

// in update()
this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
```

**Drawing the hull and its flame separately.**

```js
_syncMesh() {
  if (!this.mesh) return;
  this.mesh.position.x = this.x;
  this.mesh.position.y = this.y;
  this.mesh.rotation.z = this.angle;
  const drawn = this.drawn;
  this.mesh.isVisible = drawn;
  this.flame.isVisible = drawn && this.thrusting;
}
```

**A centered, two-line message.** With no `verticalAlignment` it keeps the GUI's default centering, and the `\n` starts the second line. `outlineWidth` keeps it readable over a passing rock.

```js
this.gameOverLabel = new BABYLON.GUI.TextBlock();
this.gameOverLabel.text = "GAME OVER\nPress R to restart";
this.gameOverLabel.color = "white";
this.gameOverLabel.fontSize = 48;
this.gameOverLabel.outlineWidth = 6;
this.gameOverLabel.outlineColor = "#050508";
this.gameOverLabel.isVisible = false;
this.gameOverLabel.isHitTestVisible = false;
this.ui.addControl(this.gameOverLabel);
```

**What happens when the ship crashes.** The rock's size is saved before `destroy()` removes it. Two explosions play: the rock's, and a deep "large" one for the ship.

```js
const crash = (rock) => {
  const { size } = rock;
  hud.addScore(rocks.destroy(rock).points);
  playBangSound(size);

  hud.setLives(game.loseLife());
  playBangSound("large");
  if (game.over) {
    ship.setVisible(false);
    hud.showGameOver();
  } else {
    ship.respawn(RESPAWN_PROTECTION);
  }
};
```

**Checking for crashes each frame.** A protected ship passes through rocks, and nothing is checked once the game is over.

```js
if (!game.over && !ship.invulnerable) {
  const rock = rocks.findCollision(ship.x, ship.y, ship.radius);
  if (rock) crash(rock);
}
```

## Babylon.js features demonstrated

- Everything from Asteroids Rocks (orthographic camera, line-art meshes, runtime mesh creation, GUI over a 3D scene, synthesized sound)
- Toggling a mesh's `isVisible` for a time-driven blink, and handling a child mesh separately because visibility isn't inherited
- Multi-line, centered `BABYLON.GUI.TextBlock` text with an outline, shown and hidden by game state
- Circle-vs-circle collision reused for a second pair of objects (ship and rocks) with no physics engine

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **R** — restart: ship to the center, bullets cleared, fresh rocks, score zero, three lives, Game Over message hidden
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/wrap.js`, `js/collision.js`, `js/ship.js`, `js/bullets.js`, `js/rocks.js`, `js/hud.js`, and `js/game.js`. The new tests cover the `Game` rules, the ship's protection timer and blink (including a stubbed `BABYLON` check that the hull and flame hide together), `findCollision`, and the HUD's lives counter and Game Over message.

## Notes

Browsers block audio until a user gesture. Pressing a key counts, and Babylon shows its own small unmute prompt if it's still needed.

## Next up

[Asteroids](../README.md) continues with waves, replacing "four new rocks when the screen is cleared" with real, escalating waves.
