// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is a copy of the previous sample, ../asteroids_polish, plus
// empty placeholders for the files the tutorial has you write. This
// overwrites your work in index.html, tests.html, js/ and tests/. It leaves
// TUTORIAL.md, README.md (if you've written one), and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;
const source = path.join(here, "..", "asteroids_polish");

// What the reset replaces. Everything else in this folder is left alone.
const RESET_PATHS = ["index.html", "tests.html", "js", "tests"];

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "js/models.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "js/chase.js": "// TODO: see TUTORIAL.md, step 5.\n",
  "js/ships.js": "// TODO: see TUTORIAL.md, step 6.\n",
  "js/splash.js": "// TODO: see TUTORIAL.md, step 8.\n",
  "tests/models.tests.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "tests/chase.tests.js": "// TODO: see TUTORIAL.md, step 5.\n",
  "tests/ships.tests.js": "// TODO: see TUTORIAL.md, step 6.\n",
  "tests/splash.tests.js": "// TODO: see TUTORIAL.md, step 8.\n",
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
  for (const name of RESET_PATHS) {
    fs.cpSync(path.join(source, name), path.join(here, name), { recursive: true });
  }

  // The copied page is still titled as the previous sample.
  const indexPath = path.join(here, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  fs.writeFileSync(indexPath, html.replace("<title>Asteroids Polish - Babylon.js</title>", "<title>Asteroids Next Steps - Babylon.js</title>"));

  for (const [name, contents] of Object.entries(PLACEHOLDERS)) {
    fs.writeFileSync(path.join(here, name), contents);
  }
};

const main = async () => {
  if (!fs.existsSync(source)) {
    console.error(`Can't find the starting files at ${source}`);
    process.exit(1);
  }

  if (!process.argv.includes("--yes")) {
    console.log("This will overwrite index.html, tests.html, js/ and tests/ in this folder");
    console.log("with the tutorial's starting point. Your changes there will be lost.");
    if (!(await confirm("Continue? (y/N) "))) {
      console.log("Cancelled. Nothing was changed.");
      return;
    }
  }

  reset();
  console.log("Done. Open TUTORIAL.md and start at Step 1.");

  if (fs.existsSync(path.join(here, "README.md"))) {
    console.log("Note: README.md was left as it was. Delete it too if it describes finished code.");
  }
};

main();
