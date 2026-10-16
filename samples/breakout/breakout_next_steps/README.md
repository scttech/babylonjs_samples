# Breakout Next Steps

![Breakout Next Steps](../../img/breakout_next_steps/breakout_next_steps.png)

Builds on [Breakout Polish](../breakout_polish/README.md), reusing its ball/paddle/brick/level physics, start screen, pause, power-ups, particle sparks, procedural bounce sound, and score/lives/win tracking wholesale. This sample is the start of a further round of visual/gameplay enhancements on top of that base.

**Bricks were already boxes -- they just never looked like it.** Every earlier sample in the series built each brick as a `BABYLON.MeshBuilder.CreateBox`, but with a depth equal to its height and a camera that looks straight down the Z axis, that depth never actually rendered: an orthographic camera aimed dead-on sees only a box's front face, so a "3D" brick and a flat painted rectangle were visually identical. `js/bricks.js` now gives `BrickGrid` a `depth` option (`main.js` passes `BRICK_DEPTH`, 3x a brick's half-height -- noticeably chunkier than before) purely as groundwork, and adds the piece that actually reads as dimension: `BrickGrid._attachBevelBands()` parents two thin, semi-transparent plates to each brick's mesh -- a bright one high on the face, a dark one low -- sitting just in front of its one visible side. Each band covers less than the brick's full width/height, so an unshaded margin of the base color shows through all the way around like a frame. The result reads as a raised, beveled block reacting to the scene's light, without needing any geometry the straight-on camera would never actually render.

Nothing about brick *layout* or *collision* changed -- `halfWidth`/`halfHeight` (used by `Ball.bounceOffBrick()` and the grid's own layout math) are untouched, and the durability/scoring/power-up-drop behavior inherited from Breakout Polish is unchanged. This is purely a rendering enhancement to `BrickGrid`'s mesh-attach path.

**A fixed box replaces the browser window as the play field.** Every earlier sample -- Breakout Polish included -- sized the ball/paddle bounds directly off the camera's viewport, which is derived from the browser window's aspect ratio (`updateViewport()`'s `halfWidth = halfHeight * aspect`). On a wide monitor that meant a lot of empty canvas on either side of the fixed-width brick grid, with the ball and paddle free to roam all the way out into it. `main.js` now defines `PLAY_HALF_WIDTH`, a horizontal half-extent computed straight from the brick grid's own layout math (`BRICK_COLUMNS`/`BRICK_HALF_WIDTH`/`BRICK_GAP`) plus a fixed margin, and three static wall meshes (left, right, top -- no bottom, matching the ball's existing `openBottom` bounce bound) are built right at its edges so the boundary is actually visible. `Ball.update()`, `Paddle.moveTo()`, and the pointer/keyboard paddle-control code all read this fixed box instead of the camera's width now. `updateViewport()` also switched from always pinning the camera's height to the box's own aspect ratio, `PLAY_HALF_WIDTH / WORLD_HALF_HEIGHT`) instead: on a wide-enough window the extra width still just shows as background outside the walls (the common case, and the whole point), but on a window narrower than the box, the camera instead pins to the box's *width* and shows extra background above/below -- so the walls are never clipped off-screen, whichever way the window is stretched.

## Babylon.js features demonstrated

- Everything from Breakout Polish (orthographic camera, lit meshes, particle bursts, synthesized bounce sound, mouse + keyboard paddle control, scoring, lives, levels, win state, start/pause, power-ups)
- Faking visible 3D depth under a straight-on orthographic camera by parenting thin, semi-transparent, offset plates to a mesh instead of relying on geometry the camera would never actually render
- `StandardMaterial.specularColor`/`specularPower` for a subtle sheen, and `mesh.dispose()`'s default recursive behavior for cleaning up a parent and its children in one call
- Decoupling an orthographic camera's viewport (how much background is visible) from the fixed-size world bounds gameplay actually happens in, with a "contain" fit that pins whichever axis the window is short on so the play field is never clipped

## Controls

Unchanged from Breakout Polish:

- **Click or tap the canvas** — starts the round
- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **P** — pause / resume
- **Reset button** (top of screen) — always available: restarts at level 1 with full lives, zero score, and the ball in play immediately (no need to click Start again)
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/bricks.js`, `js/powerups.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
