// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is a copy of the previous sample, ../rooftop_parkour_world, plus
// empty placeholders for the files the tutorial has you write. This
// overwrites your work in index.html, tests.html, css/, js/ and tests/. It leaves
// TUTORIAL.md, README.md, and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;
const source = path.join(here, "..", "rooftop_parkour_world");

// What the reset replaces. Everything else in this folder is left alone.
const RESET_PATHS = ["index.html", "tests.html", "css", "js", "tests"];

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "js/collision.js": "// TODO: see TUTORIAL.md, step 2.\n",
  "js/controller.js": "// TODO: see TUTORIAL.md, step 3.\n",
  "tests/collision.tests.js": "// TODO: see TUTORIAL.md, step 2.\n",
  "tests/controller.tests.js": "// TODO: see TUTORIAL.md, step 3.\n",
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

  // The copied pages are titled as the previous sample, and don't list the new scripts yet.
  const edit = (name, changes) => {
    const file = path.join(here, name);
    let text = fs.readFileSync(file, "utf8");
    for (const [from, to] of changes) text = text.replace(from, to);
    fs.writeFileSync(file, text);
  };
  const scripts = (indent, folder, names) => names.map((n) => `${indent}<script src="${folder}/${n}"></script>`).join("\n");
  edit("index.html", [
    ["<title>Rooftop Parkour World - Babylon.js</title>", "<title>Rooftop Parkour Run - Babylon.js</title>"],
    ['  <script src="js/scout.js"></script>', `  <script src="js/scout.js"></script>\n${scripts("  ", "js", ["collision.js", "controller.js"])}`],
  ]);
  edit("tests.html", [
    ["<title>Rooftop Parkour World tests - Babylon.js Samples</title>", "<title>Rooftop Parkour Run tests - Babylon.js Samples</title>"],
    ['  <script src="js/scout.js"></script>', `  <script src="js/scout.js"></script>\n${scripts("  ", "js", ["collision.js", "controller.js"])}`],
    ['  <script src="tests/scout.tests.js"></script>', `  <script src="tests/scout.tests.js"></script>\n${scripts("  ", "tests", ["collision.tests.js", "controller.tests.js"])}`],
  ]);

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
    console.log("This will overwrite index.html, tests.html, css/, js/ and tests/ in this folder");
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
