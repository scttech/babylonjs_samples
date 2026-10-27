// Resets this folder to the starting point of TUTORIAL.md so you can work
// through it again from the beginning.
//
//   node reset-tutorial.js          (asks for confirmation first)
//   node reset-tutorial.js --yes    (skips the confirmation)
//
// "The beginning" is a copy of the previous sample, ../rolling_rampage_levels, with its one
// stylesheet cut into a file for each part of the page (see splitStylesheet), plus
// empty placeholders for the files the tutorial has you write. This
// overwrites your work in index.html, tests.html, css/, js/ and tests/. It leaves
// TUTORIAL.md, README.md, and this script alone.
//
// Needs Node.js 16.7 or newer. No packages to install.

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const here = __dirname;
const source = path.join(here, "..", "rolling_rampage_levels");

// What the reset replaces. Everything else in this folder is left alone.
const RESET_PATHS = ["index.html", "tests.html", "css", "js", "tests"];

// Files you write during the tutorial, restored as placeholders.
const PLACEHOLDERS = {
  "js/clock.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "tests/clock.tests.js": "// TODO: see TUTORIAL.md, step 1.\n",
  "js/zones.js": "// TODO: see TUTORIAL.md, steps 2 and 3.\n",
  "tests/zones.tests.js": "// TODO: see TUTORIAL.md, steps 2 and 3.\n",
};

// The previous sample has a single css/game.css, with a comment above each part of the page. From here on
// each part has a file of its own. The stylesheet is cut where those comments are, and the files are
// named for what they style, in the order the page loads them.
const STYLE_PARTS = [
  ["/* The look of Rolling Rampage", "theme.css"],
  ["/* .hint has pointer-events", "page.css"],
  ["/* The splash covers", "splash.css"],
  ["/* A button for pressing", "buttons.css"],
  ["/* The back button and the hint stay above", "page.css"],
  ["/* Touch. The page must not scroll", "page.css"],
  ["/* A small screen", "responsive.css"],
  ["/* The stick:", "stick.css"],
  ["/* A reminder of how to steer", "stick.css"],
  ["/* Tilt.", "tilt.css"],
  ["/* Levels.", "levels.css"],
];
const STYLE_FILES = ["theme.css", "page.css", "splash.css", "buttons.css", "responsive.css", "stick.css", "tilt.css", "levels.css"];

const splitStylesheet = () => {
  const cssPath = path.join(here, "css", "game.css");
  const lines = fs.readFileSync(cssPath, "utf8").split(/\r?\n/);
  const chunks = [];
  for (const line of lines) {
    if (line.startsWith("/*") && (chunks.length === 0 || STYLE_PARTS.some(([start]) => line.startsWith(start)))) chunks.push([]);
    chunks[chunks.length - 1].push(line);
  }
  const files = {};
  for (const chunk of chunks) {
    const part = STYLE_PARTS.find(([start]) => chunk[0].startsWith(start));
    if (!part) throw new Error("A part of css/game.css has no file: " + chunk[0]);
    (files[part[1]] = files[part[1]] || []).push(chunk.join("\n").replace(/\s+$/, "") + "\n");
  }
  for (const name of STYLE_FILES) fs.writeFileSync(path.join(here, "css", name), files[name].join("\n"));
  fs.rmSync(cssPath);

  // One <link> for each file, in the same order.
  const indexPath = path.join(here, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const links = STYLE_FILES.map((name) => `  <link rel="stylesheet" href="css/${name}">`).join("\n");
  fs.writeFileSync(indexPath, html.replace('  <link rel="stylesheet" href="css/game.css">', links));
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

  // The copied pages are still titled as the previous sample.
  const indexPath = path.join(here, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  fs.writeFileSync(indexPath, html.replace("<title>Rolling Rampage Levels - Babylon.js</title>", "<title>Rolling Rampage Clock - Babylon.js</title>"));
  const testsPath = path.join(here, "tests.html");
  const tests = fs.readFileSync(testsPath, "utf8");
  fs.writeFileSync(testsPath, tests.replace("<title>Rolling Rampage Levels tests - Babylon.js Samples</title>", "<title>Rolling Rampage Clock tests - Babylon.js Samples</title>"));

  splitStylesheet();

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
