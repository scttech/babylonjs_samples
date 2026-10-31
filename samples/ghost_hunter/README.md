# Ghost Hunter

<img src="assets/images/ghost_hunter_logo.webp" alt="Ghost Hunter" width="360">

An augmented reality ghost hunt for your phone. The camera shows the room you are standing in, a 3D scene is drawn over it, and the dead turn up in your room: ghosts that drift through the walls, ghouls that lurch out of the dark, spiders that crawl across the ceiling. Find them with a flashlight and a detector, and capture them before they get to you.

It is made to be **creepy on purpose**, with sudden scares, flashing light and loud sound, so every sample has a content warning at the start, and a later one adds a scare-level setting and a calm mode.

Like the other series in this repo, each sample is also a step-by-step tutorial: every folder has a `TUTORIAL.md` you can follow from empty files, a `reset-tutorial.js` to go back to the start, and tests you can run in a browser. Every sample has a **`?dev`** mode: add it to the address and a panel appears with sliders and read-outs for the things worth watching while you play.

## What you need

- A **phone** is what the game is made for. An Android phone with Chrome gets real augmented reality (WebXR) from the second sample on. An iPhone gets the camera version: the camera's picture behind the scene, and the motion sensors to look around.
- A **desktop** can run everything except the sensors: you drag to look, and a dark room with a floor takes the place of the camera's picture. All the rules are plain arithmetic with tests, so most of the game can be built and tried without a phone.
- **HTTPS.** A phone only lets a page use its camera and its motion sensors if the page comes over HTTPS (a page on `localhost` counts, but only on the same computer). To try a sample on a phone, use the published gallery, or open a tunnel to your computer: `npx serve` in the repo root, and in another terminal a tunnel such as `npx localtunnel --port 3000` or `cloudflared tunnel --url http://localhost:3000`, then open the address it prints on the phone.

## The plan

| # | Sample | What it teaches |
|---|--------|-----------------|
| 1 | [Ghost Hunter Room](ghost_hunter_room/README.md) ([tutorial](ghost_hunter_room/TUTORIAL.md)) | The camera's picture behind a see-through 3D scene, the motion sensors of a phone (and the permission an iPhone asks for), looking around by dragging as the fallback, a start screen with a content warning, and what a device can do worked out from a description of it |
| 2 | [Ghost Hunter AR](ghost_hunter_ar/README.md) ([tutorial](ghost_hunter_ar/TUTORIAL.md)) | Placeholders that can be hidden, a floor found by WebXR or guessed from a ray, marks that the phone anchors in the room, and a way to test code that talks to a browser feature you cannot run at your desk |
| 3 | [Ghost Hunter Apparitions](ghost_hunter_apparitions/README.md) ([tutorial](ghost_hunter_apparitions/TUTORIAL.md)) | A ghost made in code: a flicker with no random number, fades that do not pop, a vertex and a fragment shader (see-through in the middle, bright at the edge), particle trails and mist from one drawn puff, and testing a scene with an engine that draws nothing |
| 4 | [Ghost Hunter Creatures](ghost_hunter_creatures/README.md) ([tutorial](ghost_hunter_creatures/TUTORIAL.md)) | Two-bone inverse kinematics for legs, a walk of planted and swinging feet, poses as lists of bones, a creature as a state machine, and a slot where models can replace the shapes (tested with stand-ins) |
| 5 | [Ghost Hunter The Hunt](ghost_hunter_hunt/README.md) ([tutorial](ghost_hunter_hunt/TUTORIAL.md)) | A director that keeps the rhythm of dread with one number, places things out of sight by an angle, picks what by weight, is tested over simulated minutes with a seeded random, and draws a debug map of itself |
| 6 | [Ghost Hunter Jump Scares](ghost_hunter_scares/README.md) ([tutorial](ghost_hunter_scares/TUTORIAL.md)) | A scare as a timeline of numbers, sound made in code with Web Audio (positional, with a voice for each creature), tests that render the sound and measure it, a camera shake, a buzz, and a scare level the player chooses and the game remembers |
| 7 | [Ghost Hunter Models](ghost_hunter_models/README.md) ([tutorial](ghost_hunter_models/TUTORIAL.md)) | Art that is the wrong size and has no animation: models made phone-sized with a script, measured and fitted to a height, moved from outside with a rock, a lean and a topple, three new kinds of creature, ghosts that are models, and tests that load the real files |
| 8 | [Ghost Hunter Music](ghost_hunter_music/README.md) ([tutorial](ghost_hunter_music/TUTORIAL.md)) | A score that listens: two recorded tracks mixed by the dread (a bed, then tension, then both out for the silence before a strike), streamed through the sound graph, started in the tap, and eased so that it never jumps |
| 9 | [Ghost Hunter Tools](ghost_hunter_tools/README.md) ([tutorial](ghost_hunter_tools/TUTORIAL.md)) | A flashlight and a capture beam as rays and cones, a battery and a heat that make the player choose, a weakness table for every kind, creatures that can be stunned and captured, ghosts that are faint until lit, and held buttons for a phone |
| 10 | [Ghost Hunter Creeping](ghost_hunter_creeping/README.md) ([tutorial](ghost_hunter_creeping/TUTORIAL.md)) | Fixing a feel from playtest feedback: creatures that creep, loiter and circle with a patience of their own, rush once and withdraw, a director that comes a third as often, and tests that said the old rules changed to say the new |
| 11 | Detectors | An EMF meter, a radar, a spirit box you tune, and thermal vision, all made from the same numbers about where things are |
| 12 | Rounds | Rounds and difficulty, health and a sanity meter that makes the screen go wrong, a ghost journal of everything caught, and scores kept in the browser |
| 13 | Polish | Calm mode, install as an app, a photo of the scare, and testing on real phones |

The plan may shift as each step teaches something unexpected.

## Credits

Everything in this series that you can see or hear (apart from the code) was made by other people and shared for free, and they deserve the credit. See the [assets README](assets/README.md).

- The 3D models (the creatures and the ghosts) were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence that allows them to be used, shared and modified. Credit to Meshy.
- Music by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437)
- Music by [AtlasAudio](https://pixabay.com/users/atlasaudio-54514918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255)
