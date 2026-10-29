# Rooftop Parkour Run

Step 2 of the Rooftop Parkour series. Builds on [Rooftop Parkour World](../rooftop_parkour_world/README.md). The runner of the last step walked on a flat plane and was pushed out of the buildings. Now the runner has a **body**: it has weight, so when there is nothing under its feet it **falls** and **lands**; it can **stand on the roof of a building**; it steps up a curb and down again without a jump; and it is stopped by a wall that is too high to step on. The developer panel has a **Go to a roof** button (there is no way to climb up yet), and sliders for gravity and step height.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the World sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**Moved by code, not by physics.** A person is not a rolling ball. A physics body that stands for a person slides down slopes, sticks to walls, and gets in the way when the character has to do something exact, such as grab a ledge. So `Controller` moves the character itself (a *kinematic* controller): each frame it works out where the character wants to go, asks the world whether it can, and puts it where it should be. A jump is always exactly as high as it is told, and every part can be tested without a screen.

**Two questions of the world.** `World.supportAt` says what is under a place to stand on (the highest of the ground and the boxes whose top is not above the feet), and `World.wallsAt` says what is in the way (a box that is higher than a step and starts below the head). A box that is only a step high is something to climb onto, and one that is all above the head is something to walk under.

**Falling, and landing on what was passed through.** Gravity changes the vertical speed a little each frame, to a terminal speed, and the speed moves the feet. Then the body asks whether it has gone *through* something that was under where it was, and if so, it lands on it. That is why a very fast fall can't go through a thin floor.

**A step is walked, a drop is fallen.** The feet follow what is under them. Up to a step height, it is a step; down to `snapDown`, a step down; further than that, nothing is under the feet, and the body falls.

**Hard landings.** `impact` says how fast the fall was when it landed, and a hard one holds the runner for a moment (`landing`), which is the time for the landing clip, played once. A small drop isn't felt.

**The real roofs.** A building's height is the top of the low wall round its roof (the parapet), and the roof is 20 centimetres lower. The plan has both, and the walkable box is as high as the roof.

## Key code

**What is under a place.**

```js
supportAt(x, z, reach, topY) {
  let best = this.ground(x, z);
  for (const box of this.boxes) {
    if (box.maxY > topY || box.maxY <= best) continue;
    if (x < box.minX - reach || x > box.maxX + reach || z < box.minZ - reach || z > box.maxZ + reach) continue;
    best = box.maxY;
  }
  return best;
}
```

**Falling.**

```js
_fall(dt) {
  const o = this.options;
  const before = this.y;
  this.vy = Math.max(-o.terminalSpeed, this.vy - o.gravity * dt);
  this.y += this.vy * dt;
  if (this.vy > 0) return; // going up: nothing can be landed on
  const support = this.world.supportAt(this.x, this.z, o.supportReach, before + o.stepHeight);
  if (this.y <= support) {
    this.impact = -this.vy;
    this.y = support;
    this.vy = 0;
    this.grounded = true;
    if (this.impact >= o.hardLanding) this.landing = o.landTime;
  }
}
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour World
- Animation groups played once, and not looping (`start(false, rate)`)
- (The controller itself needs none: it is plain arithmetic, tested without Babylon.js.)

## Controls

- Everything from the World sample
- With **`?dev`**: **Go to a roof** takes the runner to the roof of the next building; **gravity** and **step height** sliders; read-outs of the height and of whether the runner is on the ground

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests build small worlds (a wall, a step, a roof, a thin plate) and walk the body about in them, and use the real district to check that every roof can be stood on and walked off.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The runner can fall, but can't jump up. The next sample adds the **jump**: one that feels fair (a moment of grace after running off an edge, and a press just before landing that isn't lost), and a roll to take the sting out of a long fall.
