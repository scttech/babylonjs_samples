# Model Lab: Skeleton

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

Step 2 of the [Model Lab](../README.md) series. Builds on [Model Lab: Look](../model_lab_look/README.md). The skeleton of a model, made visible: a blue stick figure drawn *through* the body (a ball at each joint, a line from each to its parent) and a list of the bones as a tree, each under its parent. **Click a joint** on the model, or a name in the list, and it turns gold (its parent and children turn green) and the panel says its name, the part of the body it is in, its parent and children, the way down from the root, and where it is in the world.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, with a list of the words it uses at the start. Run `node reset-tutorial.js` to return this folder to the Look sample, to work through the changes yourself.

The page loads model files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`.

**A skeleton is a tree.** Babylon.js keeps the bones as a flat list; `boneTree` turns it into plain data (parents, children, depth) that is easy to ask questions of, and is tested on a skeleton of four bones as well as on the real ones.

**All three characters have the same bones.** A test loads the fire bender, the air bender and the heavy enemy and checks that their 24 bones have the same names in the same order. That one fact is why one sword will fit all of them, and why animations can be borrowed between them.

**The bones are in centimetres inside a model in metres.** Each bone's own numbers say 100 for a metre, but the model's root is scaled by 0.01, so its world position says 1. Joints are found by their *world* position, and a test moves a bone by 100 of its own units and checks that it moved a metre.

**The skeleton is drawn on top of the model.** Bones are inside the body, so it is put in a later rendering group that clears the depth first. It follows the bones every frame, with the lines updated in place, so it will move with an animation with nothing more to write.

**There is nothing to click on.** A joint is an invisible thing inside a body, so a click is turned into a joint by asking where each joint is on the screen and taking the nearest within a few pixels. A press and release that hardly move are a click; a drag turns the camera.

## Key code

```js
const point = BABYLON.Vector3.Project(position, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
```

## Controls

- **Click a joint** (or a name in the list) to choose a bone; **drag** to turn, **scroll** to zoom, **right-drag** to pan
- The **Skeleton** switch hides and shows the bones, with the others from the Look sample (grid, axes, wireframe, box, turntable)
- **Space** takes a screenshot
