# Tower Defense

<img src="assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense" width="360">

A tower defense game in the world of *Avatar: The Last Airbender*, made for a phone as well as a desktop. Soldiers and spirits march along a road across a floating island; you stop them by **dragging a podium** for a bender onto the board. Each of the four nations has its own attack, with its own effect: air gusts, water slows, earth stuns and fire burns. In the last step you build **maps of your own** by dropping pieces onto a board.

Like the other series in this repo, each sample is also a step-by-step tutorial: every folder has a `TUTORIAL.md` you can follow from empty files, a `reset-tutorial.js` to go back to the start, and tests you can run in a browser.

**A fan project.** *Avatar: The Last Airbender* belongs to its owners. This is a non-commercial fan project, made to teach, and is not endorsed by them. Nothing of the show's own artwork, music or voices is used.

## What you need

- A desktop browser or a phone. There are no sensors and no camera, so nothing needs HTTPS, but a **web server** is needed from the first step, because the page loads models from files: run `npx serve` in the repo root.
- The models in `assets/` are already made web-sized. The originals are not in the repo (see the [assets README](assets/README.md)).

## The plan

| # | Sample | What it teaches |
|---|--------|-----------------|
| 1 | [Tower Defense World](tower_defense_world/README.md) ([tutorial](tower_defense_world/TUTORIAL.md)) | Models made web-sized, loaded into containers and copied as instances, measured and fitted to a cell, a board as data, an orthographic camera that fits any screen, a floating island made in code, drifting clouds, and a page for a phone |
| 2 | [Tower Defense Path](tower_defense_path/README.md) ([tutorial](tower_defense_path/TUTORIAL.md)) | A map as text that can be checked, autotiling (the piece in a cell from four bits, turned by shifting them), a route with rounded corners, a walker that knows only distance and time, and five enemies with skeletons that walk it at a speed that keeps their feet on the ground |
| 3 | [Tower Defense Benders](tower_defense_benders/README.md) ([tutorial](tower_defense_benders/TUTORIAL.md)) | A podium with a bender on it for each nation, animations with their root motion taken out so an attack stays on the podium, a table of numbers measured on the real clips, targeting as scores, a state machine that speaks in events, angles that wrap, and bolts that follow the enemy |
| 4 | [Tower Defense Build](tower_defense_build/README.md) ([tutorial](tower_defense_build/TUTORIAL.md)) | Dragging a podium onto the board: turning a place on the screen into a cell (two equations, two unknowns), a finger held above where it is, a drag told from a tap by a small state machine, one rule that says why not, an outline that fades from red to green at the same pace on any computer, a tray, gold, and a hand that is tested with no screen |
| 5 | [Tower Defense Waves](tower_defense_waves/README.md) ([tutorial](tower_defense_waves/TUTORIAL.md)) | Enemies with health that fall with their death animations, waves from a table turned into a timeline, a director whose state machine speaks in events, damage when a bolt arrives, a whole frame of the game as a function of a world (so a test plays a game with no screen), the readouts, and balance set by a simulation |
| 6 | Scenery | Props on the maps (a cabbage cart, a spirit shrine, a koi pond, a lemur perch), placed from the map's text, that take up a cell and that a tower can't be built on |
| 7 | Variety | Upgrades for the benders, and the fire bender's combo as rapid fire (one bolt for every punch) |
| 8 | Elements | An effect for each nation, and slowing, burning, stunning and pushing back |
| 9 | Screens | A title, pause, the end, scores and sound |
| 10 | Polish | A limit on how many enemies there are, the developer panel, a speed button |
| 11 | Editor | Building a map of your own by dropping pieces (and props) on the board, and checking that it can be played |

The plan may shift as each step teaches something unexpected.

## Credits

Everything in this series that you can see (apart from the code) was made by other people or given to this project, and they deserve the credit. See the [assets README](assets/README.md).

- The 3D models (the tiles, podiums, benders and enemies) were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence that allows them to be used, shared and modified. Credit to Meshy.
- The fonts, Cinzel and Lato, are under the SIL Open Font Licence.
