# Tutorial: Model Lab, Look -- Open a Model and See What Is Inside

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

This is the first tutorial of the **Model Lab**: a tool, built up one step at a time, for understanding 3D models and for learning how **modular characters** work (a character that can swap its sword, wear a helmet, change its armour, and borrow another character's animations). Before you can do any of that, you need to be able to **open a model and look at it**. That is this tutorial. You write the code; this document tells you what to write, and why.

By the end you'll have a page where you can:

- **Open a model**: pick one of the three that come with the lab, choose a `.glb` file from your own computer, or drop one on the page
- **Look at it**: spin it, zoom, and pan; switch on a floor grid, axes, a wireframe, a box around it, or a turntable
- **Read what is inside it**: how big the file is, how many triangles, how big the model is (and what units it was made in), its meshes, materials and pictures, its skeleton, and every animation it has, with the length of each
- Unit tests for all of it: **62 passing tests**, run against the real models

**What you'll learn:** what a model file is made of, how Babylon.js loads one into an *asset container* before it is in the scene, why models have to be measured (and why the same character can be 1.8, 180 or 1800 units tall), how to put a camera at the right distance for any size of model, and how to show text from a file that someone else made without letting it run as code.

**Before you start:** you need a web server (the page loads model files, which a browser will not do from a plain file): run `npx serve` in the repo root and open the sample through `http://localhost`. Nothing else has to be done first; this is where the series begins.

## Words you'll meet

You do not need to know any of these yet: each is explained again where it is first used. Come back to this list whenever a word is a puzzle.

| Word | What it means |
|------|---------------|
| **Model** | A 3D object stored in a file: its shape, what it is covered with, and sometimes a skeleton and animations. A character, a sword and a tree are all models. |
| **GLB / glTF** | The file format used for web 3D, and the only one this lab opens. *glTF* is the format, and *GLB* is the same thing packed into one file (a `.gltf` is usually several files). Think of it as the JPEG of 3D. Blender, Mixamo and most other tools can save one. |
| **Vertex** (plural **vertices**) | A point in 3D space. A model is made of thousands of them. Each has a position and also other facts: which way it faces, where it is on the picture that covers the model, and (in a character) which bones move it. |
| **Triangle** | Three vertices joined to make a tiny flat surface. A model's whole surface is a mesh of triangles, and "how many triangles" is the usual way to say how heavy a model is. A phone game character is often 5,000 to 20,000. |
| **Mesh** | A set of vertices and triangles that make one shape. A model can have one mesh (a character) or many (a car: body, four wheels, windows). |
| **Material** | What a mesh looks like: its colour, how shiny it is, whether it is see-through. A **PBR material** ("physically based") is the realistic kind that glTF uses. |
| **Texture** | A picture wrapped around a mesh, like the paper on a gift. A material usually has several: one for colour, one for how shiny, one for the bumps. A character with three pictures has three textures. |
| **UV** | The map that says which part of the picture goes on which part of the mesh (U and V are the picture's own x and y, as X, Y and Z are already taken). You will not write any UVs, but you will see the word. |
| **Skeleton** and **bone** | A set of invisible joints, joined like a real skeleton (hips, spine, neck, arm, hand...). Moving a bone moves the part of the mesh that is attached to it. A bone is also called a **joint**. |
| **Skinned mesh** | A mesh that is attached to a skeleton, so that it **bends** when the bones move. The attaching is called *skinning*. A character's body is a skinned mesh; a rock is not. |
| **Animation clip** | A recording of bones moving over time: "walk", "run", "punch". Babylon.js calls a clip an **animation group**. A model can have none, or dozens. |
| **Scene** | Everything that is being drawn: the models, the lights, the camera. |
| **Camera** | The eye that the scene is looked at through. This lab uses an **orbit camera**, which circles a point (drag to turn, scroll to zoom). |
| **Asset container** | A box that holds everything that a file contained, *without* putting any of it in the scene. You look in the box first, and then decide. |
| **Bounding box** | The smallest box, lined up with the world's axes, that holds the whole model. Its sides are the model's width, height and depth. |
| **Units** | The numbers in a model file have no unit written on them. 1.8 might be 1.8 metres, but it could also be 1.8 centimetres, and a model made in centimetres is a hundred times too big in a scene that thinks in metres. Part of looking at a model is working out which. |
| **Asset** | Any file the game loads: a model, a picture, a sound. |

## Where you're starting

The folder holds the page and the three models, and a placeholder for every file that you will write:

```
model_lab/
├── assets/characters/     (fire.glb, air.glb, heavy.glb: three models to look at)
└── model_lab_look/
    ├── index.html          (the page, already written: a canvas and a panel)
    ├── tests.html          (the tests page, already written)
    ├── css/
    │   ├── theme.css       (placeholder -- Step 7)
    │   └── lab.css         (placeholder -- Step 7)
    ├── js/
    │   ├── units.js        (placeholder -- Step 1)
    │   ├── loader.js       (placeholder -- Step 2)
    │   ├── inspect.js      (placeholder -- Step 3)
    │   ├── frame.js        (placeholder -- Step 4)
    │   ├── viewer.js       (placeholder -- Step 5)
    │   ├── panel.js        (placeholder -- Step 6)
    │   └── main.js         (placeholder -- Step 7)
    └── tests/              (a placeholder for each, with the same names as the code)
```

Every code file follows one pattern. Each is a **plain script** (no bundler or build step), so the functions it defines are shared with the other files through the page, and each ends with a block that also exports them for the tests:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ... };
} else {
  Object.assign(window, { ... });
}
```

Copy that block exactly when it is in the code below: it is what lets `tests.html` and `index.html` see your functions.

Open `tests.html` before you change anything, through the web server. QUnit will say **No tests were run**, which is right: there are none yet. Open `index.html` too: it will be a dark, empty stage for now.

## Step 1: Numbers for people (`units.js`)

A model file is full of numbers, and the first job of a tool that looks inside one is to say them in words that a person can use: `3.7 MB`, `10,366 triangles`, `about 1.8 metres tall`. That last one is the interesting one, because it is a **guess**: remember that a model's numbers have no unit written on them. This file is where the lab makes that guess, and says when it cannot.

The guess rests on one fact: **people are between about a metre and two and a half metres tall**. So if the model is a person, and the file says it is about 2 tall, it is probably in metres; about 200 tall, centimetres; about 2000 tall, millimetres. Anything else (a ruler, a castle, a model with a stray vertex far away) is "cannot tell", and the lab says so instead of making something up.

Notice that the guess is a **table** (`UNIT_GUESSES`), read by the code and by a test. That is a habit of this repo: a limit lives in one place.

Create `js/units.js`:

```js
// Numbers for people. A model file is full of numbers (how many points, how many bytes, how big it is), and the first job of a tool that looks
// inside one is to say them in words a person can use: "3.9 MB", "10,014 triangles", "about 1.8 metres tall". The last of those is a
// guess, and an important one: models are made in different *units* (a person may be 1.8 units tall, or 180, or 1800) and the same code
// has to know which, or it puts a character the size of a house on the screen. See ../tests/units.tests.js.

// A number of bytes as text: 512 B, 3.9 KB, 3.74 MB. (Binary: a kilobyte is 1024 bytes.)
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

// A whole number with thousands separators: 10014 is "10,014".
function formatCount(count) {
  return Number.isFinite(count) ? Math.round(count).toLocaleString("en-US") : "unknown";
}

