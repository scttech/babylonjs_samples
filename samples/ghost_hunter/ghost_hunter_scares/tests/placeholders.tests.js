QUnit.module("placeholdersWanted", () => {
  QUnit.test("they are wanted unless something says not", (assert) => {
    assert.true(placeholdersWanted("", null));
    assert.true(placeholdersWanted("?dev", undefined));
  });

  QUnit.test("the address can switch them off or on", (assert) => {
    assert.false(placeholdersWanted("?placeholders=off", null));
    assert.false(placeholdersWanted("?dev&placeholders=hide", null));
    assert.true(placeholdersWanted("?placeholders=on", "off"));
  });

  QUnit.test("what the browser kept counts when the address says nothing, and the address wins", (assert) => {
    assert.false(placeholdersWanted("", "off"));
    assert.true(placeholdersWanted("", "on"));
    assert.false(placeholdersWanted("?placeholders=off", "on"));
  });
});

QUnit.module("PlaceholderSet", () => {
  const node = () => ({ enabled: true, metadata: null, setEnabled(value) { this.enabled = value; } });
  const table = () => ({ show: true, kinds: { marker: true, creature: true } });

  QUnit.test("a placeholder is shown, and is marked with its kind", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "creature");
    assert.true(a.enabled);
    assert.strictEqual(a.metadata.placeholder, "creature");
    assert.strictEqual(set.add(node()).metadata.placeholder, "marker", "a marker unless it says");
  });

  QUnit.test("one switch hides them all, and shows them again", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    const b = set.add(node(), "creature");
    set.setShow(false);
    assert.false(a.enabled);
    assert.false(b.enabled);
    set.setShow(true);
    assert.true(a.enabled);
    assert.true(b.enabled);
  });

  QUnit.test("a kind can be hidden by itself", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    const b = set.add(node(), "creature");
    set.setKind("creature", false);
    assert.true(a.enabled);
    assert.false(b.enabled);
  });

  QUnit.test("a placeholder added while they are hidden starts hidden", (assert) => {
    const set = new PlaceholderSet({ show: false, kinds: {} });
    assert.false(set.add(node()).enabled);
  });

  QUnit.test("a kind that is not in the table is shown", (assert) => {
    const set = new PlaceholderSet(table());
    assert.true(set.visible("something-new"));
  });

  QUnit.test("it counts them, and forgets one that is removed", (assert) => {
    const set = new PlaceholderSet(table());
    const a = set.add(node(), "marker");
    set.add(node(), "creature");
    set.add(node(), "creature");
    assert.strictEqual(set.count(), 3);
    assert.strictEqual(set.count("creature"), 2);
    set.remove(a);
    assert.strictEqual(set.count("marker"), 0);
  });

  QUnit.test("the table of the game has everything shown", (assert) => {
    assert.true(PLACEHOLDERS.show);
    assert.true(Object.values(PLACEHOLDERS.kinds).every(Boolean));
  });
});
