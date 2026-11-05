// The editor page: it puts the editor (editor.js), the board that shows it (boardview.js), the tools (toolbar.js) and the keeping and sharing of
// maps (share.js) together, with the pointer that paints. The map being edited comes from the address: `?edit=id` is one of the maps that the player
// has kept, `?data=code` is one that came in a link, and with neither the board is empty.
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { alpha: true });
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

const SPLASH_MIN_MS = 1500;
const params = new URLSearchParams(window.location.search);
const store = new MapStore(safeStorage(window));

// The map to begin with, and, if it is one that is kept, its id.
function startingMap() {
  const kept = params.get("edit") ? store.get(params.get("edit")) : null;
  if (kept) return { map: kept, id: kept.id };
  const shared = params.get("data") ? decodeMap(params.get("data")) : null;
  if (shared && shared.ok) return { map: shared.map, id: null };
  return { map: null, id: null };
}

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
  const camera = buildCamera(scene);
  let extents;
  const fitView = () => {
    extents = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, extents);
  };
  fitView();
  engine.onResizeObservable.add(fitView);

  const skyLight = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.65;
  skyLight.diffuse = new BABYLON.Color3(0.85, 0.92, 1);
  skyLight.groundColor = new BABYLON.Color3(0.45, 0.4, 0.35);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -1, 0.6), scene);
  sun.intensity = 0.85;
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  const tiles = await loadTiles(scene);
  const scenery = await loadProps(scene);
  buildIsland(scene);

  const start = startingMap();
  let currentId = start.id;
  const editor = new MapEditor(start.map);
  const board = new EditorBoard(scene, tiles, scenery);
  board.show(editor);
  const outline = new Outline(scene);
  const toolbar = new Toolbar(
    {
      palette: document.getElementById("palette"),
      actions: document.getElementById("actions"),
      name: document.getElementById("map-name"),
      problems: document.getElementById("problems"),
      status: document.getElementById("editor-status"),
    },
    document
  );
  toolbar.setName(editor.name);

  // What is wrong with the map, and what can be undone, as it is now.
  const refresh = () => {
    toolbar.showProblems(editor.problems());
    toolbar.setHistory(editor.canUndo, editor.canRedo);
  };
  const apply = (changed) => {
    board.update(editor, changed);
    refresh();
  };
  refresh();

  // Painting. A press begins a stroke, the pointer paints along a line from where it was to where it is, and letting go ends it: one step to undo.
  let brush = toolbar.selected;
  let last = null;
  const cellOf = (event) => {
    const rect = canvas.getBoundingClientRect();
    return isInside(rect, event.clientX, event.clientY) ? cellAtPoint(rect, extents, event.clientX, event.clientY) : null;
  };
  toolbar.onBrush((id) => (brush = id));
  canvas.addEventListener("pointerdown", (event) => {
    const cell = cellOf(event);
    if (!cell) return;
    canvas.setPointerCapture(event.pointerId);
    editor.begin();
    last = cell;
    apply(editor.strokeTo(cell, cell, brush));
  });
  canvas.addEventListener("pointermove", (event) => {
    const cell = cellOf(event);
    if (cell) outline.show(cell.col, cell.row, true);
    else outline.hide();
    if (last && cell) {
      apply(editor.strokeTo(last, cell, brush));
      last = cell;
    }
  });
  const finish = () => {
    if (!last) return;
    last = null;
    editor.end();
    refresh();
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  canvas.addEventListener("pointerleave", () => outline.hide());

  toolbar.onName((text) => editor.setName(text));

  // Copies a link to the clipboard, which a page may not be allowed to do: then the link is shown, to be copied by hand.
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      window.prompt("Copy this link:", text);
      return false;
    }
  };

  toolbar.onAction(async (action) => {
    if (action === "undo") apply(editor.undo());
    if (action === "redo") apply(editor.redo());
    if (action === "clear") apply(editor.clear());
    if (action === "save") {
      const id = store.put(editor.toMap(), currentId);
      if (id === null) return toolbar.say(`You can keep up to ${SHARE.maxMaps} maps. Delete one on the title screen to make room.`);
      currentId = id;
      window.history.replaceState(null, "", `?edit=${id}`);
      toolbar.say("Saved. It is on the title screen of the game now.");
    }
    if (action === "share") toolbar.say((await copy(shareUrl(window.location.href, editor.toMap()))) ? "The link is copied: send it to someone." : "");
    if (action === "play") window.location.href = shareUrl(window.location.href, editor.toMap()) + "&go=1";
  });

  window.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT") return;
    const control = event.ctrlKey || event.metaKey;
    if (control && event.key.toLowerCase() === "z") {
      event.preventDefault();
      apply(event.shiftKey ? editor.redo() : editor.undo());
    }
    if (control && event.key.toLowerCase() === "y") {
      event.preventDefault();
      apply(editor.redo());
    }
    const number = Number(event.key);
    if (!control && number >= 1 && number <= BRUSHES.length) {
      brush = BRUSHES[number - 1].id;
      toolbar.select(brush);
    }
  });

  let clock = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    outline.update(dt);
    board.tick(clock);
  });
  return { scene };
};

const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
    await delay(Math.max(0, SPLASH_MIN_MS - (performance.now() - shownAt)));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700);
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent = "Something went wrong starting the editor. The models are loaded from files, so the page has to be opened through a web server. The console has the details.";
  });
