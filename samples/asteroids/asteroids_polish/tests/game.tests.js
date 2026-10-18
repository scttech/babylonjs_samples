QUnit.module("Game", () => {
  QUnit.test("starts with three lives and the game not over", (assert) => {
    const game = new Game();

    assert.strictEqual(game.lives, 3);
    assert.false(game.over);
  });

  QUnit.test("the starting number of lives can be chosen", (assert) => {
    assert.strictEqual(new Game({ startingLives: 5 }).lives, 5);
  });

  QUnit.test("loseLife() takes one life and returns how many remain", (assert) => {
    const game = new Game();

    assert.strictEqual(game.loseLife(), 2);
    assert.strictEqual(game.lives, 2);
  });

  QUnit.test("the game is over once the last life is gone", (assert) => {
    const game = new Game({ startingLives: 2 });

    game.loseLife();
    assert.false(game.over, "one life left, still playing");

    game.loseLife();
    assert.true(game.over);
  });

  QUnit.test("lives never go below zero", (assert) => {
    const game = new Game({ startingLives: 1 });
    game.loseLife();

    assert.strictEqual(game.loseLife(), 0);
    assert.strictEqual(game.lives, 0);
  });

  QUnit.test("reset() restores the starting lives and ends the game-over state", (assert) => {
    const game = new Game();
    game.loseLife();
    game.loseLife();
    game.loseLife();
    assert.true(game.over);

    game.reset();

    assert.strictEqual(game.lives, 3);
    assert.false(game.over);
  });
});

QUnit.module("Game start and pause", () => {
  QUnit.test("begins on the title screen: not started, not playing", (assert) => {
    const game = new Game();

    assert.false(game.started);
    assert.false(game.paused);
    assert.false(game.playing);
  });

  QUnit.test("start() leaves the title screen and begins playing", (assert) => {
    const game = new Game();

    game.start();

    assert.true(game.started);
    assert.true(game.playing);
  });

  QUnit.test("start() gives a fresh set of lives", (assert) => {
    const game = new Game();
    game.loseLife();

    game.start();

    assert.strictEqual(game.lives, 3);
  });

  QUnit.test("togglePause() pauses and resumes, and says which", (assert) => {
    const game = new Game();
    game.start();

    assert.true(game.togglePause());
    assert.true(game.paused);
    assert.false(game.playing, "paused is not playing");

    assert.false(game.togglePause());
    assert.false(game.paused);
    assert.true(game.playing);
  });

  QUnit.test("there's nothing to pause on the title screen", (assert) => {
    const game = new Game();

    assert.false(game.togglePause());
    assert.false(game.paused);
  });

  QUnit.test("there's nothing to pause once the game is over", (assert) => {
    const game = new Game({ startingLives: 1 });
    game.start();
    game.loseLife();

    assert.false(game.togglePause());
    assert.false(game.paused);
    assert.false(game.playing, "over is not playing");
  });

  QUnit.test("reset() resumes a paused game but doesn't go back to the title screen", (assert) => {
    const game = new Game();
    game.start();
    game.togglePause();

    game.reset();

    assert.false(game.paused);
    assert.true(game.started);
    assert.true(game.playing);
  });
});

