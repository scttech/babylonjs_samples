# Rooftop Parkour Moves

Step 5 of the Rooftop Parkour series. Builds on [Rooftop Parkour Ledges](../rooftop_parkour_ledges/README.md). The runner can run, jump, roll and catch a ledge, and now it has the moves that go **between**: it can **vault** a low wall at a run, **mantle** a ledge from the ground without hanging from it, **kick off a wall** in the air, and gets a **little help** with a grab that is nearly right. Each move is a question asked of the world (is there a low wall ahead? is there a ledge in front of me that my hands can get onto?) and plain arithmetic, tested without a screen. A **training yard** on the road, with a piece for each move, is where to try them, and where the runner now begins. The developer panel has sliders for the heights of a vault and a mantle, for the kick, and for the help a grab gets, and a read-out of the move.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Ledges sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**A vault is a line through a box.** A runner that is going fast enough, at a wall that is low enough and thin enough, near enough, with room to land beyond it, is taken over it in an arc and goes on running (`findVault`). The wall is found by following the way the body faces until it goes in at a box and comes out (`crossing`, a slab test): the two distances are how near the wall is, and how thick.

**A mantle is a grab with different numbers.** A ledge too high to step onto and not so high that the hands can't reach it from the ground is the same question as catching a ledge in the air, with a lower reach and no hang (`findMantle`). A ledge too low to hang from, with the feet in the ground, is no longer hung from at all.

**A kick is a jump in the air.** A body in the air beside a wall that it faces, when the jump key goes down again, is sent up and away from the wall (`findWall`), and the keys can't steer it for a moment, so that it does not turn back at once. There is no limit to how many, but never twice in a row off the same wall: between two walls, a runner can kick up and up, all the way to the top.

**Help is the same question with more allowed.** A body that is steering toward a ledge that is a little too high, too far or too turned away asks again with a little more reach, distance and angle (`assisted`).

**The yard is data.** A table of pieces (a wall to vault, a crate to mantle, two tall walls to kick between all the way up, a wall that is only just too high), each made for a move and the size for it, standing on whatever the ground is where it is, and tested: every piece can be passed by the move it is for.

## Key code

**Whether a wall can be vaulted.**

```js
const hit = crossing(box, body.x, body.z, dx, dz);
if (!hit || hit.enter > o.radius + o.vaultReach || hit.exit - hit.enter > o.vaultDepth) continue;
const far = hit.exit + o.radius + o.vaultLanding;
```

**A mantle is a catch, asked another way.**

```js
return findLedge(ledges, body, world, { ...options, handLow: options.stepHeight, handReach: options.mantleHeight }, true);
```

**The height of a vault, eased up and down.**

```js
this.y = from.y + (peak - from.y) * smooth(p / 0.25) - (peak - to.y) * smooth((p - 0.75) / 0.25);
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Ledges
- Boxes (`CreateBox`) drawn from the same data as the collisions, each with its own colour
- (The moves themselves need none: they are plain arithmetic, tested without Babylon.js.)

## Controls

- Everything from the Ledges sample
- At a low wall, running: **W** (or **Shift + W**) vaults it
- At a crate that is too high to step onto: **Space** mantles it
- In the air, next to a wall, facing it: **Space** again kicks off it, never twice in a row off the same wall: kick between two walls to the top
- With **`?dev`**: sliders for **vault height**, **mantle height**, **wall kick speed**, **wall jump speed** and **grab help**; a read-out of the **move**; **building boxes** draws the yard too. **R** puts the runner back at the south end of the yard

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check each limit of a vault and a mantle on both sides, find walls to kick off, play a body that kicks between two walls and goes higher each time, jump at a wall with and without help, and, in the real district, check that each piece of the yard can be passed by the move it is for.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The runner can go over, up and off what is in its way, but the only things in the street to try it on are in the yard. The next sample, [Rooftop Parkour Rooftops](../rooftop_parkour_rooftops/README.md), takes the yard away and makes the whole district a place to run: the walls measured, fire escapes up the front of every building, and the gaps between roofs checked by a bot.