// The units that a character's height is probably in, from how tall the model is *in the file's own numbers*. A person is between about a
// metre and two and a half tall, so a model that is about two tall is in metres, one that is about two hundred tall is in centimetres,
// and one that is about two thousand tall is in millimetres. Anything else is a guess that is said to be one. It says what to multiply by to get
// metres, which is what Babylon.js and this lab work in.
const UNIT_GUESSES = [
  { name: "metres", toMetres: 1, from: 0.5, to: 5 },
  { name: "centimetres", toMetres: 0.01, from: 50, to: 500 },
  { name: "millimetres", toMetres: 0.001, from: 500.0001, to: 5000 },
];

function guessUnits(height) {
  if (!(height > 0)) return { name: "unknown", toMetres: 1, sure: false };
  const match = UNIT_GUESSES.find((guess) => height >= guess.from && height <= guess.to);
  return match ? { name: match.name, toMetres: match.toMetres, sure: true } : { name: "unknown", toMetres: 1, sure: false };
}

// How tall a model is in metres, if it is a person: its height in the file's numbers times what the guess says.
function heightInMetres(height) {
  return height * guessUnits(height).toMetres;
}

// A size as text: "0.9 x 1.8 x 0.4 m".
function formatSize(size, unit = "m") {
  const part = (value) => (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, ""));
  return `${part(size.x)} x ${part(size.y)} x ${part(size.z)} ${unit}`;
}

// A length of time in seconds as text: 0.633 is "0.63 s", and 125 is "2:05".
function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds < 100) return `${seconds.toFixed(2)} s`;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatBytes, formatCount, UNIT_GUESSES, guessUnits, heightInMetres, formatSize, formatSeconds };
} else {
  Object.assign(window, { formatBytes, formatCount, UNIT_GUESSES, guessUnits, heightInMetres, formatSize, formatSeconds });
}
```

Then `tests/units.tests.js`:

```js
QUnit.module("formatBytes", () => {
  QUnit.test("says small numbers in bytes", (assert) => {
    assert.strictEqual(formatBytes(0), "0 B");
    assert.strictEqual(formatBytes(512), "512 B");
  });

  QUnit.test("says larger ones in kilobytes and megabytes, a thousand and twenty-four at a time", (assert) => {
    assert.strictEqual(formatBytes(1024), "1.0 KB");
    assert.strictEqual(formatBytes(1536), "1.5 KB");
    assert.strictEqual(formatBytes(4 * 1024 * 1024), "4.0 MB");
  });

  QUnit.test("does not make up an answer for a number that is not one", (assert) => {
    assert.strictEqual(formatBytes(NaN), "unknown");
    assert.strictEqual(formatBytes(-5), "unknown");
    assert.strictEqual(formatBytes(undefined), "unknown");
  });
});

QUnit.module("formatCount", () => {
  QUnit.test("puts commas in big numbers", (assert) => {
    assert.strictEqual(formatCount(10014), "10,014");
    assert.strictEqual(formatCount(7), "7");
  });

  QUnit.test("says unknown for what is not a number", (assert) => {
    assert.strictEqual(formatCount(NaN), "unknown");
  });
});

QUnit.module("guessUnits", () => {
  QUnit.test("a person that is about two tall is in metres", (assert) => {
    assert.strictEqual(guessUnits(1.8).name, "metres");
    assert.strictEqual(guessUnits(1.8).toMetres, 1);
  });

  QUnit.test("a person that is about two hundred tall is in centimetres", (assert) => {
    assert.strictEqual(guessUnits(180).name, "centimetres");
    assert.strictEqual(guessUnits(180).toMetres, 0.01);
  });

  QUnit.test("a person that is about two thousand tall is in millimetres", (assert) => {
    assert.strictEqual(guessUnits(1800).name, "millimetres");
    assert.strictEqual(guessUnits(1800).toMetres, 0.001);
  });

  QUnit.test("a size that no person has is a guess that says it cannot tell", (assert) => {
    for (const height of [0, -1, 0.01, 20, 20000, NaN]) {
      assert.strictEqual(guessUnits(height).sure, false, `height ${height}`);
      assert.strictEqual(guessUnits(height).toMetres, 1);
    }
  });

  QUnit.test("the table's ranges do not overlap", (assert) => {
    for (let i = 1; i < UNIT_GUESSES.length; i++) assert.ok(UNIT_GUESSES[i].from > UNIT_GUESSES[i - 1].to, UNIT_GUESSES[i].name);
  });
});

QUnit.module("heightInMetres", () => {
  QUnit.test("turns the file's numbers into metres by the guess", (assert) => {
    assert.strictEqual(heightInMetres(1.8), 1.8);
    assert.ok(Math.abs(heightInMetres(180) - 1.8) < 1e-9);
    assert.ok(Math.abs(heightInMetres(1800) - 1.8) < 1e-9);
  });
});

QUnit.module("formatSize", () => {
  QUnit.test("writes the three sides, with no spare zeros", (assert) => {
    assert.strictEqual(formatSize({ x: 0.9, y: 1.8, z: 0.4 }), "0.9 x 1.8 x 0.4 m");
    assert.strictEqual(formatSize({ x: 1, y: 2, z: 3 }, "cm"), "1 x 2 x 3 cm");
  });

  QUnit.test("big numbers have no decimals", (assert) => {
    assert.strictEqual(formatSize({ x: 104.6, y: 180.2, z: 140.9 }, "cm"), "105 x 180 x 141 cm");
  });
});

QUnit.module("formatSeconds", () => {
  QUnit.test("short times are seconds, and long ones are minutes and seconds", (assert) => {
    assert.strictEqual(formatSeconds(0.633), "0.63 s");
    assert.strictEqual(formatSeconds(125), "2:05");
  });

  QUnit.test("says unknown for what is not a time", (assert) => {
    assert.strictEqual(formatSeconds(-1), "unknown");
    assert.strictEqual(formatSeconds(NaN), "unknown");
  });
});
```

Open `tests.html`: **15 passing tests**, 15 of them new.

## Step 2: Getting a model into the scene (`loader.js`)

A model arrives as a file's worth of bytes: from the server (the three samples), or from your own computer (a file you pick or drop). Babylon.js can load a file and put everything in it straight into the scene, but a lab wants something more careful: it loads into an **asset container** first, looks inside, and only then decides what to show. Think of the container as a shipping box that you have opened on the table, before anything is put away.

Four small things happen in this file:

- **`looksLikeGlb`** checks the first four bytes. Every GLB begins with the letters `glTF`. If you pick a PNG, an FBX or a text file by accident, the lab says so in a sentence that says what *does* work, instead of showing an error from deep inside the loader.
- **`readBytes`** gets the bytes either way: `fetch` for an address, `file.arrayBuffer()` for a file from the computer. Reading the bytes ourselves also tells us how big the file was.
- **`loadModelFile`** turns the bytes into a temporary address (a *blob URL*) that the loader can read, loads, and forgets the address.
- **`showModel`** and **`removeModel`** add the model to the scene (and stop its clips, because Babylon.js starts the first one on its own), and take it out and throw it away when another is opened.

Create `js/loader.js`:

```js
// Getting a model into the scene. A model arrives as a file's worth of bytes, from the server (the samples) or from the person's own computer
// (a file they pick or drop on the page). Babylon.js loads it into an *asset container*: a box that holds everything the file had (meshes,
// materials, skeletons, clips) *without* putting any of it in the scene yet. That is the right first step for a lab, because the lab
// can look at what is in the box, and decide what to do with it. See ../tests/loader.tests.js.

