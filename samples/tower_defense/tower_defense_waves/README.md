# Tower Defense Waves

<img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

Step 5 of the Tower Defense series. Builds on [Tower Defense Build](../tower_defense_build/README.md). The towers could shoot and nothing they shot was hurt. Now it is a **game**. Enemies have **health**, and when it runs out they **fall** (one of two death animations, played at a speed that makes the fall last two seconds), lie there, and sink into the island. They come in **ten waves**, from a table, each tougher than the last, with time to build between; an enemy that gets to the end costs **lives**, one that is defeated pays **gold**, and a banner says when you have won or lost. A **Start wave** button calls the next wave early.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Build sample. Run `node reset-tutorial.js` to return this folder to the Build sample, to work through the changes yourself.

The page loads models from files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?map=1`** to the address for the second map. A fan project: see the [series README](../README.md).

**The rules are a state machine that speaks in events.** The `Director` is getting ready, running, won or lost; each frame it is told how long it was and how many enemies are on the board, and it says what happened (`wave`, `spawn`, `cleared`, `won`, `lost`). It knows nothing of models, gold or the screen. A wave is beaten when every enemy has come on and none is left; the time a countdown ran over is not time that the wave has been going.

**Waves are a table, turned into a timeline.** A wave is groups of one kind of enemy; `scheduleOf` makes it a list of `{ time, kind }`, and a `Spawner` is walked through it by time (many short steps and one long one give the same answer). Each wave is 12 percent tougher than the one before.

**Three questions about an enemy, not one.** *Alive* (on its feet), *dead* (falling or fallen) and *finished* (over: it walked to the end, or it has sunk), because a single `done` would be wrong for one of them. `hurt()` says whether *this* hit defeated it, which is how a game knows to pay once.

**A frame of the game is a function of a world.** `advance(world, dt)` does everything in the right order (the director, the enemies, the accounts, the towers, the bolts) with everything it needs in one object, and the three things that need a scene (`spawn`, `shoot`, `ended`) as functions in it. The page and the tests play the same frame, so a test plays a whole game of real enemies, towers and bolts with no screen: it is won with towers, lost without, paid when an enemy falls and not when the bolt is thrown, and leaves nothing behind in the scene.

**The balance was set by playing the game, in a test.** A simulation plays the real waves against towers bought by a sensible rule (the most harm for the gold, of any kind or of one kind) with the real brains, walkers and tables, and no models. It says that the game can be won on either map with only a few lives lost, and that a defense that holds the first wave cannot hold the last. The first try was too easy, and the numbers in the tables were changed until it said otherwise.

## Key code

**A death clip made to last as long as you like.**

```js
const length = (this.fall.to - this.fall.from) / this.fall.targetedAnimations[0].animation.framePerSecond;
this.fall.start(false, length / DEATH.seconds);
```

**A frame of the game, in the order that matters.**

```js
director events -> enemies walk -> settle (pay, lose lives, take away) -> towers shoot -> bolts fly
```

## Controls

- Build towers as in the last sample (drag a podium from the tray, or tap and tap)
- **Start wave** calls the next wave early; **Play again** (when it is over) starts again
- **`?map=1`** in the address for the second map; Space takes a screenshot

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests load the real models and play whole games, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

Scenery. The next sample, [**scenery**](../tower_defense_scenery/README.md), puts **props** on the maps (a cabbage cart, a spirit shrine, a koi pond, a winged-lemur perch), written in the map's text, that make the board a place and that a tower can't be built on.
