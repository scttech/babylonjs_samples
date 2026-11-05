# Model Lab

<img src="assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

A tool for understanding 3D models, built one step at a time, and a tutorial series about how it is made. The aim is **modular characters**: a character that can swap its sword, hold a shield, wear a helmet and armour, change its colours, and borrow another character's animations. You do not need to know any 3D words to start: each tutorial opens with a list of the ones it uses.

Like the other series in this repo, each sample is also a step-by-step tutorial: every folder has a `TUTORIAL.md` you can follow from empty files, a `reset-tutorial.js` to go back to the start, and tests you can run in a browser.

## What you need

- A desktop browser (a phone works for looking).
- A **web server**, because the page loads model files: run `npx serve` in the repo root.
- Optionally, models of your own in **GLB** format. Blender, Mixamo and most tools can export one. FBX files are not opened directly (convert them to GLB first).

## The plan

| # | Sample | What it teaches |
|---|--------|-----------------|
| 1 | [Model Lab Look](model_lab_look/README.md) ([tutorial](model_lab_look/TUTORIAL.md)) | What a model file is made of; loading into an asset container; measuring a model and guessing its units; framing a camera for any size; a panel that shows text from a stranger's file safely |
| 2 | [Model Lab Skeleton](model_lab_skeleton/README.md) ([tutorial](model_lab_skeleton/TUTORIAL.md)) | A skeleton as a tree of plain data; where a bone really is in the world (and the centimetres-in-metres trap); drawing a skeleton through a model, following the bones; choosing a joint by a click; a naming convention, and proof that all three characters share their bones |
| 3 | [Model Lab Animations](model_lab_animations/README.md) ([tutorial](model_lab_animations/TUTORIAL.md)) | What a clip is made of (tracks, keyframes, frames and a frame rate); a player with play, pause, step, scrub, speed and loop; cross-fades as two weights that add up to 1; putting a model back in its rest pose; and proof that every clip needs exactly the skeleton's bones |
| 4 | [Model Lab Sequencer](model_lab_sequencer/README.md) ([tutorial](model_lab_sequencer/TUTORIAL.md)) | Chaining clips: a plan where each step begins before the one before it ends, a pose that is a function of time (so it can be scrubbed), weights that add up to 1 at every moment, why a paused clip ignores its weight, and how the sequencer and the clip player take turns; and how a chain differs from a cross-fade and a layer |
| 5 | Sockets | *(planned)* Attaching a prop to a bone, offsets, and the scale trap |
| 6 | Weapons | *(planned)* Swords, axes, a staff and a shield made in code (and your own .glb parts), swapped in the same socket |
| 7 | Skinned parts | *(planned)* Armour that bends with the body: weights, and fitting a shell to a skeleton |
| 8 | Slots | *(planned)* Head, chest, hands, back, two hands; hiding the body under armour; saving a loadout |
| 9 | Materials | *(planned)* Colours, team tints, swapping a texture, hiding parts |
| 10 | Animation tools | *(planned)* Does this clip fit this skeleton? Borrowing animations, hand paths, events, layering |

The plan may shift as each step teaches something unexpected.

## Credits

The three characters in `assets/characters/` are the models of the [Tower Defense series](../tower_defense/README.md): see the [assets README](assets/README.md).