// Whether some bytes are a GLB file. A GLB begins with the four letters "glTF"; checking that gives a clear message for the commonest
// mistake (a picture, or an FBX, picked by accident) instead of an error from deep inside the loader.
function looksLikeGlb(buffer) {
  if (!buffer || buffer.byteLength < 12) return false;
  return new TextDecoder().decode(new Uint8Array(buffer, 0, 4)) === "glTF";
}

// The bytes of a model: from an address (a string) or from a File the person chose.
async function readBytes(source) {
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`The model could not be fetched (${response.status}).`);
    return response.arrayBuffer();
  }
  return source.arrayBuffer();
}

// The name to show for a model: the file's name without the folders or the ending.
function modelName(source) {
  const full = typeof source === "string" ? source : source.name;
  return full.split(/[\\/]/).pop().split("?")[0].replace(/\.[^.]*$/, "");
}

// Loads a model into a container. It gives back { container, info } where info is { name, bytes }. Nothing is in the scene until
// showModel is called. A file that is not a GLB is refused with a sentence that says what to do.
async function loadModelFile(scene, source) {
  const buffer = await readBytes(source);
  if (!looksLikeGlb(buffer)) throw new Error("That does not look like a GLB file. GLB (and glTF) models work here: FBX and OBJ files do not.");
  const url = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, undefined, scene, null, ".glb");
    return { container, info: { name: modelName(source), bytes: buffer.byteLength } };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Puts a loaded model in the scene, still. (A model that has clips starts playing the first one when it is added, which is not what a
// person who has only just opened a file wants to see.)
function showModel(container) {
  container.addAllToScene();
  container.animationGroups.forEach((group) => group.stop());
  return container;
}

// Takes a model out of the scene and throws it away, so that the next one has the stage to itself.
function removeModel(container) {
  container.removeAllFromScene();
  container.dispose();
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { looksLikeGlb, readBytes, modelName, loadModelFile, showModel, removeModel };
} else {
  Object.assign(window, { looksLikeGlb, readBytes, modelName, loadModelFile, showModel, removeModel });
}
```

Then `tests/loader.tests.js`. These load the **real models** from `assets/characters/`, with a `NullEngine` (an engine that does everything except draw, which is how the tests run with no graphics):

```js
// The models that come with the lab, as the tests find them from tests.html.
const FIRE = "../assets/characters/fire.glb";
const HEAVY = "../assets/characters/heavy.glb";

QUnit.module("looksLikeGlb", () => {
  QUnit.test("a GLB begins with the letters glTF", (assert) => {
    const bytes = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 12, 0, 0, 0]);
    assert.true(looksLikeGlb(bytes.buffer));
  });

  QUnit.test("a picture, an empty file and nothing are not", (assert) => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13]);
    assert.false(looksLikeGlb(png.buffer));
    assert.false(looksLikeGlb(new ArrayBuffer(0)));
    assert.false(looksLikeGlb(null));
  });
});

QUnit.module("modelName", () => {
  QUnit.test("is the file's name without the folders or the ending", (assert) => {
    assert.strictEqual(modelName("../assets/characters/fire.glb"), "fire");
    assert.strictEqual(modelName({ name: "My Knight.final.glb" }), "My Knight.final");
    assert.strictEqual(modelName("a/b/c.glb?cache=1"), "c");
  });
});

QUnit.module("loadModelFile", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("loads a model into a container and says how big the file was", async (assert) => {
    const { container, info } = await loadModelFile(scene, FIRE);
    assert.strictEqual(info.name, "fire");
    assert.ok(info.bytes > 1000000);
    assert.ok(container.meshes.length > 0);
  });

  QUnit.test("puts nothing in the scene until it is shown", async (assert) => {
    const before = scene.meshes.length;
    const { container } = await loadModelFile(scene, HEAVY);
    assert.strictEqual(scene.meshes.length, before);
    showModel(container);
    assert.ok(scene.meshes.length > before);
  });

  QUnit.test("a model that is shown is still: no clip plays", async (assert) => {
    const { container } = await loadModelFile(scene, FIRE);
    showModel(container);
    assert.ok(container.animationGroups.length > 0);
    for (const group of container.animationGroups) assert.notOk(group.isStarted, group.name);
  });

  QUnit.test("removing a model leaves the scene as it was", async (assert) => {
    const before = scene.meshes.length;
    const { container } = await loadModelFile(scene, HEAVY);
    showModel(container);
    removeModel(container);
    assert.strictEqual(scene.meshes.length, before);
  });

  QUnit.test("a file that is not a GLB is refused with a sentence that says what works", async (assert) => {
    const file = new File([new Uint8Array(100)], "picture.png");
    try {
      await loadModelFile(scene, file);
      assert.ok(false, "it should have been refused");
    } catch (error) {
      assert.ok(/GLB/.test(error.message));
    }
  });

  QUnit.test("a file picked from the computer loads like one from the server", async (assert) => {
    const bytes = await (await fetch(HEAVY)).arrayBuffer();
    const { container, info } = await loadModelFile(scene, new File([bytes], "my heavy.glb"));
    assert.strictEqual(info.name, "my heavy");
    assert.strictEqual(info.bytes, bytes.byteLength);
    assert.ok(container.skeletons.length > 0);
  });

  QUnit.test("an address that is not there is an error with a sentence", async (assert) => {
    try {
      await loadModelFile(scene, "../assets/characters/nothing.glb");
      assert.ok(false, "it should have failed");
    } catch (error) {
      assert.ok(/fetched/.test(error.message));
    }
  });
});
```

Open `tests.html`: **25 passing tests**, 10 of them new.

## Step 3: Looking inside (`inspect.js`)

A loaded model is a tangle of live Babylon.js objects. This file asks them questions and writes down the answers as **plain data**: a list of meshes with their sizes, a list of materials with their pictures, the skeletons, the clips, and the box that holds it all. That is a design choice worth noticing: the screen shows a *description*, and the tests check a *description*, and neither one has to touch a live object. Later steps will add to the description (the bones, which clips fit which skeleton) without changing how it is shown.

Some of the questions have answers that are less obvious than they look:

- **Triangles** are not stored: a mesh stores a long list of "which vertices make a triangle", called its *indices*, three to a triangle, so the number of triangles is that list's length divided by three.
- **Seconds** are not stored either: a clip counts *frames*, and has a *frame rate*, so its length is frames divided by that rate.
- **The size of the model** is a *bounding box* of the whole hierarchy: a model is a tree (a root, with things inside it, some of them scaled), and the box has to be measured with every position, rotation and scale added up. Notice that the measure comes out in **world units**: the lab's characters are made in centimetres and have a root that is scaled by 0.01 to turn them into metres, so they measure as about 1.8 tall, and `guessUnits` says "metres".

Create `js/inspect.js`:

```js
// Looking inside a model. A loaded model is a tangle of Babylon.js objects; this file asks them questions and writes down the answers as plain
// data (a list of meshes with their sizes, a list of materials with their pictures, the skeletons, the clips, the box that holds it all), so that
// what the screen shows, and what the tests check, is a description and not a pile of live objects. See ../tests/inspect.tests.js.

