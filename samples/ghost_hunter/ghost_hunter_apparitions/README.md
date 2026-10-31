# Ghost Hunter Apparitions

Step 3 of the Ghost Hunter series. Builds on [Ghost Hunter AR](../ghost_hunter_ar/README.md). Mark the floor and **mist** rises there, and a moment later **a ghost** appears: a body turned on a lathe, drawn by a shader so that it is see-through in the middle and bright at its edge, with a ragged hem that sways, two burning eyes, and a trail of cold wisps. It floats above the mark, bobs, wanders, flickers, and turns to face you. All of it is made in code: no model, no picture, no animation file.

What a ghost *does* is plain arithmetic of the time (`ghost.js`), tested without a screen: the flicker never leaves its range, the fade in and the fade out never pop, the turn goes the short way round and arrives. What it *looks like* (`ghostmesh.js`) only reads the answer.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the AR sample. Run `node reset-tutorial.js` to return this folder to the AR sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**A flicker with no random number.** Three sine waves whose speeds do not fit together, and a rare sharp dip, with a seed through a hash for each ghost's own phase: the same ghost flickers the same way every time, two ghosts do not flicker together, and a test can run two minutes of it and say it never leaves its range.

**See-through in the middle, bright at the edge.** The fragment shader's strength is `1 - |dot(normal, toEye)|` raised to a power: the edge of a shell is where the line of sight runs along the surface, and where the most glowing stuff is in front of the eye. The material adds its light to what is behind it, so it works over the camera's picture and over the dark alike.

**Alive without an animation.** The vertex shader sways the body with a sine of the time and the height, and makes the hem ragged with sines of the angle round the body.

**The look is joined to the numbers by listening.** The haunting tells of every ghost that comes and goes; the game makes and disposes of a body for each.

## Key code

**A smooth fade in and out.**

```js
const smooth = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
```

**The edge of a ghost.**

```glsl
float edge = 1.0 - abs(dot(normalize(vNormalW), toEye));
float rim = pow(edge, 1.7);
```

**A shader found by name.**

```js
BABYLON.Effect.ShadersStore.ghostVertexShader = GHOST_VERTEX;
BABYLON.Effect.ShadersStore.ghostFragmentShader = GHOST_FRAGMENT;
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter AR
- A `ShaderMaterial` with a vertex and a fragment shader written in GLSL, uniforms set from code, additive blending, and both sides of a shell drawn
- A lathe (`CreateLathe`) from a profile smoothed with `Curve3.CreateCatmullRomSpline`
- `ParticleSystem` with an emitter that is a point and one that is a mesh, a texture drawn on a `DynamicTexture` canvas, and a system that is stopped and left to fade (`disposeOnStop`)
- `NullEngine`, to test scenes without drawing
- (The ghost's numbers need no Babylon.js: they are plain arithmetic, tested without it.)

## Controls

- Everything from the AR sample
- **Mark the floor** (a tap or a click that does not move): mist at once, a ghost after a moment
- **G** summons a ghost three metres ahead
- With **`?dev`**: a count and the nearest ghost, sliders for brightness, flicker (depth and speed), fade in and out, life, bob, wander and turn rate, and the mist's thickness, and buttons to summon a ghost and to send them away

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the numbers of a ghost (the hash, the flicker over two minutes, the envelope's smooth ends, the bob, the wander, facing and turning), one ghost's whole life, the haunting (summoning, banishing, limits, the nearest), the effects (the puff, mist and trail made as the table says) and the look (the shader's halves agree, the material, the body, its update, disposal) with an engine that draws nothing.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The fourth sample is **Creatures**: spiders, ghouls and skeletons that crawl and lurch and lunge, as simple shapes (placeholders that can be hidden) until models arrive.
