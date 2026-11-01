QUnit.module("the Hand", (hooks) => {
  // The page, as the hand sees it: a canvas 800 by 400 at (100, 50), and a tray below it.
  const page = { left: 100, top: 50, width: 800, height: 400, right: 900, bottom: 450 };
  const MAP = { name: "test", rows: ["S##.......", "..#.......", "..#.......", "..#......G"] };

  let engine, scene, hand, state, parts, extents, made;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    const fixture = document.getElementById("qunit-fixture");
    const els = { tray: document.createElement("div"), gold: document.createElement("span"), message: document.createElement("div") };
    fixture.append(els.tray, els.gold, els.message);
    parts = els;
    state = { grid: parseMap(MAP), towers: [], wallet: new Wallet(400) };
    const previews = {};
    for (const kind of Object.keys(BENDERS)) {
      previews[kind] = { node: new BABYLON.TransformNode(`preview ${kind}`, scene) };
      previews[kind].node.setEnabled(false);
    }
    extents = viewExtents(boardPoints(), page.width / page.height);
    made = [];
    hand = new Hand({
      canvas: { getBoundingClientRect: () => page },
      tray: new Tray(els, document),
      state,
      previews,
      outline: new Outline(scene),
      ring: new RangeRing(scene),
      extents: () => extents,
      make: (kind, col, row) => {
        made.push({ kind, col, row });
        return { kind, col, row };
      },
    });
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Where on the page the middle of a cell is.
  const pageOf = (col, row) => {
    const { right, up } = viewAxes();
    const { x, z } = cellCenter(col, row);
    const sx = (x * right[0] + z * right[2] - extents.centerX) / extents.halfWidth;
    const sy = (x * up[0] + z * up[2] - extents.centerY) / extents.halfHeight;
    return { clientX: page.left + ((sx + 1) / 2) * page.width, clientY: page.top + ((1 - sy) / 2) * page.height, pointerType: "mouse" };
  };
  const onTray = { clientX: 500, clientY: 500, pointerType: "mouse" };
  const GRASS = [5, 1]; // a cell of grass
  const ROAD = [2, 1]; // a cell of road
  const at = ([col, row]) => pageOf(col, row);
  const drag = (kind, event) => {
    hand.press(kind, { x: onTray.clientX, y: onTray.clientY });
    hand.move({ ...event, clientX: event.clientX, clientY: event.clientY });
  };
  const held = () => Object.entries(hand.previews).filter(([, preview]) => preview.node.isEnabled()).map(([kind]) => kind);

  QUnit.test("with nothing pressed, nothing is shown, and a pointer moving about changes nothing", (assert) => {
    hand.move(at(GRASS));

    assert.false(hand.outline.visible);
    assert.false(hand.ring.visible);
    assert.deepEqual(held(), []);
  });

  QUnit.test("pressing a button marks it in the tray, and shows nothing on the board yet", (assert) => {
    hand.press("water", { x: 500, y: 500 });

    assert.true(hand.tray.buttons.water.classList.contains("held"));
    assert.false(hand.outline.visible);
  });

  QUnit.test("dragging over grass shows the podium there, with a ring of its range, and an outline that is on its way to green", (assert) => {
    drag("water", at(GRASS));
    const { x, z } = cellCenter(...GRASS);

    assert.true(hand.outline.visible);
    assert.strictEqual(hand.outline.mesh.position.x, x);
    assert.deepEqual(hand.outline.target, outlineTarget(true));
    assert.true(hand.ring.visible);
    assert.strictEqual(hand.ring.mesh.scaling.x, BENDERS.water.range);
    assert.deepEqual(held(), ["water"]);
    assert.strictEqual(hand.previews.water.node.position.x, x);
    assert.strictEqual(hand.previews.water.node.position.z, z);
    assert.strictEqual(hand.previews.water.node.position.y, HAND.hover);
    assert.strictEqual(parts.message.textContent, "");
  });

  QUnit.test("dragging over road makes the outline red, and says why", (assert) => {
    drag("air", at(ROAD));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "that is road");
    assert.true(parts.message.classList.contains("shown"));
  });

  QUnit.test("dragging from road to grass turns the outline from red to green, over a moment, and takes the message away", (assert) => {
    drag("air", at(ROAD));
    for (let i = 0; i < 40; i++) hand.update(0.05);
    const red = hand.outline.mesh.material.emissiveColor.asArray();
    hand.move(at(GRASS));
    hand.update(0.05);
    const between = hand.outline.mesh.material.emissiveColor.asArray();
    for (let i = 0; i < 40; i++) hand.update(0.05);
    const green = hand.outline.mesh.material.emissiveColor.asArray();

    assert.true(red[0] > red[1], "red");
    assert.true(between[1] > red[1] && between[1] < green[1], "on its way");
    assert.true(green[1] > green[0], "green");
    assert.strictEqual(parts.message.textContent, "");
  });

  QUnit.test("a podium that costs more than there is gives a red outline, and says what it costs", (assert) => {
    state.wallet.gold = 10;
    drag("fire", at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.true(parts.message.textContent.includes(String(BENDERS.fire.cost)));
  });

  QUnit.test("dragging off the board, or over the tray, shows nothing", (assert) => {
    drag("air", at(GRASS));
    hand.move(onTray);

    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.false(hand.ring.visible);
  });

  QUnit.test("letting go over grass builds the tower, takes the gold, and puts everything away", (assert) => {
    drag("earth", at(GRASS));
    hand.release(at(GRASS));

    assert.deepEqual(made, [{ kind: "earth", col: GRASS[0], row: GRASS[1] }]);
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.earth.cost);
    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.false(hand.tray.buttons.earth.classList.contains("held"));
    assert.strictEqual(parts.gold.textContent, String(400 - BENDERS.earth.cost));
  });

  QUnit.test("letting go over road builds nothing, charges nothing, and the reason stays a moment and then goes", (assert) => {
    drag("earth", at(ROAD));
    hand.release(at(ROAD));

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
    assert.strictEqual(parts.message.textContent, "that is road");
    hand.update(HAND.refusal - 0.5);
    assert.strictEqual(parts.message.textContent, "that is road", "still there");
    hand.update(1);

    assert.strictEqual(parts.message.textContent, "", "gone");
  });

  QUnit.test("letting go over the tray, or anywhere that is not the board, puts the podium down", (assert) => {
    drag("earth", at(GRASS));
    hand.release(onTray);

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.earth.classList.contains("held"));
  });

  QUnit.test("a cell that has a tower in it is red, and says so", (assert) => {
    drag("air", at(GRASS));
    hand.release(at(GRASS));
    drag("water", at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "there is a tower there already");
  });

  QUnit.test("a tap on a button arms the podium: it stays marked, and follows the pointer over the board with no button down", (assert) => {
    hand.press("water", { x: 500, y: 500 });
    hand.release(onTray);

    assert.strictEqual(hand.builder.state, "armed");
    assert.true(hand.tray.buttons.water.classList.contains("held"));
    hand.move(at(GRASS));
    assert.true(hand.outline.visible);
    assert.deepEqual(held(), ["water"]);
  });

  QUnit.test("with a podium armed, a tap on the board builds it", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.release(at(GRASS));

    assert.deepEqual(made, [{ kind: "fire", col: GRASS[0], row: GRASS[1] }]);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.fire.cost);
    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.fire.classList.contains("held"));
  });

  QUnit.test("the tap that arms is not also a tap that builds", (assert) => {
    hand.press("fire", { x: at(GRASS).clientX, y: at(GRASS).clientY });
    hand.release(at(GRASS));

    assert.strictEqual(state.towers.length, 0, "it is only armed");
    assert.strictEqual(hand.builder.state, "armed");
  });

  QUnit.test("with a podium armed, a tap on road is refused with the reason, and the podium stays armed to try again", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.release(at(ROAD));

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(hand.builder.state, "armed");
    assert.strictEqual(parts.message.textContent, "that is road");
    hand.release(at(GRASS));
    assert.strictEqual(state.towers.length, 1, "the second try is fine");
  });

  QUnit.test("pressing the button of the armed podium puts it down", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.press("fire", { x: 500, y: 500 });

    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.fire.classList.contains("held"));
  });

  QUnit.test("pressing another button swaps the podium", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.press("air", { x: 500, y: 500 });
    hand.release(onTray);

    assert.strictEqual(hand.builder.kind, "air");
    assert.deepEqual(TRAY_ORDER.filter((kind) => hand.tray.buttons[kind].classList.contains("held")), ["air"]);
  });

  QUnit.test("cancel (the Escape key) puts the podium down from any state, and clears the message", (assert) => {
    drag("air", at(ROAD));
    hand.cancel();

    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.strictEqual(parts.message.textContent, "");
    assert.deepEqual(TRAY_ORDER.filter((kind) => hand.tray.buttons[kind].classList.contains("held")), []);
  });

  QUnit.test("a finger holds the podium above itself: the cell is the one a little further up the screen", (assert) => {
    const p = at([5, 2]);
    hand.press("air", { x: 500, y: 500 });
    hand.move({ ...p, clientY: p.clientY + 200, pointerType: "touch" });
    const finger = { ...p, pointerType: "touch" };
    hand.move(finger);

    assert.true(hand.outline.mesh.position.z > cellCenter(5, 2).z, "further back than the cell under the finger");
    const row = cellAt(hand.outline.mesh.position.x, hand.outline.mesh.position.z).row;

    assert.true(row < 2, `the row held is ${row}, above row 2`);
  });

  QUnit.test("a mouse is not lifted", (assert) => {
    const p = at([5, 2]);
    drag("air", p);

    assert.strictEqual(hand.outline.mesh.position.z, cellCenter(5, 2).z);
  });

  QUnit.test("update fades the outline and shows the gold, every frame", (assert) => {
    state.wallet.gold = 250.7;
    hand.update(0.016);

    assert.strictEqual(parts.gold.textContent, "250");
  });

  QUnit.test("gold that comes in lets a podium that was too dear be built", (assert) => {
    state.wallet.gold = BENDERS.fire.cost - 20;
    drag("fire", at(GRASS));
    assert.deepEqual(hand.outline.target, outlineTarget(false));
    state.wallet.earn(25);
    hand.move(at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(true));
  });

  QUnit.test("it builds as many as there is gold for, and then says that there isn't enough", (assert) => {
    for (const cell of [[3, 0], [4, 0], [5, 0], [6, 0]]) {
      drag("fire", at(cell));
      hand.release(at(cell));
    }

    assert.strictEqual(state.towers.length, 2, "two of 175 from 400");
    assert.strictEqual(state.wallet.gold, 400 - 2 * BENDERS.fire.cost);
    assert.true(parts.message.textContent.includes("costs"));
  });
});