// How many triangles a mesh has. A triangle is three points, and a mesh stores a list of the points that make triangles ("indices"), so
// the number of triangles is a third of the length of the list.
function triangleCount(mesh) {
  return Math.floor(mesh.getTotalIndices() / 3);
}

// What a mesh is, as data: its name, how many points (vertices) and triangles, whether it is *skinned* (bound to a skeleton, so that it
// bends when the bones move) and what it is covered with. A mesh that is a copy of another has no points of its own.
function describeMesh(mesh) {
  return {
    name: mesh.name,
    vertices: mesh.getTotalVertices(),
    triangles: triangleCount(mesh),
    skinned: !!mesh.skeleton,
    material: mesh.material ? mesh.material.name : null,
    visible: mesh.isVisible,
  };
}

// The pictures that a material uses, as data: [{ name, width, height }]. (The material says which it has; the texture says its own size.)
function describeTextures(material) {
  return material.getActiveTextures().map((texture) => {
    const size = texture.getSize();
    return { name: texture.name, width: size.width, height: size.height };
  });
}

// What a material is: its name, what kind of material it is (a PBR material is the realistic, physically based kind that glTF files use), and
// its pictures.
function describeMaterial(material) {
  return { name: material.name, kind: material.getClassName(), textures: describeTextures(material) };
}

// A skeleton as data: its name and how many bones it has.
function describeSkeleton(skeleton) {
  return { name: skeleton.name, bones: skeleton.bones.length };
}

// A clip (an animation group) as data: its name and how long it is, in seconds. A clip counts its frames, and the frames have a
// rate, so seconds are frames divided by the rate.
function describeClip(group) {
  const rate = group.targetedAnimations.length > 0 ? group.targetedAnimations[0].animation.framePerSecond : 60;
  return { name: group.name, seconds: (group.to - group.from) / rate, tracks: group.targetedAnimations.length };
}

// The box that holds a model, in world units: { min, max, size }. A model has a hierarchy (a root, and things inside it, some scaled), so the
// box is worked out over the whole of it with every transform up to date.
function measureModel(rootNodes) {
  const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  for (const root of rootNodes) {
    root.computeWorldMatrix(true);
    root.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    const box = root.getHierarchyBoundingVectors(true);
    min.minimizeInPlace(box.min);
    max.maximizeInPlace(box.max);
  }
  return { min, max, size: max.subtract(min) };
}

// Everything about a loaded model, as data. `container` is what the loader made (see loader.js), and `info` says where it came from: { name, bytes }.
function describeModel(container, info = {}) {
  const meshes = container.meshes.filter((mesh) => mesh.getTotalVertices() > 0).map(describeMesh);
  const materials = container.materials.map(describeMaterial);
  const bounds = measureModel(container.rootNodes);
  const textures = new Map();
  for (const material of materials) for (const texture of material.textures) textures.set(texture.name, texture);
  return {
    name: info.name || "a model",
    bytes: info.bytes ?? null,
    meshes,
    materials,
    textures: [...textures.values()],
    skeletons: container.skeletons.map(describeSkeleton),
    clips: container.animationGroups.map(describeClip),
    totals: {
      vertices: meshes.reduce((sum, mesh) => sum + mesh.vertices, 0),
      triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
    },
    size: { x: bounds.size.x, y: bounds.size.y, z: bounds.size.z },
    bounds,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { triangleCount, describeMesh, describeTextures, describeMaterial, describeSkeleton, describeClip, measureModel, describeModel };
} else {
  Object.assign(window, { triangleCount, describeMesh, describeTextures, describeMaterial, describeSkeleton, describeClip, measureModel, describeModel });
}
```

Then `tests/inspect.tests.js`. The first group checks the real models (one skinned mesh, 24 bones, twelve clips), the second checks the small pieces against shapes that are easy to count (a box is twelve triangles):

```js
QUnit.module("describeModel, of the real models", (hooks) => {
  let engine, scene, fire, heavy;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    const a = await loadModelFile(scene, "../assets/characters/fire.glb");
    const b = await loadModelFile(scene, "../assets/characters/heavy.glb");
    fire = describeModel(a.container, a.info);
    heavy = describeModel(b.container, b.info);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("knows where it came from", (assert) => {
    assert.strictEqual(fire.name, "fire");
    assert.ok(fire.bytes > 1000000);
  });

  QUnit.test("finds the one skinned mesh of a character, with a material", (assert) => {
    const skinned = fire.meshes.filter((mesh) => mesh.skinned);
    assert.strictEqual(skinned.length, 1);
    assert.ok(skinned[0].triangles > 1000);
    assert.ok(skinned[0].material);
  });

  QUnit.test("counts the bones of the skeleton", (assert) => {
    assert.strictEqual(fire.skeletons.length, 1);
    assert.ok(fire.skeletons[0].bones >= 24);
  });

  QUnit.test("lists the clips with names and lengths in seconds", (assert) => {
    assert.strictEqual(fire.clips.length, 12);
    assert.ok(fire.clips.some((clip) => /run/i.test(clip.name)));
    for (const clip of fire.clips) assert.ok(clip.seconds > 0 && clip.seconds < 60, clip.name);
    assert.strictEqual(heavy.clips.length, 4);
  });

  QUnit.test("finds a material and the pictures on it, with their sizes", (assert) => {
    assert.strictEqual(fire.materials.length, 1);
    assert.strictEqual(fire.textures.length, 3);
    for (const texture of fire.textures) assert.ok(texture.width > 0 && texture.height > 0, texture.name);
  });

  QUnit.test("the totals are the sums over the meshes", (assert) => {
    assert.strictEqual(fire.totals.triangles, fire.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0));
    assert.ok(fire.totals.vertices > 0);
  });

  QUnit.test("measures a person the size of a person, once the file's scale is counted", (assert) => {
    const units = guessUnits(fire.size.y);
    assert.true(units.sure);
    const metres = heightInMetres(fire.size.y);
    assert.ok(metres > 1 && metres < 2.6, `${metres} m`);
  });

  QUnit.test("a character is taller than it is wide", (assert) => {
    assert.ok(fire.size.y > fire.size.x);
  });
});

QUnit.module("describeMesh, triangleCount, measureModel", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a box has eight corners that are drawn as twenty-four vertices and twelve triangles", (assert) => {
    const mesh = BABYLON.MeshBuilder.CreateBox("crate", { size: 1 }, scene);
    assert.strictEqual(triangleCount(mesh), 12);
    const described = describeMesh(mesh);
    assert.strictEqual(described.vertices, 24);
    assert.false(described.skinned);
    assert.strictEqual(described.material, null);
  });

  QUnit.test("measureModel boxes a model that is moved and scaled", (assert) => {
    const root = new BABYLON.TransformNode("root", scene);
    const mesh = BABYLON.MeshBuilder.CreateBox("crate", { size: 1 }, scene);
    mesh.parent = root;
    root.scaling.setAll(10);
    root.position.y = 5;
    const bounds = measureModel([root]);
    assert.ok(Math.abs(bounds.size.x - 10) < 1e-6);
    assert.ok(Math.abs(bounds.min.y - 0) < 1e-6);
  });
});
```

Open `tests.html`: **35 passing tests**, 10 of them new.

## Step 4: Pointing the camera (`frame.js`)

Models come in every size: a mouse, a person, a castle. If the camera is in the same place for all of them, most are a dot or a wall of colour. The rule is: take the sphere that holds the model's box, and stand back far enough that the sphere fits in the picture, whichever way (tall or wide) the picture is narrower.

A camera's **field of view** is how wide an angle it sees, and it is given *top to bottom*. On a phone held upright, the picture is taller than it is wide, so the angle *across* it is smaller, and that is the one that has to fit. That is the `Math.min(aspect, 1)` in the middle of the function. Without it, a model that fills a desktop window is cut off the sides on a phone.

Create `js/frame.js`:

```js
// Pointing the camera at a model. Models come in every size (a mouse, a person, a castle) and the camera has to be put at the right distance
// for each, or the model is a dot or a wall of colour. The rule: find the sphere that holds the model's box, and stand back far enough
// that the sphere fits in the picture, whichever way (tall or wide) the picture is the narrower. See ../tests/frame.tests.js.

