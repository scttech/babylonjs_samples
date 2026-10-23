QUnit.module("Game", () => {
  // A game that is in the given state.
  const gameIn = (state) => {
    const game = new Game();
    game.state = state;
    return game;
  };

  QUnit.test("starts on the title", (assert) => {
    const game = new Game();

    assert.strictEqual(game.state, STATES.title);
    assert.false(game.playing);
  });

  QUnit.test("start() begins a run", (assert) => {
    const game = new Game();

    assert.true(game.start());

    assert.strictEqual(game.state, STATES.playing);
    assert.true(game.playing);
  });

  QUnit.test("start() works from anywhere: the title, a pause, the end of a run, or a run that is going", (assert) => {
    for (const state of Object.values(STATES)) {
      const game = gameIn(state);

      game.start();

      assert.strictEqual(game.state, STATES.playing, state);
    }
  });

  QUnit.test("a run that is going can be paused, and resumed", (assert) => {
    const game = gameIn(STATES.playing);

    assert.true(game.pause());
    assert.strictEqual(game.state, STATES.paused);

    assert.true(game.resume());
    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("you can't pause the title or a finished run, or resume what isn't paused", (assert) => {
    for (const state of [STATES.title, STATES.over, STATES.paused]) {
      const game = gameIn(state);
      assert.false(game.pause(), `pause from ${state}`);
      assert.strictEqual(game.state, state);
    }
    for (const state of [STATES.title, STATES.over, STATES.playing]) {
      const game = gameIn(state);
      assert.false(game.resume(), `resume from ${state}`);
      assert.strictEqual(game.state, state);
    }
  });

  QUnit.test("togglePause() pauses a run that is going and resumes one that is paused", (assert) => {
    const game = gameIn(STATES.playing);

    game.togglePause();
    assert.strictEqual(game.state, STATES.paused);

    game.togglePause();
    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("togglePause() does nothing on the title or the game over screen", (assert) => {
    for (const state of [STATES.title, STATES.over]) {
      const game = gameIn(state);

      assert.false(game.togglePause());

      assert.strictEqual(game.state, state);
    }
  });

  QUnit.test("only a run that is going can end", (assert) => {
    const game = gameIn(STATES.playing);
    assert.true(game.end());
    assert.strictEqual(game.state, STATES.over);

    for (const state of [STATES.title, STATES.paused, STATES.over]) {
      const other = gameIn(state);
      assert.false(other.end(), `end from ${state}`);
      assert.strictEqual(other.state, state);
    }
  });

  QUnit.test("toTitle() goes back from a pause or from the end of a run", (assert) => {
    for (const state of [STATES.paused, STATES.over]) {
      const game = gameIn(state);

      assert.true(game.toTitle());

      assert.strictEqual(game.state, STATES.title, state);
    }
  });

  QUnit.test("toTitle() won't leave a run that is going: pause it first", (assert) => {
    const game = gameIn(STATES.playing);

    assert.false(game.toTitle());

    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("time is frozen on the title and while paused, and passes otherwise", (assert) => {
    assert.true(gameIn(STATES.title).frozen);
    assert.true(gameIn(STATES.paused).frozen);
    assert.false(gameIn(STATES.playing).frozen);
    assert.false(gameIn(STATES.over).frozen, "after a crash the runner can finish falling");
  });

  QUnit.test("only a run that is going is playing", (assert) => {
    for (const state of Object.values(STATES)) {
      assert.strictEqual(gameIn(state).playing, state === STATES.playing, state);
    }
  });
});
