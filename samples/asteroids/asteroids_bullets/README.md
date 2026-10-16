# Asteroids Bullets

Step 2 of the Asteroids series. Builds on [Asteroids Ship](../asteroids_ship/README.md), reusing its rotation, thrust, inertia, screen wrap, and line-art ship wholesale. What's new is the ability to shoot: hold Space and the ship fires bullets from its nose, in the direction it's pointing.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Ship sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**Where bullets start.** `Ship.muzzle()` reports the nose position and the unit vector the ship is pointing along, `(-sin(angle), cos(angle))`. It's a method on `Ship` rather than math in the bullet code because the ship owns its own geometry: change the hull and only `Ship` needs to change.

**Bullets inherit the ship's momentum.** A bullet's velocity is the ship's velocity plus the firing direction times the bullet speed. Fly right and fire straight up, and the bullet drifts right too, as in the arcade original.

**A bullet is a plain record.** `BulletSystem` tracks bullets as `{ x, y, vx, vy, life, mesh }` objects, not instances of a class, the same choice `BrickGrid` made for bricks in the Breakout series: a bullet has no behavior of its own. `BulletSystem` follows the same scene-optional split as `Ship`, touching `BABYLON` only when constructed with a `scene`.

**Two limits.** A `cooldown` (0.2 s) sets the rate of fire, and `maxBullets` (4) caps how many can be in flight. Each bullet also expires after `lifetime` (1 s). Together they force the player to aim instead of flooding the screen.

**Bullets wrap too.** They leave one edge and reappear on the opposite one, using the same rule as the ship, until their lifetime runs out.

## Key code

**Muzzle position and direction.**

```js
muzzle() {
  const dirX = -Math.sin(this.angle);
  const dirY = Math.cos(this.angle);
  return { x: this.x + dirX * this.radius, y: this.y + dirY * this.radius, dirX, dirY };
}
```

**Firing, with a cooldown and a cap.** `fire()` returns the new bullet, or `null` if it can't fire, so callers can tell whether a shot actually happened.

```js
fire(ship) {
  if (this.cooldownRemaining > 0 || this.bullets.length >= this.maxBullets) return null;

  const { x, y, dirX, dirY } = ship.muzzle();
  const bullet = {
    x,
    y,
    vx: ship.vx + dirX * this.speed, // inherit the ship's velocity
    vy: ship.vy + dirY * this.speed,
    life: this.lifetime,
    mesh: null,
  };
  if (this.scene) this._attach(bullet);
  this.bullets.push(bullet);
  this.cooldownRemaining = this.cooldown;
  return bullet;
}
```

**Updating and removing bullets.** The loop runs backwards so `splice()` doesn't skip the element that slides into the removed slot.

```js
update(dt, bounds) {
  const { halfWidth, halfHeight } = bounds;
  this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);

  for (let i = this.bullets.length - 1; i >= 0; i--) {
    const bullet = this.bullets[i];
    bullet.life -= dt;
    if (bullet.life <= 0) {
      this._disposeBullet(bullet);
      this.bullets.splice(i, 1);
      continue;
    }

    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    // ...wrap around the edges, then copy x/y to bullet.mesh.position...
  }
}
```

**One shared, unlit material.** Bullets are spheres, which would normally need a light to be visible. An `emissiveColor` makes the surface glow on its own and `disableLighting` makes the material ignore lights entirely, so the bullets are full-bright with no light in the scene. One material serves every bullet instead of allocating a new one per shot.

```js
_createMaterial(scene, color) {
  const material = new BABYLON.StandardMaterial("bulletMaterial", scene);
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  material.disableLighting = true;
  return material;
}

_attach(bullet) {
  bullet.mesh = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: this.radius * 2, segments: 8 }, this.scene);
  bullet.mesh.material = this._material;
  bullet.mesh.position.x = bullet.x;
  bullet.mesh.position.y = bullet.y;
}
```

**Disposing a bullet without disposing the material.** `dispose(doNotRecurse, disposeMaterialAndTextures)`: Breakout's bricks passed `true` because each brick owned its material. Here the material is shared, so passing `true` would destroy it and the next shot would render with a disposed material.

```js
_disposeBullet(bullet) {
  if (!bullet.mesh) return;
  bullet.mesh.dispose(false, false);
  bullet.mesh = null;
}
```

**Wiring it into the frame loop.** Firing happens after the ship has moved, so bullets spawn at the nose's current position. Holding Space auto-fires, paced by the cooldown.

```js
ship.update(dt, bounds);

if (anyHeld(FIRE_KEYS)) bullets.fire(ship);
bullets.update(dt, bounds);
```

**A synthesized "pew".** Like the earlier series, the sound is generated in code rather than loaded from a file. What's new is a frequency *sweep*: the pitch drops from about 1000 Hz to about 165 Hz while the volume fades. The waveform accumulates phase one small step per sample instead of computing `sin(2π·f·t)` directly, because with a changing frequency the direct formula makes the phase jump and the sound glitches. `fire()` returns `null` when it can't fire, so the sound plays only for shots that actually happened.

```js
let phase = 0;
for (let i = 0; i < length; i++) {
  const t = i / sampleRate;
  const frequency = 1000 * Math.exp(-t * 12); // swoops from 1000 Hz down to ~165 Hz
  phase += (2 * Math.PI * frequency) / sampleRate;
  data[i] = Math.sin(phase) * Math.exp(-t * 18) * 0.5;
}

// in the frame loop
if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();
```

## Babylon.js features demonstrated

- Everything from Asteroids Ship (orthographic camera, line-art meshes, frame-rate-independent held-key input)
- A synthesized sound effect with a frequency sweep, via Babylon's Audio Engine V2 (`CreateAudioEngineAsync`, `createSoundAsync`)
- Creating and disposing `BABYLON.MeshBuilder.CreateSphere` meshes at runtime, as the player fires
- A single `StandardMaterial` shared by many meshes, and the `dispose(false, false)` that keeps it alive
- `emissiveColor` with `disableLighting` for full-bright, light-independent rendering
- Timer-driven gameplay (cooldown and lifetime) using the frame's `dt`

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **R** — reset the ship to the center, at rest, and clear any bullets in flight
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ship.js` (now including `Ship.muzzle()`) and `js/bullets.js`. The bullet tests cover firing direction, velocity inheritance, the cooldown and bullet cap, expiry, and wrapping. A second module stubs `BABYLON` to check the shared material and that an expired bullet's mesh is disposed without disposing that material.

## Notes

Browsers block audio until a user gesture. Pressing a key counts, and Babylon shows its own small unmute prompt if it's still needed.

## Next up

[Asteroids](../README.md) continues with rocks for the bullets to hit.