// Where to put an orbit camera so that a box fits in view. `bounds` is { min, max } (Vector3s), `fov` is the camera's field of view
// from top to bottom, in radians, and `aspect` is the picture's width divided by its height.
// It gives back what the camera needs: the point to look at, how far to stand, and how near and far it can see.
function framingFor(bounds, fov, aspect) {
  const center = bounds.min.add(bounds.max).scale(0.5);
  const radius = Math.max(bounds.max.subtract(bounds.min).length() / 2, 0.001);
  // The field of view across the picture is narrower than the one down it when the picture is taller than wide.
  const sideways = 2 * Math.atan(Math.tan(fov / 2) * Math.min(aspect, 1));
  const narrow = Math.min(fov, sideways);
  const distance = (radius / Math.sin(narrow / 2)) * 1.1;
  return { target: center, radius: distance, near: distance / 100, far: distance * 100, size: radius * 2 };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { framingFor };
} else {
  Object.assign(window, { framingFor });
}
```

Then `tests/frame.tests.js`:

```js
const boxOf = (min, max) => ({ min: new BABYLON.Vector3(...min), max: new BABYLON.Vector3(...max) });

QUnit.module("framingFor", () => {
  const fov = 0.8;

  QUnit.test("looks at the middle of the box", (assert) => {
    const framing = framingFor(boxOf([-1, 0, -1], [1, 2, 1]), fov, 1.6);
    assert.deepEqual([framing.target.x, framing.target.y, framing.target.z], [0, 1, 0]);
  });

  QUnit.test("stands further back from a bigger model, in the same proportion", (assert) => {
    const small = framingFor(boxOf([0, 0, 0], [1, 1, 1]), fov, 1.6);
    const big = framingFor(boxOf([0, 0, 0], [10, 10, 10]), fov, 1.6);
    assert.ok(Math.abs(big.radius / small.radius - 10) < 1e-9);
  });

  QUnit.test("the whole box fits: the distance is more than the sphere that holds it", (assert) => {
    const framing = framingFor(boxOf([0, 0, 0], [2, 2, 2]), fov, 1.6);
    const sphere = Math.sqrt(12) / 2;
    assert.ok(framing.radius > sphere);
  });

  QUnit.test("a picture that is taller than wide needs more distance", (assert) => {
    const wide = framingFor(boxOf([0, 0, 0], [1, 2, 1]), fov, 1.6);
    const tall = framingFor(boxOf([0, 0, 0], [1, 2, 1]), fov, 0.5);
    assert.ok(tall.radius > wide.radius);
  });

  QUnit.test("sees from a small part of the distance to a great many times it", (assert) => {
    const framing = framingFor(boxOf([0, 0, 0], [180, 180, 180]), fov, 1.6);
    assert.ok(framing.near < framing.radius / 10);
    assert.ok(framing.far > framing.radius * 10);
  });

  QUnit.test("a box with no size (a single point) still gives a distance that works", (assert) => {
    const framing = framingFor(boxOf([1, 1, 1], [1, 1, 1]), fov, 1.6);
    assert.ok(framing.radius > 0 && Number.isFinite(framing.radius));
  });
});
```

Open `tests.html`: **41 passing tests**, 6 of them new.

## Step 5: The stage (`viewer.js`)

The stage is a camera that orbits the model, some light, a floor grid to judge the model's size by, and **view options**: ways of looking that a person can switch on and off. Each one tells you something:

| Option | What it shows you |
|--------|-------------------|
| **Floor grid** | How big the model is: count the squares. It is sized to the model, so there are always about ten lines each way |
| **Axes** | Which way is which: the red line is x, green is y (up), blue is z. When you attach a sword to a hand later, you will need to know. |
| **Wireframe** | The triangles themselves, drawn as lines. Where they are close together, the model is detailed. |
| **Box around the model** | The bounding box of Step 3, drawn. |
| **Turntable** | The camera drifts around the model slowly, hands-free |

The options are **a table** (`VIEW_OPTIONS`), and the panel in Step 7 makes one switch for each row of it. Add an option and it has a switch, with no other change.

The floor grid is drawn from a list of lines made by `gridLines`, which is plain arithmetic and so can be tested.

Create `js/viewer.js`:

```js
// The stage the model stands on: a camera that orbits it, some light, a floor grid to judge its size by, and the view options (axes, wireframe,
// the box around it, a turntable) that let a person look at a model in different ways. See ../tests/viewer.tests.js.

// The lines of a floor grid as a list of lines, each a list of two [x, y, z] points. `half` is how far the grid reaches from the middle on each side
// and `step` is the gap between lines. The two lines through the middle are the axes' places, so they are the ones that are drawn in a
// different colour, which is why they come back separately.
function gridLines(half, step) {
  const lines = [];
  const count = Math.round(half / step);
  for (let i = -count; i <= count; i++) {
    const at = i * step;
    lines.push({ axis: i === 0, points: [[at, 0, -half], [at, 0, half]] });
    lines.push({ axis: i === 0, points: [[-half, 0, at], [half, 0, at]] });
  }
  return lines;
}

// How big a grid to draw for a model that is `size` across: a few times the model, rounded up to a whole number of metres, with
// a gap that keeps the lines to about ten on each side, so that they are a scale that a person can count.
function gridFor(size) {
  const half = Math.max(1, Math.ceil(size * 1.5));
  return { half, step: half <= 5 ? 0.5 : Math.ceil(half / 10) };
}

// The things a person can switch on and off. One table: the panel makes a switch for each, and the viewer reads each. `on` is how it begins.
const VIEW_OPTIONS = [
  { id: "grid", label: "Floor grid", on: true },
  { id: "axes", label: "Axes (red x, green y, blue z)", on: false },
  { id: "wireframe", label: "Wireframe (show the triangles)", on: false },
  { id: "bounds", label: "Box around the model", on: false },
  { id: "spin", label: "Turntable (spin slowly)", on: false },
];

