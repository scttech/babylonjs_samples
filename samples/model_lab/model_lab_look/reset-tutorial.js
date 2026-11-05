// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is an empty placeholder for every file the tutorial has you write. This overwrites your work in
// css/, js/ and tests/. It leaves index.html and tests.html (which already list the files), TUTORIAL.md,
// README.md, and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "js/units.js": "// TODO: see TUTORIAL.md, Step 1.\n",
  "tests/units.tests.js": "// TODO: see TUTORIAL.md, Step 1.\n",
  "js/loader.js": "// TODO: see TUTORIAL.md, Step 2.\n",
  "tests/loader.tests.js": "// TODO: see TUTORIAL.md, Step 2.\n",
  "js/inspect.js": "// TODO: see TUTORIAL.md, Step 3.\n",
  "tests/inspect.tests.js": "// TODO: see TUTORIAL.md, Step 3.\n",
  "js/frame.js": "// TODO: see TUTORIAL.md, Step 4.\n",
  "tests/frame.tests.js": "// TODO: see TUTORIAL.md, Step 4.\n",
  "js/viewer.js": "// TODO: see TUTORIAL.md, Step 5.\n",
  "tests/viewer.tests.js": "// TODO: see TUTORIAL.md, Step 5.\n",
  "js/panel.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "tests/panel.tests.js": "// TODO: see TUTORIAL.md, Step 6.\n",
  "js/main.js": "// TODO: see TUTORIAL.md, Step 7.\n",
  "css/theme.css": "/* TODO: see TUTORIAL.md, Step 7. */\n",
  "css/lab.css": "/* TODO: see TUTORIAL.md, Step 7. */\n",
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
  for (const [name, contents] of Object.entries(PLACEHOLDERS)) {
    const file = path.join(here, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
};

const main = async () => {
  if (!process.argv.includes("--yes")) {
    console.log("This will overwrite the files in css/, js/ and tests/ in this folder");
    console.log("with empty placeholders. Your changes there will be lost.");
    if (!(await confirm("Continue? (y/N) "))) {
      console.log("Cancelled. Nothing was changed.");
      return;
    }
  }

  reset();
  console.log("Done. Open TUTORIAL.md and start at Step 1.");
};

main();
