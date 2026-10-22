// A pool of street pieces. Making a piece (an instance of a loaded model) costs a
// little every time, and the street makes and drops pieces constantly as the
// runner moves. Rather than throw a dropped piece away, the pool hides it and
// keeps it, and hands it out again the next time a piece of that kind is needed.
// New pieces are only made when there is no spare one to reuse, so however long
// the runner runs, the number of pieces made stops growing. See ../tests/pool.tests.js.
class PiecePool {
  // `library` is a PieceLibrary: it makes the pieces and knows how to place them.
  constructor(library) {
    this.library = library;
    this.spare = new Map(); // piece name -> the hidden pieces waiting to be reused
    this.made = 0; // how many pieces have ever been made, for curiosity and tests
  }

  // A piece of the named kind, at `placement`: a spare one if there is one,
  // otherwise a new one.
  acquire(name, placement) {
    const spares = this.spare.get(name);
    if (spares && spares.length > 0) {
      const piece = spares.pop();
      this.library.moveTo(piece, placement);
      piece.setEnabled(true);
      return piece;
    }
    this.made++;
    return this.library.place(name, placement);
  }

  // Gives a piece back. It's hidden, and kept for the next acquire() of that kind.
  release(name, piece) {
    piece.setEnabled(false);
    if (!this.spare.has(name)) this.spare.set(name, []);
    this.spare.get(name).push(piece);
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = PiecePool;
} else {
  window.PiecePool = PiecePool;
}