// The viewer. It makes the camera, the lights and the floor, and gives back what the page needs to steer them.
function createViewer(scene, canvas) {
  const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2.4, Math.PI / 2.5, 5, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.wheelPrecision = 30;
  camera.panningSensibility = 400;
  camera.lowerRadiusLimit = 0.05;

  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.8;
  sky.groundColor = new BABYLON.Color3(0.25, 0.25, 0.3);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, -0.6), scene);
  sun.intensity = 0.9;
  scene.clearColor = new BABYLON.Color4(0.09, 0.1, 0.13, 1);

  const state = Object.fromEntries(VIEW_OPTIONS.map((option) => [option.id, option.on]));
  let grid = null;
  let axes = null;
  let box = null;
  let current = null;

  const drawGrid = (size) => {
    if (grid) grid.dispose();
    const { half, step } = gridFor(size);
    const lines = gridLines(half, step);
    grid = BABYLON.MeshBuilder.CreateLineSystem(
      "grid",
      {
        lines: lines.map((line) => line.points.map((p) => new BABYLON.Vector3(...p))),
        colors: lines.map((line) => {
          const color = line.axis ? new BABYLON.Color4(0.5, 0.55, 0.7, 1) : new BABYLON.Color4(0.28, 0.3, 0.38, 1);
          return [color, color];
        }),
      },
      scene
    );
    grid.isPickable = false;
    grid.setEnabled(state.grid);
  };

  const apply = () => {
    if (grid) grid.setEnabled(state.grid);
    if (axes) axes.dispose();
    axes = state.axes ? new BABYLON.AxesViewer(scene, Math.max(0.5, (current ? current.size : 1) * 0.4)) : null;
    if (box) box.dispose();
    box = null;
    if (state.bounds && current) {
      const size = current.bounds.max.subtract(current.bounds.min);
      box = BABYLON.MeshBuilder.CreateBox("bounds", { width: size.x, height: size.y, depth: size.z }, scene);
      box.position = current.bounds.min.add(current.bounds.max).scale(0.5);
      box.material = new BABYLON.StandardMaterial("boundsMaterial", scene);
      box.material.wireframe = true;
      box.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2);
      box.material.disableLighting = true;
      box.isPickable = false;
    }
    for (const mesh of scene.meshes) {
      if (mesh === grid || mesh === box || (axes && mesh.name.startsWith("axis"))) continue;
      if (mesh.material && mesh.name !== "bounds") mesh.material.wireframe = state.wireframe;
    }
    camera.useAutoRotationBehavior = state.spin;
    if (state.spin && camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.4;
  };

  drawGrid(2);
  apply();

  return {
    camera,
    state,
    // Turn a view option on or off.
    set(id, value) {
      if (!Object.hasOwn(state, id)) return;
      state[id] = !!value;
      apply();
    },
    // Aim the camera at a model's box (see frame.js), and size the grid to it.
    frame(bounds) {
      const framing = framingFor(bounds, camera.fov, engineAspect(scene, camera));
      current = { bounds, size: framing.size };
      camera.setTarget(framing.target);
      camera.radius = framing.radius;
      camera.upperRadiusLimit = framing.radius * 20;
      camera.minZ = framing.near;
      camera.maxZ = framing.far;
      camera.wheelPrecision = 30 / Math.max(framing.radius, 0.1);
      drawGrid(framing.size);
      apply();
    },
    // Called when a model comes or goes, so that the options (wireframe, the box) are applied to what is there now.
    refresh: apply,
  };
}

// The picture's width over its height, with a sensible answer when there is no engine yet (as in a test).
function engineAspect(scene, camera) {
  const engine = scene.getEngine();
  return engine && engine.getRenderWidth() > 0 ? engine.getAspectRatio(camera) : 1;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { gridLines, gridFor, VIEW_OPTIONS, createViewer, engineAspect };
} else {
  Object.assign(window, { gridLines, gridFor, VIEW_OPTIONS, createViewer, engineAspect });
}
```

Then `tests/viewer.tests.js`:

```js
QUnit.module("gridLines", () => {
  QUnit.test("makes a line each way for every step, from one side to the other", (assert) => {
    const lines = gridLines(2, 1);
    assert.strictEqual(lines.length, 10);
    assert.deepEqual(lines[0].points, [[-2, 0, -2], [-2, 0, 2]]);
  });

  QUnit.test("marks the two lines through the middle as the axes", (assert) => {
    const lines = gridLines(3, 1);
    assert.strictEqual(lines.filter((line) => line.axis).length, 2);
  });

  QUnit.test("every line lies on the floor", (assert) => {
    for (const line of gridLines(4, 0.5)) for (const point of line.points) assert.strictEqual(point[1], 0);
  });
});

QUnit.module("gridFor", () => {
  QUnit.test("reaches further than the model, and is never smaller than a metre", (assert) => {
    assert.ok(gridFor(2).half >= 3);
    assert.strictEqual(gridFor(0.1).half, 1);
  });

  QUnit.test("keeps the number of lines a person can count", (assert) => {
    for (const size of [0.5, 2, 20, 200, 2000]) {
      const { half, step } = gridFor(size);
      assert.ok(half / step <= 12, `size ${size}`);
    }
  });
});

QUnit.module("VIEW_OPTIONS", () => {
  QUnit.test("each has an id, a label and a starting state, and no two ids match", (assert) => {
    const ids = VIEW_OPTIONS.map((option) => option.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const option of VIEW_OPTIONS) {
      assert.strictEqual(typeof option.id, "string");
      assert.strictEqual(typeof option.label, "string");
      assert.strictEqual(typeof option.on, "boolean");
    }
  });
});

QUnit.module("createViewer", (hooks) => {
  let engine, scene, viewer;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    viewer = createViewer(scene, null);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("begins with the options as the table says", (assert) => {
    for (const option of VIEW_OPTIONS) assert.strictEqual(viewer.state[option.id], option.on, option.id);
  });

  QUnit.test("makes the grid when the grid is on, and hides it when it is switched off", (assert) => {
    const grid = scene.getMeshByName("grid");
    assert.ok(grid.isEnabled());
    viewer.set("grid", false);
    assert.notOk(grid.isEnabled());
  });

  QUnit.test("ignores an option that is not in the table", (assert) => {
    viewer.set("toString", true);
    viewer.set("nothing", true);
    assert.notOk(Object.hasOwn(viewer.state, "nothing"));
    assert.notOk(Object.hasOwn(viewer.state, "toString"));
  });

  QUnit.test("framing a box aims the camera at it and stands back from it", (assert) => {
    viewer.frame({ min: new BABYLON.Vector3(-1, 0, -1), max: new BABYLON.Vector3(1, 2, 1) });
    assert.ok(Math.abs(viewer.camera.target.y - 1) < 1e-9);
    assert.ok(viewer.camera.radius > 2);
  });

  QUnit.test("the box around the model is made when it is switched on, and removed when it is switched off", (assert) => {
    viewer.frame({ min: new BABYLON.Vector3(-1, 0, -1), max: new BABYLON.Vector3(1, 2, 1) });
    viewer.set("bounds", true);
    assert.ok(scene.getMeshByName("bounds"));
    viewer.set("bounds", false);
    assert.notOk(scene.getMeshByName("bounds"));
  });
});
```

Open `tests.html`: **52 passing tests**, 11 of them new.

## Step 6: The panel (`panel.js`)

The panel is built from the description that Step 3 makes: data in, page out. It has a collapsible section (a `<details>` element) for each kind of thing in the model.

**It never uses `innerHTML`.** Every piece of text goes on the page with `textContent`, which shows the letters it is given and nothing else. The reason is that **a model's names come from a file that someone else made**. A mesh called `<img src=x onerror=alert(1)>` is a legal name, and putting it on the page as HTML would run it. With `textContent` it is shown as the odd name that it is. The test for this uses exactly that name. A tool that opens files from strangers has to be built this way from the start.

Create `js/panel.js`:

```js
// The panel that says what is in the model. It is built from the description that inspect.js makes (data in, page out), and it only ever puts
// text on the page with textContent, never as HTML, because a model's names (a mesh, a material, a clip) come from a file that someone else
// made, and a name like "<img onerror=...>" must show as those letters and not run. See ../tests/panel.tests.js.

