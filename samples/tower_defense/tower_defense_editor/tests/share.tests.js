QUnit.module("squeezing a row", () => {
  QUnit.test("a run of the same character is the character and how many", (assert) => {
    assert.strictEqual(squeezeRow("....##"), ".4#2");
    assert.strictEqual(squeezeRow("S###G"), "S#3G");
  });

  QUnit.test("a run of one is the character alone", (assert) => {
    assert.strictEqual(squeezeRow(".#.#"), ".#.#");
  });

  QUnit.test("a row that is squeezed and stretched is the row that it was, for every row of both maps", (assert) => {
    for (const map of MAPS) for (const row of map.rows) assert.strictEqual(stretchRow(squeezeRow(row), row.length), row, row);
  });

  QUnit.test("every row of a map is as short as it can be, and a map is under the limit of a code", (assert) => {
    for (const map of MAPS) assert.true(encodeMap(map).length < SHARE.maxCode / 2, `${map.name}: ${encodeMap(map).length} characters`);
  });
});

QUnit.module("stretching a row", () => {
  QUnit.test("is the row, if it is a row of the width", (assert) => {
    assert.strictEqual(stretchRow(".4#2", 6), "....##");
  });

  QUnit.test("is nothing for a row of the wrong width, too short or too long", (assert) => {
    assert.strictEqual(stretchRow(".4#2", 7), null);
    assert.strictEqual(stretchRow(".4#2", 5), null);
  });

  QUnit.test("is nothing for a character that is not in the legend", (assert) => {
    assert.strictEqual(stretchRow(".3X2", 6), null);
    assert.strictEqual(stretchRow("<script>", 8), null);
  });

  QUnit.test("is nothing for a run of none, or a run bigger than the row, or a number with no character, or one that is cut off", (assert) => {
    assert.strictEqual(stretchRow(".0#5", 5), null);
    assert.strictEqual(stretchRow(".99999999999", 6), null);
    assert.strictEqual(stretchRow("12", 12), null);
    assert.strictEqual(stretchRow("", 0), "");
  });

  QUnit.test("a name that every object has is not a character of the legend", (assert) => {
    assert.strictEqual(stretchRow("constructor", 11), null);
  });
});

QUnit.module("codes", () => {
  QUnit.test("text goes into a code and comes out as it was, with characters that are not plain", (assert) => {
    for (const text of ["hello", "", "naïve — 日本語 ☆", "{\"n\":\"x\"}"]) assert.strictEqual(fromCode(toCode(text)), text, text);
  });

  QUnit.test("a code is safe in an address: no plus, no slash, no equals", (assert) => {
    const code = toCode("???>>>~~~ ÿÿÿ".repeat(10));

    assert.true(/^[A-Za-z0-9_-]*$/.test(code), code);
  });

  QUnit.test("what isn't a code is nothing, and not an error", (assert) => {
    assert.strictEqual(fromCode("!!!not base 64!!!"), null);
    assert.strictEqual(fromCode("_____"), null, "bytes that are not text");
  });
});

QUnit.module("encodeMap and decodeMap", () => {
  QUnit.test("a map goes into a code and comes out the same map, for each of the game's own", (assert) => {
    for (const map of MAPS) {
      const result = decodeMap(encodeMap(map));

      assert.true(result.ok, map.name);
      assert.deepEqual(result.map, map);
    }
  });

  QUnit.test("a map that was drawn comes out the same, with its name", (assert) => {
    const editor = new MapEditor(MAPS[0]);
    editor.setName("Mine, with 日本語");
    const result = decodeMap(encodeMap(editor.toMap()));

    assert.true(result.ok);
    assert.strictEqual(result.map.name, "Mine, with 日本語");
  });

  QUnit.test("nothing, or not text, or too long, is no map", (assert) => {
    for (const code of [undefined, null, "", 42, {}, "x".repeat(SHARE.maxCode + 1)]) assert.false(decodeMap(code).ok, String(code).slice(0, 20));
  });

  QUnit.test("something that is not a map is no map: not JSON, or JSON of another shape", (assert) => {
    for (const text of ["not json", "[]", "null", JSON.stringify({ n: 3, r: "x" }), JSON.stringify({ n: "x" }), JSON.stringify({ r: "x" })]) {
      assert.false(decodeMap(toCode(text)).ok, text);
    }
  });

  QUnit.test("a map with the wrong number of rows, or a bad row, is no map, and says what is wrong", (assert) => {
    const rows = encodeMap(MAPS[0]);
    const data = JSON.parse(fromCode(rows));
    const short = decodeMap(toCode(JSON.stringify({ n: "x", r: data.r.split("/").slice(1).join("/") })));
    const bad = decodeMap(toCode(JSON.stringify({ n: "x", r: data.r.replace(".", "Z") })));

    assert.false(short.ok);
    assert.true(short.problems[0].includes("rows"));
    assert.false(bad.ok);
  });

  QUnit.test("a map that can't be played is no map, however well it is made: the game's checks apply to what comes in a link", (assert) => {
    const blank = new MapEditor().toMap();
    const result = decodeMap(encodeMap(blank));

    assert.false(result.ok);
    assert.true(result.problems.length > 0);
  });

  QUnit.test("a name is made safe: it is tidied and cut, and it is only ever put on the page as text", (assert) => {
    const data = JSON.parse(fromCode(encodeMap(MAPS[0])));
    data.n = "  <img src=x onerror=alert(1)>  " + "y".repeat(100);
    const result = decodeMap(toCode(JSON.stringify(data)));

    assert.true(result.ok);
    assert.true(result.map.name.length <= EDITOR.nameLength);
    assert.false(/^\s|\s$/.test(result.map.name));
  });

  QUnit.test("a code that is only part of a code is no map, and no code throws", (assert) => {
    const code = encodeMap(MAPS[1]);
    for (let cut = 1; cut < code.length; cut += 7) assert.strictEqual(typeof decodeMap(code.slice(0, cut)).ok, "boolean");
    for (const part of [code.slice(0, 5), code.slice(0, code.length - 3), code + "!!"]) assert.strictEqual(typeof decodeMap(part).ok, "boolean");
  });
});

