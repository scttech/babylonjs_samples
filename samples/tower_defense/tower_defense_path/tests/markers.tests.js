QUnit.module("markerPulse", () => {
  QUnit.test("starts at its own size", (assert) => {
    assert.strictEqual(markerPulse(0), 1);
  });

  QUnit.test("never gets more than the table's share bigger or smaller", (assert) => {
    for (let t = 0; t < 20; t += 0.1) {
      assert.true(markerPulse(t) <= 1 + MARKER_BREATH.size + 1e-12);
      assert.true(markerPulse(t) >= 1 - MARKER_BREATH.size - 1e-12);
    }
  });

  QUnit.test("does get that big, and that small", (assert) => {
    const sizes = Array.from({ length: 200 }, (_, n) => markerPulse(n * 0.05));

    assert.true(Math.max(...sizes) > 1 + MARKER_BREATH.size * 0.99);
    assert.true(Math.min(...sizes) < 1 - MARKER_BREATH.size * 0.99);
  });

  QUnit.test("comes round again: after a whole turn of the rate it is the same", (assert) => {
    const turn = (2 * Math.PI) / MARKER_BREATH.rate;

    assert.true(Math.abs(markerPulse(1) - markerPulse(1 + turn)) < 1e-9);
  });
});

QUnit.module("buildMarker", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("stands in the middle of its cell, a hair above the ground", (assert) => {
    const marker = buildMarker(scene, "start", 3, 2);
    const { x, z } = cellCenter(3, 2);

    assert.strictEqual(marker.node.position.x, x);
    assert.strictEqual(marker.node.position.z, z);
    assert.true(marker.node.position.y > 0 && marker.node.position.y < 0.2);
  });

  QUnit.test("is a ring and a disc, in the color of its kind", (assert) => {
    for (const kind of Object.keys(MARKERS)) {
      const marker = buildMarker(scene, kind, 0, 0);

      assert.true(marker.ring.parent === marker.node && marker.disc.parent === marker.node, kind);
      assert.true(marker.ring.material.emissiveColor.toHexString().toLowerCase() === MARKERS[kind].color, kind);
    }
  });

  QUnit.test("the start and the goal are not the same color", (assert) => {
    assert.notStrictEqual(MARKERS.start.color, MARKERS.goal.color);
  });

  QUnit.test("is flat: the ring lies in the ground, and the disc is turned to lie in it too", (assert) => {
    const marker = buildMarker(scene, "goal", 0, 0);
    const { extendSize } = marker.ring.getBoundingInfo().boundingBox;

    assert.true(extendSize.y < extendSize.x / 4, "the ring is much wider than it is tall");
    assert.strictEqual(marker.disc.rotation.x, Math.PI / 2);
  });

  QUnit.test("is lit by nothing, and the disc is more see-through than the ring", (assert) => {
    const marker = buildMarker(scene, "goal", 0, 0);

    assert.true(marker.ring.material.disableLighting);
    assert.true(marker.disc.material.alpha < marker.ring.material.alpha);
  });

  QUnit.test("cannot be picked, so it won't catch a click meant for the cell", (assert) => {
    const marker = buildMarker(scene, "start", 0, 0);

    assert.false(marker.ring.isPickable);
    assert.false(marker.disc.isPickable);
  });

  QUnit.test("update makes it the size markerPulse says", (assert) => {
    const marker = buildMarker(scene, "start", 0, 0);
    marker.update(1.7);

    assert.true(Math.abs(marker.node.scaling.x - markerPulse(1.7)) < 1e-12);
    assert.strictEqual(marker.node.scaling.x, marker.node.scaling.z);
  });
});
