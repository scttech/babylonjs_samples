QUnit.module("Flow", () => {
  QUnit.test("begins at the title, and is not running or over", (assert) => {
    const flow = new Flow();

    assert.strictEqual(flow.state, "title");
    assert.false(flow.running);
    assert.false(flow.over);
  });

  QUnit.test("start goes to playing, and only from the title", (assert) => {
    const flow = new Flow();

    assert.true(flow.start());
    assert.strictEqual(flow.state, "playing");
    assert.true(flow.running);
    assert.false(flow.start(), "it is going already");
  });

  QUnit.test("a game that is going can be paused, and a paused one resumed, and only those", (assert) => {
    const flow = new Flow();
    assert.false(flow.pause(), "not from the title");
    assert.false(flow.resume());
    flow.start();
    assert.true(flow.pause());
    assert.strictEqual(flow.state, "paused");
    assert.false(flow.running, "no time passes while it is paused");
    assert.false(flow.pause(), "it is paused already");
    assert.true(flow.resume());
    assert.true(flow.running);
  });

  QUnit.test("toggle pauses a game that is going and resumes one that is paused, and does nothing at the title", (assert) => {
    const flow = new Flow();
    assert.false(flow.toggle());
    flow.start();
    flow.toggle();
    assert.strictEqual(flow.state, "paused");
    flow.toggle();
    assert.strictEqual(flow.state, "playing");
  });

  QUnit.test("a game that is going can be won or lost, and then it is over", (assert) => {
    for (const result of ["won", "lost"]) {
      const flow = new Flow();
      flow.start();

      assert.true(flow.finish(result), result);
      assert.strictEqual(flow.state, result);
      assert.true(flow.over, result);
      assert.false(flow.running, result);
    }
  });

  QUnit.test("a game that is paused, or over, or at the title, is not finished again: the end is once", (assert) => {
    const flow = new Flow();
    assert.false(flow.finish("won"), "not from the title");
    flow.start();
    flow.pause();
    assert.false(flow.finish("lost"), "not while paused");
    flow.resume();
    flow.finish("lost");
    assert.false(flow.finish("won"), "not twice, and not the other way");
    assert.strictEqual(flow.state, "lost");
  });

  QUnit.test("nothing leaves an end: it is a new page that starts again", (assert) => {
    const flow = new Flow();
    flow.start();
    flow.finish("won");

    for (const action of ["start", "pause", "resume"]) assert.false(flow.go(action), action);
  });

  QUnit.test("an action that isn't one does nothing", (assert) => {
    assert.false(new Flow().go("explode"));
  });

  QUnit.test("whoever asks is told of every change, with the state it is in and the state it was in, and not of what didn't happen", (assert) => {
    const flow = new Flow();
    const heard = [];
    flow.onChange((now, before) => heard.push(`${before} to ${now}`));
    flow.pause();
    flow.start();
    flow.pause();
    flow.resume();
    flow.finish("won");

    assert.deepEqual(heard, ["title to playing", "playing to paused", "paused to playing", "playing to won"]);
  });

  QUnit.test("every state that the table names is one that it has a row for", (assert) => {
    for (const row of Object.values(FLOW)) for (const next of Object.values(row)) assert.true(next in FLOW, next);
  });
});
