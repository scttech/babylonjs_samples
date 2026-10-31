// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is the finished ../ghost_hunter_apparitions sample, with an empty placeholder for every
// new file the tutorial has you write. This overwrites your work in css/, js/ and tests/.
// It leaves index.html and tests.html (which already list the new files), TUTORIAL.md,
// README.md, and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;
const previous = path.join(here, "..", "ghost_hunter_apparitions");

// What the reset replaces, taken from the sample before this one. Everything else in this folder is left alone.
const RESET_PATHS = ["css", "js", "tests"];

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "js/creatures.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "js/creaturemesh.js": "// TODO: see TUTORIAL.md, step 2.\n",
  "tests/creatures.tests.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "tests/creaturemesh.tests.js": "// TODO: see TUTORIAL.md, step 2.\n",
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
    fs.cpSync(path.join(previous, name), path.join(here, name), { recursive: true });
  }
  for (const [name, contents] of Object.entries(PLACEHOLDERS)) {
    const file = path.join(here, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
};

const main = async () => {
  if (!fs.existsSync(previous)) {
    console.log("This tutorial starts from the finished ghost_hunter_apparitions sample, which should be next to this folder, and is not.");
    return;
  }
  if (!process.argv.includes("--yes")) {
    console.log("This will overwrite css/, js/ and tests/ in this folder");
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
