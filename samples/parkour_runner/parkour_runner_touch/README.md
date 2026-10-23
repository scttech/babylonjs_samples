# Parkour Runner Touch

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 9 of the Parkour Runner series, and the last. Builds on [Parkour Runner Effects](../parkour_runner_effects/README.md), reusing everything it has: the street, the runner, the screens, the leaderboard, the sounds and the effects. What's new is that it can be played with a thumb. **Swipe** left or right to change lane, up to jump (or vault), down to slide, and **tap** to jump. There is an on-screen **pause button**, hints about swipes in place of hints about keys, a camera that keeps all three lanes in view on a phone held upright, and a layout that fits a small screen.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Effects sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.) To try it on a phone, open the *Network* address that `npx serve` prints, on a phone on the same network. In Chrome you can also press F12 then Ctrl+Shift+M ("device mode") to pretend to be a phone: the mouse then acts as a finger.

**A swipe is decided, not received.** A finger gives three events: down, moved, up. `SwipeDetector` turns them into a swipe or a tap, and it only deals in numbers, never in a screen. It says "swipe" the moment the finger has gone far enough (6% of the screen's smaller side, at least 24 pixels), while the thumb is still moving, so the runner doesn't lag behind it. A touch makes one swipe, or one long flick would change three lanes. A tap is quick and hardly moves.

**The mouse, a second finger and a cancelled touch are ignored.** `TouchControls` uses pointer events (one set of names for fingers, pens and mice) and returns at once for a mouse. A second finger isn't followed. When the browser takes a touch away (`pointercancel`), nothing happens. `setPointerCapture` keeps a swipe that slides off the canvas from being lost.

**Keys and swipes share one table of moves.** The actions that were inside the `keydown` handler (including the vault logic) are now `moves.left`, `moves.right`, `moves.jump` and `moves.slide`. A swipe up next to a barrier vaults, exactly as the jump key does, because it is the same code.

**The camera adapts to the shape of the screen.** A camera is set by its vertical angle, which on a landscape screen shows plenty of width. Upright, a phone is taller than wide, and the side lanes would fall off the edges. `fovFor(aspect, vertical)` works out the angle across the screen, `2 * atan(tan(vertical / 2) * aspect)`, and if that comes out under about 72 degrees it says to set the camera by the horizontal angle instead (`FOVMODE_HORIZONTAL_FIXED`). It is called again whenever the window changes size, including when the phone is turned.

**The HUD scales.** A GUI's `idealHeight` is the screen height its sizes were written for, and it draws everything at the screen's height over that. `idealHeightFor` holds it between 480 and 720, so a short phone screen draws the text at no less than two thirds, and a big monitor at no more than a little over normal.

**The page stops fighting the finger.** A `viewport` meta tag makes a phone use its real width. `overscroll-behavior`, `user-select` and `-webkit-tap-highlight-color` stop pull-to-refresh, text selection and tap flashes. `touch-action: manipulation` on buttons stops double-tap zoom. The text field opts back in to selecting.

**CSS picks between keys and fingers.** The game puts the class `touch` on the page when the main pointer is coarse (a finger). The key hints and the hint bar are then hidden, the swipe hint and the pause button are shown, and a media query makes the screens smaller on a small or short screen.

## Key code

**A swipe, recognised while the finger is still moving.**

```js
move(id, x, y) {
  if (id !== this.id || this.swipes > 0) return null;
  const dx = x - this.startX;
  const dy = y - this.startY;
  if (Math.hypot(dx, dy) < this.distance) return null;
  this.swipes++;
  return directionOf(dx, dy);
}
```

**One table of moves, for the keys and the swipes.**

```js
const moves = {
  left: () => runner.moveLane(-1),
  right: () => runner.moveLane(1),
  jump: () => { /* a vault next to a barrier, otherwise a jump */ },
  slide: () => runner.slide(),
};

new TouchControls(canvas, {
  onSwipe: (direction) => {
    if (game.playing) moves[swipeMove(direction)]();
  },
  onTap: () => {
    if (game.playing) moves.jump();
  },
});
```

**Which angle to set the camera by.**

```js
function fovFor(aspect, vertical) {
  const across = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return across >= MIN_HORIZONTAL_FOV ? { horizontal: false, fov: vertical } : { horizontal: true, fov: MIN_HORIZONTAL_FOV };
}
```

**Following the shape of the screen.**

```js
const applyFov = () => {
  const { horizontal, fov } = fovFor(engine.getAspectRatio(camera), CAMERA_FOV);
  camera.fovMode = horizontal ? BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED : BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
  camera.fov = fov;
};
applyFov();
engine.onResizeObservable.add(applyFov);
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Effects
- Pointer events on the canvas (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) and `setPointerCapture`
- `camera.fovMode`: `FOVMODE_VERTICAL_FIXED` and `FOVMODE_HORIZONTAL_FIXED`
- `AdvancedDynamicTexture.idealHeight`: scaling a GUI to the screen
- `engine.onResizeObservable` and `engine.getAspectRatio(camera)`

## Controls

On a touch screen:

- **Swipe left or right** — change lane
- **Swipe up** — jump, or vault if a barrier is just ahead
- **Swipe down** — slide; in the air, dive and roll
- **Tap** — jump
- **The pause button** (top right) — pause

With a keyboard, everything works as before:

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

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the swipe distance for a screen, the direction of a swipe, the move each swipe makes, detecting a touch screen, the swipe detector (one finger at a time, one swipe for each touch, taps, a cancelled touch), the controls with a stand-in element (the mouse ignored, a pen counted, capture, disposing), the camera's choice of field of view for every screen shape, the HUD's scaling, and the pause button.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street, the obstacles and the coin) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md). The fonts are [Sedgwick Ave Display](https://fonts.google.com/specimen/Sedgwick+Ave+Display) and [Bangers](https://fonts.google.com/specimen/Bangers), under the SIL Open Font License. The sounds are made by the code.

## The end of the series

That's Parkour Runner: a street built from real models, a runner with moves, obstacles to beat, a score, screens, effects, and now touch. A later game, a "free-world" one where the player climbs buildings and jumps from rooftop to rooftop, would build on all of it.
