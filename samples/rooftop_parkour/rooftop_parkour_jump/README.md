# Rooftop Parkour Jump

Step 3 of the Rooftop Parkour series. Builds on [Rooftop Parkour Run](../rooftop_parkour_run/README.md). The runner has a body that falls, lands and stands on roofs, and now it **jumps**: **Space**, higher for as long as the key is held. The interesting part of a jump is how it feels, so it is kind in three ways: **a tap is a hop**, a jump still works for a moment after running off an edge (**coyote time**), and a jump pressed a moment too early is remembered and happens on landing (**a jump buffer**). A runner who lands a long fall while going somewhere **rolls** out of it. The developer panel has sliders for all of it, and read-outs of how high and how far a jump goes.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Run sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**A jump is a speed, and gravity.** When the key goes down, the body is given a speed upwards, and gravity (which the body already had) takes it away. A jump goes `jumpSpeed² / (2 × gravity)` high, and `2 × jumpSpeed / gravity` seconds long, so, going `speed` along the ground, `speed ×` that far. Those are `jumpHeight` and `jumpDistance`, and the tests check them against jumps that are really made.

**A tap is a hop.** If the key is let go on the way up, the speed up is cut to `jumpCutSpeed`. Holding it is the whole jump.

**Coyote time.** A runner who runs off an edge is falling on the next frame, and a jump that is only allowed on the ground is lost. So a jump is allowed for `coyoteTime` after the feet leave the ground, unless the body is already on a jump (there is no jump in the air).

**A jump buffer.** The controller is told whether the key is *down*, and works out the moment it *went* down. That moment is remembered for `jumpBuffer`, and used as soon as the body can jump, so a press in the last tenth of a second of a fall is not lost.

**A roll.** A fall faster than `rollImpact`, landed by a runner going at least `rollMinSpeed`, is a roll: a committed move that goes on at `rollSpeed` for `rollTime`, and can't be steered or jumped out of. The same fall landed standing still is a hard landing, and a lesser landing is run through by a runner who is going somewhere (only one who is standing crouches).

**Gaps.** `jumpDistance` is what a level is checked against: the tests build two roofs with a gap, play a runner over it, and say that a gap a little under the distance can be crossed and one a metre over it can't.

## Key code

**The jump.**

```js
_jump() {
  const o = this.options;
  const footing = this.grounded || (!this.jumping && this.airTime <= o.coyoteTime);
  if (this.jumpWanted > 0 && this.rolling === 0 && footing) {
    this.grounded = false;
    this.jumping = true;
    this.vy = o.jumpSpeed;
    this.jumpWanted = 0;
    this.airTime = o.coyoteTime + 1; // a runner in the air has no footing, and a jump that has begun can't be begun again
  }
  if (this.jumping && !this.jumpHeld && this.vy > o.jumpCutSpeed) this.vy = o.jumpCutSpeed;
}
```

**How high and how far.**

```js
function jumpHeight(options = BODY) {
  return (options.jumpSpeed * options.jumpSpeed) / (2 * options.gravity);
}
function jumpDistance(speed, options = BODY) {
  return speed * ((2 * options.jumpSpeed) / options.gravity);
}
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Run
- Animation groups played once, at a rate chosen so that a clip is as long as the thing it shows (the jump and the roll)
- (The jump itself needs none: it is plain arithmetic, tested without Babylon.js.)

## Controls

- Everything from the Run sample, and **Space** to jump
- With **`?dev`**: sliders for **jump speed**, **jump cut speed**, **coyote time** and **jump buffer**, and read-outs of the **jump height** and the **reach** of a jog jump and a sprint jump

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests make jumps in small worlds and compare them with the formulas, press the key at the moments that coyote time and the buffer are about, and build two roofs with a gap between them to see which gaps can be jumped.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The runner can cross an alley, but can only go up what it can jump. The next sample adds the **ledges**: jump at a wall, grab its ledge, hang there, shimmy along it and pull up.
