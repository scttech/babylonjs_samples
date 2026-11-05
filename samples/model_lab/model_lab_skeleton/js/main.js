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
