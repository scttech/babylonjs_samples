# Tower Defense Editor

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 11 of the Tower Defense series, and the last. Builds on [Tower Defense Polish](../tower_defense_polish/README.md). A map has been text since the second tutorial: a character for each cell, parsed, checked, drawn and played. Now the player **draws** one. **`editor.html`** is a board with a palette of brushes (road, the start, the goal and the five props, and an eraser): drag to paint, with the game's own checks telling you what is wrong as you go (*the road at column 1, row 2 has 1 neighbor*) until it says **Ready to play!**; undo and redo (Ctrl+Z and Ctrl+Y); give it a name; **Save** it, and it is a card on the game's title screen, with *Edit* and *Delete*; **Share link**, and anyone who opens it plays your map; or **Play** it at once.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Polish sample. Run `node reset-tutorial.js` to return this folder to the Polish sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. The editor is **`editor.html`** (and *Make a map* on the game's title screen). A fan project: see the [series README](../README.md).

**The editor has no screen in it.** A `MapEditor` is a board of characters, brushes (a table), rules that make a mistake hard to make (one start, one goal, scenery only on grass), and a list of what is wrong. It knows nothing of the pointer or of Babylon.js, so it is tested down to its corners; the front is a page that tells it a cell and a brush.

**A map that the editor calls ready is a map that the game plays.** The editor's `problems()` *calls* the game's own `mapProblems` and `pathProblems`, and only adds checks (enough road, room for towers). A test draws forty things at random and says it.

**A drag is one step.** The pointer jumps over cells (a line is drawn between where it was and where it is, with Bresenham's algorithm), and a stroke is bracketed by `begin` and `end` so that undo takes back what the player did and not forty small movements. A step is a snapshot of nine short strings, which is much simpler than a record of what changed.

**Nothing that comes in is believed.** A map in a link is limited in length, decoded without throwing, checked row by row against the legend and the board, its name made safe, and finally has to be a map that the game can play. What is read from storage is checked again, entry by entry. Both are tested with nonsense of every kind.

**Only what changed is drawn.** Painting a cell redraws that cell and the four beside it (a piece of road is the piece it is by its neighbors), its scenery, and the markers: not all hundred and twenty-six tiles for every cell that a finger passes over.

**A map is handed from one page to another in an address,** squeezed (run-length encoded, then base64 for a link) into well under a thousand characters.

## Key code

**A map from a link is a map, or it is nothing.**

```js
const problems = editor.problems();
return problems.length === 0 ? { ok: true, map } : { ok: false, problems };
```

**What changes when a cell changes.**

```js
for (const [c, r] of [[col, row], [col, row - 1], [col + 1, row], [col, row + 1], [col - 1, row]]) ...
```

## Controls

- **Editor:** pick a brush (or press 1 to 9), drag on the board; **Ctrl+Z** and **Ctrl+Y** (or Shift+Ctrl+Z) undo and redo; **Save**, **Share link** and **Play** are there once the map can be played
- **The game's title screen:** a card for each map, *Make a map*, and *Edit* and *Delete* on the maps that you made
- Everything else as in the last sample

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models, draw the board of the editor, and play whole games, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

That is the end of the series.
