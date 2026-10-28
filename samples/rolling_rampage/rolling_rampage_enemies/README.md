# Rolling Rampage Enemies

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 7 of the Rolling Rampage series. Builds on [Rolling Rampage Hazards](../rolling_rampage_hazards/README.md). What's new is that something **comes after you**. An **enemy** is a dark marble with an orange glow, heavier than yours and a little slower. It notices you when you get within 16 units, takes a moment to react, and then rolls straight at you. If it hits you it takes **three seconds off the clock** and shoves you, and with a gap or an edge nearby that is often the end of you. If it falls off the level it is gone for four seconds and then comes back where it started. *The Bridge* and *Hazard Alley* have one each; *Practice Run* has none.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Hazards sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**An enemy is a marble.** `Marble` takes options (a name, a look, a weight, and a strength), all with the player's marble's values as defaults, so `class Enemy extends Marble` only has to add what is different: a heavier body, a weaker push (`steeringForce` now takes a `force` and a `topSpeed`), a brain, and a request to be told about collisions. Nothing about rolling, falling or being put back is written twice.

**A chase is a pure function, and a decision is a state machine.** `chaseDirection` is a direction with a length of 1 from the enemy to the player along the floor, with no map and no memory: it rolls *straight* at you, and falls off whatever is in the way, which makes the gaps and edges of the levels your weapons. `Brain` is `idle`, `chasing` or `fallen`, and everything it does is a rule with a test.

**Two distances stop it flip-flopping.** It notices you at 16 and gives up at 22. With a single distance, a player standing exactly on it would have the enemy start and stop chasing every frame. The gap between the two is called hysteresis.

**A reaction time makes it fair.** An enemy that rolled at you the instant you came into range would feel like cheating. Between noticing and setting off it waits 0.4 seconds, and the count starts again if you leave its sight.

**Collision events, filtered.** A body only tells you about collisions if it asks (`setCollisionCallbackEnabled`), and then Havok reports `COLLISION_STARTED` and `COLLISION_CONTINUED` for every pair it touches. `watchHits` ignores everything but the first contact between the marble and an enemy.

**A cooldown against repeated events.** One bump is several reports. `Run.hit()` takes three seconds off, then ignores hits for 1.5 seconds, so a single clumsy collision costs three seconds and not nine.

**What rolled in matters.** An enemy can roll into the goal, a checkpoint or a puddle. Since the Clock tutorial the game has compared what entered a zone with the marble's mesh, so an enemy does nothing there. A test drops an enemy into the goal and checks it is reported as the enemy.

**No new CSS.** The enemies are drawn by the game and *Bumped!* uses the banner, so no new file in `css/`.

## Key code

**A chase.**

```js
function chaseDirection(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.01) return { x: 0, y: 0, z: 0 };
  return { x: dx / distance, y: 0, z: dz / distance };
}
```

**Noticing at one distance and giving up at another.**

```js
if (this.state === "idle") {
  this.seen = distance <= SIGHT_RANGE ? this.seen + dt : 0;
  if (this.seen >= REACTION_TIME) this.state = "chasing";
} else if (distance > GIVE_UP_RANGE) {
  this.state = "idle";
  this.seen = 0;
}
```

**An enemy is a marble with different options.**

```js
class Enemy extends Marble {
  constructor(scene, start, { name = "enemy", limit = FALL_LIMIT } = {}) {
    super(scene, { start, name, material: makeEnemyMaterial(scene), mass: ENEMY_MASS, steer: { force: ENEMY_FORCE, topSpeed: ENEMY_TOP_SPEED } });
    this.aggregate.body.setCollisionCallbackEnabled(true);
  }
}
```

**Only the marble and an enemy, only the first touch.**

```js
if (event.type !== "COLLISION_STARTED") return;
const other = a === marble.mesh ? b : b === marble.mesh ? a : null;
if (other && isEnemy(other)) onHit(other, event);
```

**A hit, with a cooldown.**

```js
hit() {
  if (this.status !== "running" || this.cooldown > 0) return 0;
  const taken = Math.min(HIT_PENALTY, this.remaining);
  this.remaining -= taken;
  this.cooldown = HIT_COOLDOWN;
  if (this.remaining === 0) this.status = "timeup";
  return taken;
}
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Hazards
- `PhysicsBody.setCollisionCallbackEnabled`, and `HavokPlugin.onCollisionObservable` with `COLLISION_STARTED` and `COLLISION_CONTINUED`
- Mass, and what it does in a collision between two bodies
- `ShadowGenerator.removeShadowCaster`, before a caster is disposed of
- Extending a class that makes meshes and physics bodies (`class Enemy extends Marble`)

## Controls

- **Arrow keys or WASD**, **touch and drag**, or **tilt**: roll the marble, and outrun the enemies
- **N**, or the **Next level** button: go to the next level. *The Bridge* and *Hazard Alley* have enemies
- **R**, or the **Drop again** button: put the marble back at the last checkpoint
- **C**: save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover a marble with options and a weaker push, the hit and its cooldown, the chase and every rule of the brain, where the enemies of every level start (over floor, away from the player, clear of zones and movers), and real enemies: chasing, staying put when nobody is in sight, being slower than the player, falling off and coming back, hitting the marble (once, and only an enemy), the heavier one shoving the lighter less, being taken away, and being reported to the zones as the enemy.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

**Rolling Rampage Screens** (coming next) adds a title screen, a pause, a score and a leaderboard, and sound.
