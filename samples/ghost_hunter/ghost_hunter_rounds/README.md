# Ghost Hunter Rounds

Step 14 of the Ghost Hunter series. Builds on [Ghost Hunter Detectors](../ghost_hunter_detectors/README.md). The hunt had no end: it went on until the player put the phone down. This sample makes it a game. A **round** is a room to clear: some ghosts are **hidden** in it; the player has to find them with the gadgets and capture them with the beam, while what else is in the room tries to get at them. Two things run down: **health**, which what touches you takes, and **sanity**, which the dark and the dread take, and which light and a capture give back. Lose either and the round is lost; capture every ghost and it is won, with a score; and the next round is harder.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Detectors sample. Run `node reset-tutorial.js` to return this folder to the Detectors sample, to work through the changes yourself.

A phone only lets a page use its camera and motion sensors over HTTPS: see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

**Two meters that pull against each other.** What touches you takes health (a mummy more than a spider), and a share of that as sanity. The dark takes sanity, dread takes more, a ghost that is near and looked at takes a little; **light** gives it back, but only in a quiet moment (a light does not help with something right there); a capture gives a lot back. So keeping the light on keeps your mind and spends the battery; keeping it off keeps the battery and loses your mind.

**Tricks.** Below a level of sanity the round plays tricks: a creak or a whisper from where nothing is, more often the lower it is; the picture goes dark red at the edges, a little off its colours, with a slight tilt. The random numbers are given to the round, so a test can run six hundred frames at ten sanity and at forty-five and say that there are more at ten.

**A state machine that is won or lost once.** `ready`, `hunting`, `won` or `lost`; `hurt`, `capture` and `update` can all end it, and they say so with **events** that whoever is listening empties out. A round that is over hears of nothing more.

**Levels and scores.** A table of rounds (how many ghosts, how hard the director works), and after the last row it stays as hard as the last. A score is the captures, what is left of health and sanity, and a bonus for being quick, so that neither playing carefully nor rushing is the whole strategy.

**The journal.** What has been met and dealt with of each kind, rounds played and won, the best round reached, and the five best scores, kept in the browser (which may refuse it, and a person may edit): read back only when it makes sense, with the storage given so a test can give one that throws.

## Key code

**What light is worth.**

```js
if (lightOn && dread < t.restore.quietBelow) change += t.restore.light;
```

**Won or lost exactly once.**

```js
if (this.health <= 0) this._lose("health");
else if (this.sanity <= 0) this._lose("sanity");
```

## Controls

- Everything from the Detectors sample
- The first round begins with the game; **Next round**, **Try this round again** and **Leave** are on the screen at the end of a round
- With **`?dev`**: a **Rounds** section with the round, health, sanity, time and journal, and buttons to hurt yourself, drain your sanity, capture the ghosts, go on, and clear the journal

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The last sample is **polish**: calm mode, install as an app, and a photograph of the fright.
