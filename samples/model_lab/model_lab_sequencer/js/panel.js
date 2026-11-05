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
