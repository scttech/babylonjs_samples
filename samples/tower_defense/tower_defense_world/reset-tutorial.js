// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is an empty placeholder for every file the tutorial has you
// write. This overwrites your work in index.html, tests.html, css/, js/ and tests/.
// It leaves TUTORIAL.md, README.md, and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;

// What the reset replaces. Everything else in this folder is left alone.
const RESET_PATHS = ["index.html", "tests.html", "css", "js", "tests"];

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "index.html": "<!-- TODO: see TUTORIAL.md, Step 1. -->\n",
  "tests.html": "<!-- TODO: see TUTORIAL.md, Step 2. -->\n",
  "css/theme.css": "/* TODO: see TUTORIAL.md, Step 1. */\n",
  "css/page.css": "/* TODO: see TUTORIAL.md, Step 1. */\n",
  "css/splash.css": "/* TODO: see TUTORIAL.md, Step 1. */\n",
  "js/board.js": "// TODO: see TUTORIAL.md, Step 2.\n",
  "js/view.js": "// TODO: see TUTORIAL.md, Step 3.\n",
  "js/models.js": "// TODO: see TUTORIAL.md, Step 4.\n",
  "js/tiles.js": "// TODO: see TUTORIAL.md, Step 5.\n",
  "js/random.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "js/island.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "js/sky.js": "// TODO: see TUTORIAL.md, Step 7.\n",
  "js/splash.js": "// TODO: see TUTORIAL.md, Step 8.\n",
  "js/main.js": "// TODO: see TUTORIAL.md, Step 8.\n",
  "tests/board.tests.js": "// TODO: see TUTORIAL.md, Step 2.\n",
  "tests/view.tests.js": "// TODO: see TUTORIAL.md, Step 3.\n",
  "tests/models.tests.js": "// TODO: see TUTORIAL.md, Step 4.\n",
  "tests/tiles.tests.js": "// TODO: see TUTORIAL.md, Step 5.\n",
  "tests/random.tests.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "tests/island.tests.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "tests/sky.tests.js": "// TODO: see TUTORIAL.md, Step 7.\n",
  "tests/splash.tests.js": "// TODO: see TUTORIAL.md, Step 8.\n",
};

const confirm = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });

const reset = () => {
  for (const name of RESET_PATHS) {
    fs.rmSync(path.join(here, name), { recursive: true, force: true });
  }
  for (const [name, contents] of Object.entries(PLACEHOLDERS)) {
    const file = path.join(here, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
};

const main = async () => {
  if (!process.argv.includes("--yes")) {
    console.log("This will overwrite index.html, tests.html, css/, js/ and tests/ in this folder");
    console.log("with the tutorial's starting point. Your changes there will be lost.");
    if (!(await confirm("Continue? (y/N) "))) {
      console.log("Cancelled. Nothing was changed.");
      return;
    }
  }

  reset();
  console.log("Done. Open TUTORIAL.md and start at Step 1.");
};

main();
