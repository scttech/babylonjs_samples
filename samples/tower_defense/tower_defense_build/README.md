# Tower Defense Build

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 4 of the Tower Defense series. Builds on [Tower Defense Benders](../tower_defense_benders/README.md). The four towers were put on the board for you; now **you build them**. A tray along the bottom holds a podium for each nation, with its price. **Drag** one on to the board: a ring shows how far it will shoot, an outline round the cell under it turns **red** where a tower can't go (and a line says why) and **green** where one can, and when you let go the tower is built and its price paid in gold. Or **tap** a podium, and then tap the board. Escape puts it down. Gold trickles in for now (the next sample pays for defeats instead). On a phone, a podium is held a little above your finger so that it isn't hidden by it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Benders sample. Run `node reset-tutorial.js` to return this folder to the Benders sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**Pointing is two equations with two unknowns.** The camera has no perspective, so the screen is a picture of a box of the world. A place on the screen is a share of the way across it and up it; a point in the world is at that place if its dot product with the screen's *right* and *up* are those numbers; and with the height of the ground known, that is two equations for x and z. A test puts a cell on the screen and checks that it comes back, and another checks the answer against the ray that a real camera casts through the same pixel.

**A finger is held above where it is.** A finger hides what it drags, so a touch is taken to be 72 pixels higher up the screen than it is, and the podium is held there. A mouse has no lift.

**A drag and a tap are two ways to do one thing.** A press on a button might be either, and what happens next says which: a long move is a drag, and the podium goes where it is let go; no move is a tap, and the podium is armed for the next tap on the board. A refusal doesn't put an armed podium down. It is a small state machine (`Builder`), tested along every arrow.

**One rule, with a reason.** `checkBuild` is the placement rules (on the board, not road, no tower there) and then the gold, and gives back `{ ok, reason }`. What *builds*, what *colors the outline* and what *says why* all use it, so they can't disagree.

**A color that fades the same on every computer.** The outline goes from red to green and back by moving a share of the way to the target each frame, where the share is `1 - exp(-rate * dt)` of the time the frame took. A fixed share per frame would fade faster on a fast computer. The shape is drawn in code and used as the see-through picture of a material, and the color is the material's emissive color, so a fade is three numbers and nothing is drawn again.

**A hand that can be tested.** The `Hand` puts the tray, the builder, the pointing, the rule, the outline and the towers together, and it is given everything it uses and plain events. So the tests press a button, drag over road, drag over grass, let go, tap, run out of gold and press Escape, with no screen, and say what is shown and what is in the wallet after each.

**A tray that never hides the board.** The canvas is made shorter by the height of the tray, and the camera fits the board into what is left.

## Key code

**Two equations, two unknowns.**

```js
const determinant = right[0] * up[2] - right[2] * up[0];
return {
  x: (px * up[2] - right[2] * py) / determinant,
  z: (right[0] * py - up[0] * px) / determinant,
};
```

**A fade that takes the same time at any frame rate.**

```js
this.color = fadeColor(this.color, this.target, 1 - Math.exp(-OUTLINE.fade * dt));
```

## Controls

- **Press a podium in the tray and drag it** over the board; let go to build. Or **tap** a podium, and then tap the board
- **Escape** (or pressing the podium's button again) puts a podium down
- **`?map=1`** in the address for the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Waves. The next sample is **waves**: a table of waves, a spawner, lives that go when an enemy gets to the end, and the death animations, so that what the towers shoot at can be hurt, and gold is paid for it.
