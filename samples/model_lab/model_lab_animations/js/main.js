// The Model Lab page: a stage with a model on it, a panel that says what is in the model, and (new in this tutorial) its skeleton drawn over it, with a
// list of its bones. A model comes from the list of samples, from a file that the person picks, or from a file that they drop on the page.
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });

// The models that come with the lab. One table: the list on the page is made from it.
const SAMPLES = [
  { label: "Fire bender", file: "../assets/characters/fire.glb" },
  { label: "Air bender", file: "../assets/characters/air.glb" },
  { label: "Heavy enemy", file: "../assets/characters/heavy.glb" },
];

// How far (in pixels) a click can be from a joint and still choose it, and how far the pointer can move between pressing and letting go
// for it still to be a click and not a drag that turns the camera.
const PICK_DISTANCE = 24;
const CLICK_SLOP = 5;

const scene = new BABYLON.Scene(engine);
const viewer = createViewer(scene, canvas);
const inspector = new Inspector(document.getElementById("inspector"));
const skeletonView = new SkeletonView(scene);
const bonePanel = new BoneTree(document.getElementById("bones"), (index) => chooseBone(index));
const playerPanel = new PlayerPanel(document.getElementById("player"));
const picker = document.getElementById("sample");
const options = document.getElementById("options");

let current = null;
let player = null;

// Chooses a bone: it lights up on the model and in the list, and the panel says what it is.
function chooseBone(index) {
  skeletonView.select(index);
  bonePanel.select(index, skeletonView.positions());
}

// Replaces the model on the stage with a new one, and says what is in it.
async function openModel(source) {
  inspector.message("Loading...");
  try {
    const { container, info } = await loadModelFile(scene, source);
    if (player) player.dispose();
    if (current) removeModel(current);
    current = showModel(container);
    player = new ClipPlayer(container.animationGroups);
    playerPanel.show(player);
    const model = describeModel(container, info);
    viewer.frame(model.bounds);
    viewer.refresh();
    inspector.show(model);
    if (container.skeletons.length > 0) {
      const tree = boneTree(container.skeletons[0]);
      skeletonView.show(container.skeletons[0], tree, Math.max(model.size.x, model.size.y, model.size.z));
      bonePanel.show(tree);
    } else {
      skeletonView.clear();
      bonePanel.clear("This model has no skeleton: nothing in it can bend.");
    }
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

// A click on the stage (a press and a letting go that are in nearly the same place) chooses the joint nearest to it, if any is close.
let pressed = null;
canvas.addEventListener("pointerdown", (event) => {
  pressed = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (!pressed || !skeletonView.skeleton || !viewer.state.bones) return;
  const moved = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
  pressed = null;
  if (moved > CLICK_SLOP) return;
  // The picture may be drawn at a different size from how it is shown (the screen's pixel density), so the click is scaled to the picture.
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * engine.getRenderWidth()) / rect.width;
  const y = ((event.clientY - rect.top) * engine.getRenderHeight()) / rect.height;
  const points = screenPoints(skeletonView.positions(), scene, viewer.camera);
  const scale = engine.getRenderWidth() / rect.width;
  const index = nearestJoint(points, x, y, PICK_DISTANCE * scale);
  if (index >= 0) chooseBone(index);
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

// Each frame, the player runs any cross-fade and the controls catch up with it, and the skeleton's picture follows the bones.
scene.onBeforeRenderObservable.add(() => {
  if (player) player.update(engine.getDeltaTime() / 1000);
  playerPanel.refresh();
  skeletonView.update(viewer.state.bones);
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
openModel(SAMPLES[0].file);