// Makes an element with some text and, if given, a class.
function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

// A table of rows: `header` is a list of column titles and `rows` a list of lists of cells (text or numbers).
function makeTable(header, rows) {
  const table = el("table", null, "grid");
  const head = el("tr");
  header.forEach((title) => head.append(el("th", title)));
  table.append(head);
  for (const row of rows) {
    const line = el("tr");
    row.forEach((cell) => line.append(el("td", cell)));
    table.append(line);
  }
  return table;
}

// A collapsible section: a title (with a count if there is one) that opens to show what is inside.
function makeSection(title, count, body, open = false) {
  const details = el("details");
  details.open = open;
  details.append(el("summary", count === null ? title : `${title} (${count})`));
  details.append(body);
  return details;
}

// One line of facts: a label and a value.
function makeFact(label, value) {
  const row = el("div", null, "fact");
  row.append(el("span", label, "label"), el("span", value, "value"));
  return row;
}

// The sections of the panel for a model, from its description. This is a list of { title, count, body } so that tests can look at what is
// said without caring how it is laid out.
function sectionsFor(model) {
  const units = guessUnits(model.size.y);
  const facts = el("div");
  facts.append(
    makeFact("File size", model.bytes === null ? "unknown" : formatBytes(model.bytes)),
    makeFact("Triangles", formatCount(model.totals.triangles)),
    makeFact("Vertices", formatCount(model.totals.vertices)),
    makeFact("Size (file units)", formatSize(model.size, "")),
    makeFact("Units", units.sure ? `probably ${units.name}` : "cannot tell"),
    makeFact("Height", units.sure ? `about ${heightInMetres(model.size.y).toFixed(2)} m` : "unknown"),
    makeFact("Skeletons", String(model.skeletons.length)),
    makeFact("Clips", String(model.clips.length))
  );
  return [
    { title: "Summary", count: null, body: facts, open: true },
    {
      title: "Meshes",
      count: model.meshes.length,
      body: makeTable(["Name", "Vertices", "Triangles", "Skinned", "Material"], model.meshes.map((m) => [m.name, formatCount(m.vertices), formatCount(m.triangles), m.skinned ? "yes" : "no", m.material || "none"])),
    },
    {
      title: "Materials",
      count: model.materials.length,
      body: makeTable(["Name", "Kind", "Pictures"], model.materials.map((m) => [m.name, m.kind, m.textures.map((t) => `${t.width}x${t.height}`).join(", ") || "none"])),
    },
    {
      title: "Skeletons",
      count: model.skeletons.length,
      body: makeTable(["Name", "Bones"], model.skeletons.map((s) => [s.name, s.bones])),
    },
    {
      title: "Animation clips",
      count: model.clips.length,
      body: makeTable(["Name", "Length", "Tracks"], model.clips.map((c) => [c.name, formatSeconds(c.seconds), c.tracks])),
    },
  ];
}

// The inspector: it fills a container with the sections for a model, or with a message.
class Inspector {
  constructor(container) {
    this.container = container;
  }

  // Says something instead of the sections (a model is loading, or something went wrong).
  message(text, isError = false) {
    this.container.replaceChildren(el("p", text, isError ? "message error" : "message"));
  }

  // Shows what is in a model.
  show(model) {
    const heading = el("h2", model.name);
    this.container.replaceChildren(heading, ...sectionsFor(model).map((section) => makeSection(section.title, section.count, section.body, section.open)));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { el, makeTable, makeSection, makeFact, sectionsFor, Inspector };
} else {
  Object.assign(window, { el, makeTable, makeSection, makeFact, sectionsFor, Inspector });
}
```

Then `tests/panel.tests.js`:

```js
// A description like the one that describeModel makes, written out, so that the panel can be tested without loading anything.
const MODEL = {
  name: "<img src=x onerror=alert(1)>",
  bytes: 2048,
  meshes: [{ name: "body", vertices: 1500, triangles: 3000, skinned: true, material: "skin", visible: true }],
  materials: [{ name: "skin", kind: "PBRMaterial", textures: [{ name: "color", width: 1024, height: 512 }] }],
  textures: [{ name: "color", width: 1024, height: 512 }],
  skeletons: [{ name: "rig", bones: 24 }],
  clips: [{ name: "Walk", seconds: 1.25, tracks: 48 }],
  totals: { vertices: 1500, triangles: 3000 },
  size: { x: 0.9, y: 1.8, z: 0.4 },
};

QUnit.module("el", () => {
  QUnit.test("makes an element with text and a class", (assert) => {
    const element = el("p", "hello", "big");
    assert.strictEqual(element.tagName, "P");
    assert.strictEqual(element.textContent, "hello");
    assert.strictEqual(element.className, "big");
  });

  QUnit.test("text that looks like HTML stays text", (assert) => {
    const element = el("p", "<b>bold</b>");
    assert.strictEqual(element.children.length, 0);
    assert.strictEqual(element.textContent, "<b>bold</b>");
  });
});

QUnit.module("makeTable", () => {
  QUnit.test("has a header row and a row for each row of cells", (assert) => {
    const table = makeTable(["A", "B"], [[1, 2], [3, 4], [5, 6]]);
    assert.strictEqual(table.rows.length, 4);
    assert.strictEqual(table.rows[0].cells[1].textContent, "B");
    assert.strictEqual(table.rows[3].cells[0].textContent, "5");
  });
});

QUnit.module("sectionsFor", () => {
  QUnit.test("has a section for each thing in the model, in order", (assert) => {
    assert.deepEqual(sectionsFor(MODEL).map((section) => section.title), ["Summary", "Meshes", "Materials", "Skeletons", "Animation clips"]);
  });

  QUnit.test("each section says how many there are", (assert) => {
    const counts = Object.fromEntries(sectionsFor(MODEL).map((section) => [section.title, section.count]));
    assert.strictEqual(counts.Meshes, 1);
    assert.strictEqual(counts.Skeletons, 1);
    assert.strictEqual(counts["Animation clips"], 1);
  });

  QUnit.test("the summary gives the units and the height in metres", (assert) => {
    const text = sectionsFor(MODEL)[0].body.textContent;
    assert.ok(/metres/.test(text));
    assert.ok(/1\.80 m/.test(text));
  });

  QUnit.test("a model whose size is a puzzle says it cannot tell", (assert) => {
    const odd = { ...MODEL, size: { x: 30, y: 20, z: 30 } };
    assert.ok(/cannot tell/.test(sectionsFor(odd)[0].body.textContent));
  });
});

QUnit.module("Inspector", () => {
  QUnit.test("shows the model's name as text, never as HTML", (assert) => {
    const container = document.createElement("div");
    new Inspector(container).show(MODEL);
    assert.strictEqual(container.querySelector("h2").textContent, MODEL.name);
    assert.strictEqual(container.querySelector("img"), null);
  });

  QUnit.test("shows a section for each part, and the first is open", (assert) => {
    const container = document.createElement("div");
    new Inspector(container).show(MODEL);
    const sections = container.querySelectorAll("details");
    assert.strictEqual(sections.length, 5);
    assert.true(sections[0].open);
    assert.false(sections[1].open);
  });

  QUnit.test("a message replaces what was there, and an error is marked", (assert) => {
    const container = document.createElement("div");
    const inspector = new Inspector(container);
    inspector.show(MODEL);
    inspector.message("Went wrong", true);
    assert.strictEqual(container.children.length, 1);
    assert.true(container.firstChild.classList.contains("error"));
  });
});
```

Open `tests.html`: **62 passing tests**, 10 of them new. That is all of them.

## Step 7: The page (`main.js`, and the styles)

Everything is ready, and `main.js` puts it together: it makes the engine and the scene, the viewer and the panel; builds the list of samples from a table (`SAMPLES`); and opens a model from three places: the list, the file button, or a file dropped on the page. Every open goes through one function, `openModel`, which loads, replaces what was on the stage, frames the camera, and tells the panel. If anything goes wrong (a wrong kind of file, a missing one) the panel says so, in a sentence.

Create `js/main.js`:

```js
// The Model Lab page: a stage with a model on it, and a panel that says what is in the model. A model comes from the list of samples, from a
// file that the person picks, or from a file that they drop on the page.
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });

