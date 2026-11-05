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
