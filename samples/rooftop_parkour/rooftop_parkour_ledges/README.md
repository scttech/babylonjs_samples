# Rooftop Parkour Ledges

Step 4 of the Rooftop Parkour series. Builds on [Rooftop Parkour Jump](../rooftop_parkour_jump/README.md). The runner can run, jump, fall and roll, and now it can **jump at a wall, catch the ledge at the top of it with both hands, hang there, shimmy along it, and climb up onto it**. The ledges are data: the top edges of the roofs, found from the same boxes as everything else, and whether a runner catches one is plain arithmetic, tested without a screen. A runner that stands at the edge of a roof can also **lower itself over it** to hang from the ledge there. The developer panel has buttons to **Go to a ledge** (and jump at it), to **Drop to the ledge below**, and to **Hang from a ledge** (any of them, in turn, without a jump), a switch that draws the **ledges**, sliders for the reach of the hands, the shimmy speed and the climb time, and a read-out of whether the runner is hanging.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Jump sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**A ledge is the top edge of a side of a box.** Every roof is a box with four sides, so four ledges: each a line from one corner to the next, with a height and a unit vector pointing *out* from the wall. That is all the data there is (`ledgesOf`), so any box added to the world has ledges.

**Whether a hand catches a ledge** is a list of questions, each one line (`findLedge`): is it in reach of the hands (above the waist, below the top of the reach)? Is the body near the wall and facing it, to within an angle (the dot product of two unit vectors is the cosine of the angle, so no angle is worked out)? Is the body beside some of the ledge? Is there room to hang there, and room to stand on top? A body catches a ledge near the top of a jump (`grabMaxRise`), and not at the start of it.

**The keys are read against the wall.** A hanging body is held where it is told and takes no gravity, so the same keys that run the runner on the ground work the ledge: toward the wall is up (or the jump key), away from it is letting go, along it is a shimmy. A climb is a timer: the body goes up first, then over the edge, and ends standing on the highest thing there.

**A wall can lean.** The upper walls of the two buildings in two levels are wider at the bottom, so a body that hangs against the edge at the top has to hang out from the box by the `lean` of the wall (data of the building, measured with rays at the model), or its feet are in the wall.

**Room is asked of the World**, with `push` and `supportAt`, which the world has had since Step 2 of the series: nothing new was added to it.

## Key code

**Whether a ledge is caught.**

```js
for (const ledge of ledges) {
  const above = ledge.y - body.y;
  if (above < o.handLow || above > o.handReach) continue;
  const dx = body.x - ledge.ax;
  const dz = body.z - ledge.az;
  const out = dx * ledge.nx + dz * ledge.nz;
  if (out < o.radius - 0.1 || out > o.radius + o.grabDistance) continue;
  const along = dx * ledge.tx + dz * ledge.tz;
  if (along < 0 || along > ledge.length) continue;
  if (-(forwardX * ledge.nx + forwardZ * ledge.nz) < Math.cos(o.grabAngle)) continue;
  const u = clampAlong(ledge, along, o);
  if (!canHang(world, ledge, u, o) || !canClimb(world, ledge, u, o)) continue;
  if (!best || out < best.out) best = { ledge, u, out };
}
```

**The keys, read against the ledge.**

```js
const into = direction ? -(direction.x * ledge.nx + direction.z * ledge.nz) : 0;
const along = direction ? direction.x * ledge.tx + direction.z * ledge.tz : 0;
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Jump
- A line system (`CreateLineSystem`) drawn over the scene, for seeing the ledges
- (The grab itself needs none: it is plain arithmetic, tested without Babylon.js.)

## Controls

- Everything from the Jump sample
- Near a ledge: **Space** jumps and catches it; hanging, **A / D** (against the camera) shimmy, **W** or **Space** climbs, **S** lets go
- With **`?dev`**: **Go to a ledge** takes the runner to the lower roof of a building in two levels, in front of the wall of the upper one; **Drop to the ledge below** lowers a runner that stands near the edge of a roof over it; **Hang from a ledge** hangs the runner from each ledge in turn; **ledges** draws them; sliders for **hand reach**, **shimmy speed** and **climb time**; a read-out of whether the runner is **hanging**

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests build a wall with a ledge and jump a runner at it, check each limit of a grab on both sides, shimmy it to the ends of the ledge and into something in the way, and climb it; and, in the real district, check that from the lower roof of each building in two levels a jump catches the ledge and a climb stands the runner on the roof.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The runner can climb what has a ledge, but a district of roofs 17 metres up has none that can be reached from the street. The next sample adds the **moves between**: vaulting a low wall, mantling a ledge without hanging, a wall jump, and a little help for a grab that is nearly right.
