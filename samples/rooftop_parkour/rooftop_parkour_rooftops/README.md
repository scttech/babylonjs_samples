# Rooftop Parkour Rooftops

Step 6 of the Rooftop Parkour series. Builds on [Rooftop Parkour Moves](../rooftop_parkour_moves/README.md). The runner has all its moves; now the **district gives it somewhere to use them**. The walls of the buildings are **measured from the models**, so a runner that hangs from the edge of a roof is against the wall. A **fire escape** goes up the front of every building to its roof, with a **planter** at the foot of it to start from. There are **sills** to hang from and shimmy along, **vents and huts** on the roofs to vault and climb, and a table of **designed jumps** between roofs. A **bot that plays the game** (the same controller, the same boxes) proves that every fire escape can be climbed from the street and every designed jump can be made, so a change that breaks a route breaks a test. The training yard of the last step is gone: the runner begins in the street, in front of the first fire escape.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Moves sample. Run `node reset-tutorial.js` to return this folder to the Moves sample, to work through the changes yourself.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**The walls were measured.** Rays were shot at each building from every side, at every height, and the middle of what they hit is the wall (`wall` in `BUILDINGS`): it is half a metre in from the edge of the model, and two and a half metres at the steps of the front of some. A building's boxes (`buildingBoxes`, `ledgeBoxes`) are the ground inside its walls, so the runner hangs flush against the wall instead of half a metre off it. The roofs, measured from above a square metre at a time, are flat.

**A fire escape is data.** Three kit pieces, stacked: a bottom, as many middle pieces as there are floors, and a top. Each platform is three slabs round a gap, and a stair of eight treads goes up through the gap to the platform above (`platformBoxes`). They are boxes of the same kind as a roof, so the controller needed teaching nothing: it hangs from the edge of a platform, climbs onto it, walks up the stair. How many floors there are is arithmetic: as many as fit under the roof (`escapeFloors`), and the top platform has to be no more than a step under the roof (walk on) or no more than a mantle (climb on), which a test checks for every building.

**A bot plays the game.** `playCrossing` puts a runner on one roof and runs it at another, jumping where the ground ends, and says whether it ended up standing on the other roof. `playEscape` takes a runner from the street to the roof of a building: it mantles the planter, jumps for the edge of the first platform, climbs onto it, and at each platform walks round to the stair and up it, and at the top climbs onto the roof. Each is a test.

## Key code

**Where the walls are.**

```js
const wall = placement.wall;
return { minX: minX + wall.minX, maxX: maxX - wall.maxX, minZ: minZ + wall.minZ, maxZ: maxZ - wall.maxZ };
```

**How many platforms a fire escape has.**

```js
return Math.max(1, Math.floor((roof - base) / spec.floor + 1e-9) + 1);
```

**Jump where the ground ends.**

```js
const ahead = world.supportAt(body.x + direction.x * lookAhead, body.z + direction.z * lookAhead, 0, body.y + 0.01);
const edge = body.grounded && ahead < body.y - drop;
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Moves
- Kit models (a fire escape, a planter, a sill) put in the district from data, with the middle of each piece measured
- Boxes (`CreateBox`) drawn from the same data as the collisions, each with its own colour
- (The climbs and jumps themselves need none: they are plain arithmetic, tested without Babylon.js.)

## Controls

- Everything from the Moves sample
- At the foot of a fire escape: run at the **planter** and press **Space** to climb onto it, then **Space** again at the edge of the platform above to catch it, and **W** to climb up
- On a platform: walk to the left end of it and then along it, into the stair, and up
- At a roof that is a little higher than the top platform: **Space** at the wall climbs it
- Jump from a roof to the next across a gap: run, and press **Space** at the edge
- With **`?dev`**: buttons to go to a **fire escape** or a **crossing** (the start of a designed jump), and the walls, the ledges and the boxes of the fire escapes can be switched on. **R** puts the runner back at the start

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the measured walls, the frame that puts a fire escape on a wall facing any way, the platform and stair, the heights of every fire escape against the roofs, the sills and the roof things, and then play the game: a bot jumps each designed crossing, and climbs each fire escape from the street to its roof.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The runner can get anywhere in the district and cross the roofs. The next sample is **goals**: things to collect, time trials with checkpoints, a flow score and shortcuts, to give all that a reason.
