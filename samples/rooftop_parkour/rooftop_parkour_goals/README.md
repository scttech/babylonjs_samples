# Rooftop Parkour Goals

Step 7 of the Rooftop Parkour series. Builds on [Rooftop Parkour Rooftops](../rooftop_parkour_rooftops/README.md). The district is a place to run; now it gives the runner **reasons**. There are **tokens** to collect (in the street, on the top platform of every fire escape, on every roof, and on top of the huts that take a climb). There is a **flow score**: every move is worth points, and moves that follow each other quickly make a chain, and the longer the chain, the more each move is worth. And there is a **time trial**, a run of checkpoints round the block, with a clock, splits, a par and a medal. The jump across the alley is the **shortcut**: the bot that plays the game says what it saves over the long way round. All of it is plain numbers and arithmetic, tested without a screen, and the bot **proves that every token can be got to**, so no token is ever out of reach.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Rooftops sample. Run `node reset-tutorial.js` to return this folder to the Rooftops sample, to work through the changes yourself.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**Flow is a score with a memory.** Each kind of move has points (a vault 3, a kick 4, a token 5, and so on). A move adds its points times the **multiplier**, and joins the **chain**, and starts the **window** again (2.2 seconds). Every second move in the chain adds one to the multiplier, up to 6. When the window runs out the chain ends: the multiplier is 1 again, and the points stay. A runner that is running uses up the window slowly, so running between moves keeps the chain. Every fifth move in a chain is a **combo**, and the **Sick Combo** banner of the Parkour Runner series (its picture is in this series' assets) pops up with "5 in a row", "10 in a row". `moveEvents` compares what the controller was doing a frame ago with what it is doing now, and says which moves *began*.

**Tokens are data.** `tokenSpots` makes them from the plan, so they follow it: three in the street on the way to the first fire escape, one on the top platform of every fire escape, one on every roof (in the clearest place), and one on top of every hut. A body takes one when it is within a metre.

**The trial is a state machine.** `Trial` is ready until the runner moves off, then runs the clock, then asks for the checkpoints in order (the start, the roof of the medium building, the roof of the small one next to it, and the start again as the finish), and says what happened each frame. A time earns a medal against the **par**.

**The bot proves the goals.** `reachable` asks the bot to climb every fire escape, climb from the lower roof to the upper one of a building in two levels, and jump every designed crossing, and says which buildings it can get a runner onto; a test says every token is on one (and that every hut can be climbed). `shortcuts` says what each jump saves over dropping to the street, running to the foot of the next fire escape and climbing it (more than 13 seconds each). `trialEstimate` is how long the bot takes round the trial, and the par is made from it.

## Key code

**What a move is worth.**

```js
const points = (this.table.points[kind] || 0) * count * this.multiplier;
```

**Which moves happened between two frames.**

```js
if (before.move === null && now.move !== null) found.push(now.move);
if (now.wallJumps > before.wallJumps) found.push("kick");
if (!before.hanging && now.hanging) found.push("grab");
```

**The trial, one frame.**

```js
if (inGate(this.checkpoints[this.next], body, this.table)) {
  this.splits.push(this.time);
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Rooftops
- The Sick Combo banner: an image, put up by a CSS animation that is played again each time
- Glowing materials (`emissiveColor`, `alpha`) for the tokens and the beacon over the next checkpoint
- A display on the page (HTML and CSS over the canvas) that is made and updated by code
- (The rules themselves need no Babylon.js: they are plain arithmetic, tested without it.)

## Controls

- Everything from the Rooftops sample
- **T** runs the trial: it puts the runner back at the start, with the clock at zero. The clock starts when the runner moves off, and the **orange beacon** shows the checkpoint to run to next
- Run through the tokens (the gold balls) to take them; chain moves to make the multiplier go up
- With **`?dev`**: sliders for the flow window, steps and highest multiplier; read-outs of the score, the chain, the tokens and the trial; buttons to take every token, go to the next checkpoint and restart the trial

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the numbers of flow and the milestones of a combo and every kind of move it counts, the arithmetic of the chain, the tokens in the district (where each is and that it is something to stand on), taking them, the whole life of a trial, the words of the display, and, with the bot, that every building can be reached, every token is on one, every shortcut saves time and the par is fair.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

There is a game to play now. The next sample is the **screens**: a title with a choice of runner, a pause, best times kept in the browser, and sounds and effects.
