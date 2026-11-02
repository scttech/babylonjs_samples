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
    const card = {
      panel: document.createElement("div"),
      title: document.createElement("div"),
      level: document.createElement("div"),
      upgrade: document.createElement("button"),
      sell: document.createElement("button"),
    };
    card.panel.hidden = true;
    card.panel.append(card.title, card.level, card.upgrade, card.sell);
    fixture.append(els.tray, els.gold, els.message, card.panel);
    parts = { ...els, card };
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
      panel: new Panel(card),
      state,
      previews,
      outline: new Outline(scene),
      ring: new RangeRing(scene),
      extents: () => extents,
      make: (kind, col, row) => {
        made.push({ kind, col, row });
        return fakeTower(kind, col, row);
      },
    });
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

    // A tower that is only what the hand asks of one: where it is, what it can do, its level, and that it can be taken away.
  const fakeTower = (kind, col, row) => ({
    kind,
    col,
    row,
    level: 1,
    spec: BENDERS[kind],
    disposed: false,
    setLevel(level) {
      this.level = level;
      this.spec = statsFor(BENDERS[kind], level);
    },
    dispose() {
      this.disposed = true;
    },
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

  QUnit.test("a cell with scenery on it is red, and says what is there", (assert) => {
    state.grid = parseMap({ name: "test", rows: ["S##.......", "..#..s....", "..#.......", "..#......G"] });
    drag("air", at([5, 1]));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "there is a spirit shrine there");
    hand.release(at([5, 1]));
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
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

  // Where on the page a point of the world is, at any height.
  const pageOfPoint = (x, y, z) => {
    const { right, up } = viewAxes();
    const sx = (x * right[0] + y * right[1] + z * right[2] - extents.centerX) / extents.halfWidth;
    const sy = (x * up[0] + y * up[1] + z * up[2] - extents.centerY) / extents.halfHeight;
    return { clientX: page.left + ((sx + 1) / 2) * page.width, clientY: page.top + ((1 - sy) / 2) * page.height, pointerType: "mouse" };
  };
  // Builds a tower of a kind in a cell with the hand, and lets go of everything.
  const build = (kind, [col, row]) => {
    drag(kind, at([col, row]));
    hand.release(at([col, row]));
    return state.towers[state.towers.length - 1];
  };
  const tap = (event) => {
    hand.move(event);
    hand.release(event);
  };
  const OTHER = [6, 3]; // another cell of grass

  QUnit.test("a tap on a tower chooses it: its panel comes up, its cell is outlined, and a ring shows how far it reaches", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));

    assert.strictEqual(hand.selected, tower);
    assert.true(hand.panel.visible);
    assert.strictEqual(parts.card.title.textContent, "Earth Kingdom");
    assert.strictEqual(parts.card.level.textContent, "Level 1 of 3, Novice");
    assert.true(hand.outline.visible);
    assert.true(hand.ring.visible);
    assert.strictEqual(hand.ring.mesh.scaling.x, BENDERS.earth.range);
  });

  QUnit.test("a tap on the bender, which is up above its cell, chooses it too", (assert) => {
    const tower = build("fire", GRASS);
    const { x, z } = cellCenter(...GRASS);
    tap(pageOfPoint(x, 2.2, z));

    assert.strictEqual(hand.selected, tower);
  });

  QUnit.test("and a tap on the cell in front of or behind it does not", (assert) => {
    build("fire", GRASS);
    tap(at([GRASS[0], GRASS[1] + 1]));
    assert.strictEqual(hand.selected, null);
    tap(at([GRASS[0] + 1, GRASS[1]]));
    assert.strictEqual(hand.selected, null);
  });

  QUnit.test("a finger is not held above itself when it taps a tower, as it is when it drags a podium", (assert) => {
    const tower = build("water", GRASS);
    tap({ ...at(GRASS), pointerType: "touch" });

    assert.strictEqual(hand.selected, tower);
  });

  QUnit.test("a tap on anything else puts the panel away: bare grass, road, or the tray", (assert) => {
    build("water", GRASS);
    for (const away of [at(OTHER), at(ROAD), onTray]) {
      tap(at(GRASS));
      assert.true(hand.panel.visible);
      tap(away);

      assert.strictEqual(hand.selected, null);
      assert.false(hand.panel.visible);
      assert.false(hand.ring.visible);
      assert.false(hand.outline.visible);
    }
  });

  QUnit.test("a tap on another tower changes the choice", (assert) => {
    const a = build("water", GRASS);
    const b = build("air", OTHER);
    tap(at(GRASS));
    tap(at(OTHER));

    assert.notStrictEqual(a, b);
    assert.strictEqual(hand.selected, b);
    assert.strictEqual(parts.card.title.textContent, "Air Nomad");
  });

  QUnit.test("the tap that builds a tower does not also choose it", (assert) => {
    build("water", GRASS);

    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
  });

  QUnit.test("pressing a podium puts the chosen tower away, and Escape does too", (assert) => {
    build("water", GRASS);
    tap(at(GRASS));
    hand.press("fire", { x: 500, y: 500 });
    assert.strictEqual(hand.selected, null);

    hand.cancel();
    tap(at(GRASS));
    assert.strictEqual(hand.selected !== null, true);
    hand.cancel();
    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
  });

  QUnit.test("an upgrade takes the gold, makes the tower the next level, and shows it: a bigger ring, and the next price", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));
    const gold = state.wallet.gold;
    const result = hand.upgrade();

    assert.true(result.ok);
    assert.strictEqual(tower.level, 2);
    assert.strictEqual(state.wallet.gold, gold - upgradeCost(BENDERS.earth, 1));
    assert.strictEqual(hand.selected, tower, "it is still chosen");
    assert.strictEqual(parts.card.level.textContent, "Level 2 of 3, Adept");
    assert.true(Math.abs(hand.ring.mesh.scaling.x - BENDERS.earth.range * LEVELS[1].range) < 1e-9);
    assert.strictEqual(parts.card.upgrade.textContent, `Make Master for ${upgradeCost(BENDERS.earth, 2)}`);
  });

  QUnit.test("with too little gold it says what the upgrade costs, and changes nothing", (assert) => {
    const tower = build("fire", GRASS);
    state.wallet.gold = 100;
    tap(at(GRASS));
    const result = hand.upgrade();

    assert.false(result.ok);
    assert.strictEqual(tower.level, 1);
    assert.strictEqual(state.wallet.gold, 100);
    assert.strictEqual(parts.message.textContent, "that costs 105, and there is 100");
    assert.true(parts.card.upgrade.classList.contains("poor"));
  });

  QUnit.test("gold that comes in turns the upgrade from poor to ready, as the frames go by", (assert) => {
    build("fire", GRASS);
    state.wallet.gold = 100;
    tap(at(GRASS));
    assert.true(parts.card.upgrade.classList.contains("poor"));
    state.wallet.earn(10);
    hand.update(0.016);

    assert.false(parts.card.upgrade.classList.contains("poor"));
  });

  QUnit.test("a tower at the top has nothing to upgrade, and says so if it is tried", (assert) => {
    const tower = build("air", GRASS);
    tower.setLevel(MAX_LEVEL);
    tap(at(GRASS));
    const result = hand.upgrade();

    assert.true(parts.card.upgrade.hidden);
    assert.false(result.ok);
    assert.strictEqual(parts.message.textContent, "that is as good as it gets");
  });

  QUnit.test("selling takes the tower away, gives back its share, puts the panel away, and frees the cell", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));
    const gold = state.wallet.gold;
    const result = hand.sell();

    assert.true(result.ok);
    assert.true(tower.disposed);
    assert.deepEqual(state.towers, []);
    assert.strictEqual(state.wallet.gold, gold + refundFor(BENDERS.earth, 1));
    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
    assert.false(hand.ring.visible);
    assert.strictEqual(parts.message.textContent, `sold for ${refundFor(BENDERS.earth, 1)}`);
    assert.true(hand.check("earth", { col: GRASS[0], row: GRASS[1] }).ok, "and a tower can be built there again");
  });

  QUnit.test("the buttons do nothing when no tower is chosen", (assert) => {
    build("earth", GRASS);
    const gold = state.wallet.gold;

    assert.strictEqual(hand.upgrade(), null);
    assert.strictEqual(hand.sell(), null);
    assert.strictEqual(state.wallet.gold, gold);
    assert.strictEqual(state.towers.length, 1);
  });

  QUnit.test("the panel's buttons are wired to the hand: a click upgrades and a click sells", (assert) => {
    const tower = build("water", GRASS);
    hand.panel.onUpgrade(() => hand.upgrade());
    hand.panel.onSell(() => hand.sell());
    tap(at(GRASS));
    parts.card.upgrade.click();
    assert.strictEqual(tower.level, 2);
    parts.card.sell.click();

    assert.deepEqual(state.towers, []);
  });

});
