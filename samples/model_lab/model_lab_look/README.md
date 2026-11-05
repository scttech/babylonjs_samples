# Model Lab: Look

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

Step 1 of the [Model Lab](../README.md) series. Open a 3D model and see what is inside it. **`index.html`** has a stage with the model on it (drag to turn, scroll to zoom, right-drag to pan) and a panel that says: how big the file is, how many triangles and vertices, how big the model is and what **units** it was probably made in, its meshes (and which are skinned), materials and pictures, its skeleton, and every animation clip with its length.

Open a model from the list (three come with the lab), with the **Open a .glb file** button, or by dropping a file on the page. A file that is not a GLB is refused with a sentence that says what works.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, with a list of the words it uses at the start. Run `node reset-tutorial.js` to return this folder to its empty starting point, to work through it yourself.

The page loads model files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`.

**Everything it knows is plain data.** `describeModel` turns a loaded model into a description (meshes, materials, skeletons, clips, size), and both the panel and the tests work from that description, never from live Babylon.js objects.

**A model is loaded into a box before it is in the scene.** An asset container holds what the file had without showing it, so the lab can look first, and a model's clips never start playing by themselves.

**The units are a guess, and the lab says so.** A model file's numbers have no unit. People are between about 1 and 2.5 metres tall, so a character that is about 2 tall is in metres, about 200 in centimetres, about 2000 in millimetres, and anything else is "cannot tell". The guess is a table, read by the code and by a test.

**The camera fits any model.** Stand back from the sphere that holds the model's box, far enough that it fits across the narrower way of the picture (a phone held upright is narrower across).

**Nothing from a file is run as code.** Names in a model come from someone else's file, so the panel puts every piece of text on the page with `textContent`; a test opens a model called `<img src=x onerror=alert(1)>` and sees the letters.

## Key code

```js
const sideways = 2 * Math.atan(Math.tan(fov / 2) * Math.min(aspect, 1));
const distance = (radius / Math.sin(Math.min(fov, sideways) / 2)) * 1.1;
```

## Controls

- **Drag** to turn, **scroll** (or pinch) to zoom, **right-drag** (or two fingers) to pan
- The switches turn on a floor grid, axes, a wireframe, a box around the model and a turntable
- **Space** takes a screenshot