QUnit.module("shareUrl", () => {
  QUnit.test("is the address of a page with the map in it, and nothing else of the address that was", (assert) => {
    const url = new URL(shareUrl("http://localhost:3000/samples/x/index.html?map=1&go=1&dev=1#top", MAPS[0]));

    assert.strictEqual(url.origin, "http://localhost:3000");
    assert.strictEqual(url.pathname, "/samples/x/index.html");
    assert.deepEqual([...url.searchParams.keys()], ["data"]);
    assert.strictEqual(url.hash, "");
  });

  QUnit.test("can be the address of another page beside it", (assert) => {
    const url = new URL(shareUrl("http://localhost/samples/x/index.html", MAPS[0], "editor.html"));

    assert.strictEqual(url.pathname, "/samples/x/editor.html");
  });

  QUnit.test("the map is in it, and comes out", (assert) => {
    const url = new URL(shareUrl("http://localhost/a/index.html", MAPS[1]));

    assert.deepEqual(decodeMap(url.searchParams.get("data")).map, MAPS[1]);
  });
});

QUnit.module("a MapStore", () => {
  const memory = () => {
    const data = {};
    return { data, getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value) };
  };

  QUnit.test("begins with no maps", (assert) => {
    assert.deepEqual(new MapStore(memory()).list(), []);
  });

  QUnit.test("keeps a map that can be played, and says its id; and gives it back", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);

    assert.true(typeof id === "string" && id.length > 0);
    assert.deepEqual(store.get(id), { id, name: MAPS[0].name, rows: MAPS[0].rows });
    assert.strictEqual(store.list().length, 1);
  });

  QUnit.test("does not keep a map that can't be played", (assert) => {
    const store = new MapStore(memory());

    assert.strictEqual(store.put(new MapEditor().toMap()), null);
    assert.strictEqual(store.list().length, 0);
  });

  QUnit.test("a map that is put again with its id replaces the old one, and does not add another", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);
    store.put({ ...MAPS[1], name: "Changed" }, id);

    assert.strictEqual(store.list().length, 1);
    assert.strictEqual(store.get(id).name, "Changed");
  });

  QUnit.test("each map has an id of its own", (assert) => {
    const store = new MapStore(memory());
    const ids = [store.put(MAPS[0]), store.put(MAPS[0]), store.put(MAPS[1])];

    assert.strictEqual(new Set(ids).size, 3);
  });

  QUnit.test("only so many are kept, and a full store says so (null), and still saves an old one that is changed", (assert) => {
    const store = new MapStore(memory());
    const ids = [];
    for (let i = 0; i < SHARE.maxMaps; i++) ids.push(store.put({ ...MAPS[0], name: `map ${i}` }));

    assert.strictEqual(store.put(MAPS[1]), null);
    assert.strictEqual(store.list().length, SHARE.maxMaps);
    assert.strictEqual(store.put({ ...MAPS[1], name: "again" }, ids[0]), ids[0]);
  });

  QUnit.test("remove takes a map away, and says whether there was one", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);

    assert.true(store.remove(id));
    assert.deepEqual(store.list(), []);
    assert.false(store.remove(id));
  });

  QUnit.test("the maps are kept: a new store on the same storage has them", (assert) => {
    const storage = memory();
    const id = new MapStore(storage).put(MAPS[1]);

    assert.deepEqual(new MapStore(storage).get(id).rows, MAPS[1].rows);
  });

  QUnit.test("what is in storage is not believed: entries that are not maps, or that can't be played, are dropped, and the rest are kept", (assert) => {
    const storage = memory();
    storage.setItem(SHARE.storageKey, JSON.stringify([{ id: "a", name: "ok", rows: MAPS[0].rows }, { id: "b", name: "bad", rows: ["S#G"] }, { id: 3, name: "x", rows: [] }, null, "text", { id: "c", name: "x", rows: [1, 2] }]));

    assert.deepEqual(new MapStore(storage).list().map((m) => m.id), ["a"]);
  });

  QUnit.test("storage with nonsense, or that isn't a list, is no maps and no error", (assert) => {
    for (const value of ["{nope", "{}", "42", "null", ""]) {
      const storage = memory();
      storage.setItem(SHARE.storageKey, value);

      assert.deepEqual(new MapStore(storage).list(), [], value);
    }
  });

  QUnit.test("storage that can't be written to loses nothing for the page that is open, and does not throw", (assert) => {
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const store = new MapStore(full);
    const id = store.put(MAPS[0]);

    assert.true(typeof id === "string");
    assert.strictEqual(store.list().length, 1);
  });

  QUnit.test("a list that is given out is a copy: changing it changes nothing kept", (assert) => {
    const store = new MapStore(memory());
    store.put(MAPS[0]);
    store.list()[0].name = "changed";
    store.list().push({});

    assert.strictEqual(store.list().length, 1);
    assert.strictEqual(store.list()[0].name, MAPS[0].name);
  });
});
