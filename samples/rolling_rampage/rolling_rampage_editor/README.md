# Rolling Rampage Editor

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 10 of the Rolling Rampage series, the last. Builds on [Rolling Rampage Polish](../rolling_rampage_polish/README.md). What's new is a **level editor**, inside the game, so anyone can make a level of their own. Press **My levels** on the title screen, then **New level**, and draw the floor with the mouse (paint a height, drag a box, ramp it from one height to another), put the start, the goal, checkpoints, enemies, slime, pistons and platforms where you like, and the editor tells you **while you draw** what is wrong: a goal on a slope, a checkpoint nobody can reach, a clock that is too short. **Test** plays the level, **Save** keeps it in the browser, and **Share** turns it into text you can send to someone, who can add it with **Add from text**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Polish sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**One place for every limit.** A level is at most 60 corners across and 30 down, and every other limit (the smallest size, the highest height, how many of each thing, how many saved levels, the longest name, the clock's range, how far Undo goes) is a line of `EDITOR_LIMITS` in `limits.js`. Nothing else in the editor has a number of its own for these, and the tests read the limits from the table too. Change `maxCols` to 80 and the size boxes, the checks, the saving and the tests all follow.

**The rules are code.** The tests of the earlier tutorials checked the ten levels: every zone on flat floor, every piston on flat floor, every platform meeting the floor, every goal reachable, a fair clock. `checkLevel` is those rules for *any* level, and returns a list of problems with the place of each. An *error* (a start over a hole, rows of different lengths) stops a level from being played at all; a *warning* (a goal on a slope, a clock that is too short) doesn't, because the only way to find out whether a hard level is fair is to try it. The ten levels of the game pass with no problems, and a test says so.

**A model with no page in it.** `LevelDraft` is the level being edited: it paints corners, fills boxes, ramps, resizes (within the limits), places, moves and removes things, checks itself, and goes back and forward through **undo** and **redo**, which are a list of snapshots. `applyGesture` is what a press, a drag and a release do for each tool, as plain functions. The screen only draws the draft and turns clicks and keys into calls, so nearly all of the editing is tested without a page.

**Things are data.** A checkpoint, an enemy, a puddle, a piston and a platform are each a few numbers, pointed to by a `{ kind, index }`. What a thing has to say for itself (which numbers, their ranges, their steps) is a table, `thingFields`, and the form on the right is built from it. A new piston or platform takes the height of the floor it stands on, and **Flatten floor** makes the floor under a zone flat.

**Never trusting data from outside.** Levels come from `localStorage` and from text people paste, and could be anything. `cleanLevel` builds a *new* level from whatever it is given, with every number held to a range and every list to a limit, so what comes out can always be opened by the editor. The levels of the game come out exactly as they went in, and rubbish comes out safe. `levelToText` is the same shape as an entry of `LEVELS` in `level.js`, so a level worth keeping can be pasted straight into the game.

**The game remembers where a level came from.** A level played from My levels goes back to My levels, and one tested from the editor goes back to the editor, with everything you drew (`origin`, `playLevel`, `toTitle`). A level of your own is played alone and doesn't go on the leaderboard.

## Key code

**The limits.**

```js
const EDITOR_LIMITS = {
  maxCols: 60, // the widest a level can be, in corners
  maxRows: 30, // and the deepest
  maxHeight: 9, // the highest digit of a height. A height is one character of a row, so this can't be more than 9
  maxObjects: 20, // the most of each kind of thing in a level: checkpoints, enemies, puddles of slime, movers
  maxLevels: 20, // the most levels kept in My levels
  ...
};
```

**A fill is a ramp when the heights differ.**

```js
fill(col0, row0, col1, row1, from, to = from) {
  const acrossFirst = Math.abs(col1 - col0) >= Math.abs(row1 - row0);
  const span = (acrossFirst ? col1 - col0 : row1 - row0) || 1;
  for (let row = Math.min(row0, row1); row <= Math.max(row0, row1); row++) {
    for (let col = Math.min(col0, col1); col <= Math.max(col0, col1); col++) {
      const share = ((acrossFirst ? col - col0 : row - row0) / span);
      this.setDigit(col, row, from === null ? null : Math.round(from + (to - from) * share));
    }
  }
}
```

**Undo is a list of snapshots.**

```js
begin() {
  this.past.push(JSON.stringify(this.level));
  if (this.past.length > this.limits.undoDepth) this.past.shift();
  this.future = [];
}
```

**A level that comes in is never used as it is.**

```js
const corner = (ch) => (/^[0-9]$/.test(ch) ? String(Math.min(Number(ch), limits.maxHeight)) : ".");
const rows = lines.map((line) => [...line.slice(0, cols)].map(corner).join("").padEnd(cols, "."));
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Polish
- Playing a level that is made while the game runs: the same `buildLevel`, zones, movers and enemies, from data that did not exist when the page loaded
- (The editor itself is the browser's: a 2D `canvas`, pointer events, `localStorage` and the clipboard. The game's engine is only asked to play what the editor makes.)

## Controls

- Everything from the Polish sample
- **My levels** on the title: the list of your levels, and **New level**
- In the editor: **0 to 9** pick a height, **Ctrl+Z** and **Ctrl+Y** undo and redo, **Delete** removes the picked thing. A click or drag does what the chosen tool says

The editor is meant for a mouse (it works with a finger, but is best on a desktop). The levels it makes play on a phone as well as any other.

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the limits, the checks (each rule has a test that breaks it, and the ten levels of the game have none), the things, the draft (painting, ramps, resizing, undo and redo), My levels (cleaning rubbish, text both ways, storage that fails), the gestures, and the My levels screen against a stand-in for the page.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## The end of the series

This is the last of the ten. The challenges at the end of the [tutorial](TUTORIAL.md) suggest where to take it next.
