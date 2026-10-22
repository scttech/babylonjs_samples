# Parkour Runner

<img src="assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

An endless parkour runner through a city street, built up one step at a time in the same incremental style as the [Asteroids](../asteroids/README.md) series. Where Asteroids drew flat line art and added 3D at the end, this one is real 3D from the first step: a perspective camera behind the runner, animated characters, and models for the whole street.

## Roadmap

| # | Sample | Topic |
|---|--------|-------|
| 1 | [Parkour Runner World](parkour_runner_world/README.md) ([tutorial](parkour_runner_world/TUTORIAL.md)) | A street built from real 3D pieces, a perspective camera, fog and lights, loading each piece once and placing instances of it |
| 2 | [Parkour Runner Runner](parkour_runner_runner/README.md) ([tutorial](parkour_runner_runner/TUTORIAL.md)) | An animated character with clips and blending, easing between three lanes, a follow camera |
| 3 | [Parkour Runner Street](parkour_runner_street/README.md) ([tutorial](parkour_runner_street/TUTORIAL.md)) | An endless street: streaming pieces in ahead, recycling them from behind with a pool |
| 4 | [Parkour Runner Moves](parkour_runner_moves/README.md) ([tutorial](parkour_runner_moves/TUTORIAL.md)) | Jump, slide, and dive into a roll: a state machine, exact gravity, and clips played to fit each move |
| 5 | [Parkour Runner Obstacles](parkour_runner_obstacles/README.md) ([tutorial](parkour_runner_obstacles/TUTORIAL.md)) | Barriers to jump or vault, bars to slide under, containers to dodge; box collisions that use the runner's height; a course that can always be beaten |
| 6 | [Parkour Runner Score](parkour_runner_score/README.md) ([tutorial](parkour_runner_score/TUTORIAL.md)) | Coins, distance, a rising speed, and a combo for clean moves, shown with Babylon.js GUI |
| 7 | Parkour Runner Polish | A title screen, pause, sounds, effects, and a choice of runner |

The plan may shift as each step teaches something unexpected.

## Assets

The models come from free CC0 packs by [Kenney](https://www.kenney.nl) and [Quaternius](https://quaternius.com), trimmed to what the series uses. See [the assets README](assets/README.md) for the list and the credits.

**These samples need a web server.** Browsers won't let a page opened straight from a file load `.glb` models. Run `npx serve` in the repo's root folder and open the sample through `http://localhost`, or use the live gallery. (Each sample's `tests.html` loads no models and still works from a file.)
