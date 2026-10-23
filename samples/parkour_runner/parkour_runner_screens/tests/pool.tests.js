QUnit.module("PiecePool", () => {
  // A stand-in piece, and a stand-in library that makes them and records what it is asked.
  class FakeNode {
    constructor(name) {
      this.name = name;
      this.enabled = true;
    }
    setEnabled(value) {
      this.enabled = value;
    }
  }

  class FakeLibrary {
    constructor() {
      this.placed = []; // every place() call
      this.moved = []; // every moveTo() call
    }
    place(name, placement) {
      const node = new FakeNode(name);
      this.placed.push({ name, placement, node });
      return node;
    }
    moveTo(node, placement) {
      this.moved.push({ node, placement });
    }
  }

  const makePool = () => {
    const library = new FakeLibrary();
    return { library, pool: new PiecePool(library) };
  };

  QUnit.test("with nothing spare, acquire() makes a new piece with the library", (assert) => {
    const { library, pool } = makePool();
    const placement = { x: 1, z: 2 };

    const node = pool.acquire("roads/road_straight", placement);

    assert.strictEqual(library.placed.length, 1);
    assert.strictEqual(library.placed[0].name, "roads/road_straight");
    assert.strictEqual(library.placed[0].placement, placement);
    assert.strictEqual(library.placed[0].node, node);
    assert.strictEqual(pool.made, 1);
  });

  QUnit.test("release() hides the piece", (assert) => {
    const { pool } = makePool();
    const node = pool.acquire("a", {});

    pool.release("a", node);

    assert.false(node.enabled);
  });

  QUnit.test("acquire() reuses a released piece of the same kind instead of making another", (assert) => {
    const { library, pool } = makePool();
    const first = pool.acquire("a", {});
    pool.release("a", first);

    const second = pool.acquire("a", {});

    assert.strictEqual(second, first, "the same piece");
    assert.strictEqual(library.placed.length, 1, "nothing new was made");
    assert.strictEqual(pool.made, 1);
  });

  QUnit.test("a reused piece is shown again and moved to the new place", (assert) => {
    const { library, pool } = makePool();
    const node = pool.acquire("a", { x: 0 });
    pool.release("a", node);
    const placement = { x: 5, z: 40 };

    pool.acquire("a", placement);

    assert.true(node.enabled);
    assert.strictEqual(library.moved.length, 1);
    assert.strictEqual(library.moved[0].node, node);
    assert.strictEqual(library.moved[0].placement, placement);
  });

  QUnit.test("a spare piece of one kind isn't used for another kind", (assert) => {
    const { library, pool } = makePool();
    pool.release("a", pool.acquire("a", {}));

    const other = pool.acquire("b", {});

    assert.strictEqual(other.name, "b");
    assert.strictEqual(library.placed.length, 2, "a new piece was made for b");
    assert.strictEqual(pool.made, 2);
  });

  QUnit.test("each spare piece is handed out once", (assert) => {
    const { pool } = makePool();
    const one = pool.acquire("a", {});
    const two = pool.acquire("a", {});
    pool.release("a", one);
    pool.release("a", two);

    const x = pool.acquire("a", {});
    const y = pool.acquire("a", {});
    const z = pool.acquire("a", {});

    assert.notStrictEqual(x, y, "two different pieces");
    assert.true([one, two].includes(x) && [one, two].includes(y), "both reused");
    assert.false([one, two].includes(z), "the third had to be new");
    assert.strictEqual(pool.made, 3);
  });

  QUnit.test("a piece that was never released can't be handed out again", (assert) => {
    const { pool } = makePool();
    const first = pool.acquire("a", {});

    const second = pool.acquire("a", {});

    assert.notStrictEqual(second, first);
    assert.strictEqual(pool.made, 2);
  });

  QUnit.test("the number of pieces made stops growing when pieces are given back", (assert) => {
    const { pool } = makePool();
    let live = [];

    // A street of five pieces that, every step, loses its oldest and gains a new one.
    for (let step = 0; step < 1000; step++) {
      if (live.length === 5) pool.release("a", live.shift());
      live.push(pool.acquire("a", { z: step }));
    }

    assert.strictEqual(pool.made, 5);
  });
});
