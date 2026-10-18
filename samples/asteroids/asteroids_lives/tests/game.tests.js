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