// The models that come with the lab. One table: the list on the page is made from it.
const SAMPLES = [
  { label: "Fire bender", file: "../assets/characters/fire.glb" },
  { label: "Air bender", file: "../assets/characters/air.glb" },
  { label: "Heavy enemy", file: "../assets/characters/heavy.glb" },
];

const scene = new BABYLON.Scene(engine);
const viewer = createViewer(scene, canvas);
const inspector = new Inspector(document.getElementById("inspector"));
const picker = document.getElementById("sample");
const options = document.getElementById("options");

let current = null;

// Replaces the model on the stage with a new one, and says what is in it.
async function openModel(source) {
  inspector.message("Loading...");
  try {
    const { container, info } = await loadModelFile(scene, source);
    if (current) removeModel(current);
    current = showModel(container);
    const model = describeModel(container, info);
    viewer.frame(model.bounds);
    viewer.refresh();
    inspector.show(model);
  } catch (error) {
    console.error(error);
    inspector.message(error.message, true);
  }
}

// The list of samples, and the file picker.
SAMPLES.forEach((sample, index) => picker.append(new Option(sample.label, String(index))));
picker.addEventListener("change", () => openModel(SAMPLES[Number(picker.value)].file));
document.getElementById("file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) openModel(file);
  event.target.value = "";
});

// Dropping a file anywhere on the page opens it.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) openModel(file);
});

// A switch for each view option.
for (const option of VIEW_OPTIONS) {
  const label = el("label", null, "option");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = option.on;
  box.addEventListener("change", () => viewer.set(option.id, box.checked));
  label.append(box, el("span", option.label));
  options.append(label);
}

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
openModel(SAMPLES[0].file);
```

Then the two style files. `css/theme.css` names the colours once:

```css
/* The look of the Model Lab: a dark workshop, so that a model's colours are what you notice. The colours and the fonts are named once here,
   and everything else uses the names. */
:root {
  --bg: #171a21; /* the page and the stage */
  --panel: #1f232d; /* the panel beside the stage */
  --panel-edge: #343a48;
  --ink: #e8ebf2; /* text */
  --ink-dim: #9aa3b5; /* labels */
  --accent: #5ab0ff; /* what can be pressed */
  --warn: #ff8a7a; /* what went wrong */
  --font: system-ui, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
}
```

and `css/lab.css` lays the page out: the stage fills the page, the panel floats at the right, and on a narrow screen (a phone) it becomes a sheet at the bottom:

```css
/* The stage fills the page, and the panel floats at the right of it. On a narrow screen the panel is a sheet at the bottom instead. */
body {
  background: var(--bg);
  color: var(--ink);
  font: 14px / 1.4 var(--font);
}
#panel {
  position: fixed;
  top: 56px;
  right: 12px;
  bottom: 12px;
  width: 330px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  box-sizing: border-box;
  overflow-y: auto;
  background: var(--panel);
  border: 1px solid var(--panel-edge);
  border-radius: 10px;
}
#panel h2 {
  margin: 0;
  font-size: 18px;
}
.controls {
  display: grid;
  gap: 8px;
}
.controls select,
.controls .file-button {
  padding: 8px 10px;
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--panel-edge);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}
.controls .file-button:hover,
.controls select:hover {
  border-color: var(--accent);
}
.controls input[type="file"] {
  display: none;
}
.option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-dim);
  cursor: pointer;
}
#inspector {
  display: grid;
  gap: 8px;
}
details {
  border: 1px solid var(--panel-edge);
  border-radius: 6px;
  padding: 6px 10px;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
.fact {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.fact .label {
  color: var(--ink-dim);
}
.fact .value {
  font-family: var(--mono);
  text-align: right;
}
table.grid {
  width: 100%;
  margin-top: 6px;
  border-collapse: collapse;
  font-size: 12px;
}
table.grid th {
  text-align: left;
  color: var(--ink-dim);
  font-weight: 600;
}
table.grid th,
table.grid td {
  padding: 3px 6px 3px 0;
  vertical-align: top;
  word-break: break-word;
}
.message {
  margin: 0;
  color: var(--ink-dim);
}
.message.error {
  color: var(--warn);
}

@media (max-width: 700px), (max-height: 520px) {
  #panel {
    top: auto;
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    max-height: 42vh;
  }
}
```

Open `index.html` through the web server. You should see the fire bender, a floor grid, and a panel with the summary of the model open. Try these:

1. **Look at the numbers.** The summary says the model is about 1.8 m tall, in metres. Open *Animation clips*: twelve of them, with their lengths. Open *Skeletons*: one, with its bones.
2. **Switch the options on one at a time.** The wireframe is the surprise: it shows how many triangles are in a face.
3. **Open the air bender, and then the heavy enemy.** The heavy has only four clips (a walk, a run, and two ways to fall): enemies do not need to punch. Notice that the skeleton has the *same* number of bones in all three. That is not an accident, and it is the whole point of the next tutorials: models that share a skeleton can share animations, and can wear each other's armour.
4. **Open a model of your own.** Click *Open a .glb file...* or drop one on the page. Look at its size and units: does it say metres? If a model of your own says "cannot tell", the lab is telling you something useful: it is not a person's size, or it has something far from the rest.
5. **Open something that is not a model** (a picture, say) and read the message.

## Troubleshooting

| Problem | Likely cause |
|---------|--------------|
| The page is blank and the console says a model could not be fetched | The page is open from the file system. It has to be opened through a web server (`npx serve` in the repo root). |
| The tests say `loadModelFile is not defined` | `loader.js` is empty or has no export block at the bottom |
| The model is tiny, or fills the whole screen | Check `framingFor` in `frame.js`, and that `viewer.frame` is called in `openModel` |
| The model faces away from you | That is how it was made: drag to turn it. (The lab's camera starts in front of the models that come with it.) |
| A switch does nothing | Check that its `id` in `VIEW_OPTIONS` is the same everywhere, and that `viewer.set` is given it |
| The panel shows the letters of some HTML | Something used `innerHTML`. Use `textContent`, in `el` only |

## What you've built

A viewer that opens any GLB and says, in words, what is in it: its size and its units (with the honesty to say when it cannot tell), its meshes, materials and pictures, its skeleton, and its clips. Everything it knows is plain data, built from a container that was looked at before anything was shown.

## Next

The model's **skeleton**. You have seen that it has bones; the next tutorial draws them, names them, and lets you pick one, which is the first step to attaching a sword to a hand.
