# Parkour Runner

<img src="parkour_runner_splash.png" alt="Parkour Runner" width="480">

An endless parkour runner through a city street, built up one step at a time in the same incremental style as the [Asteroids](../asteroids/README.md) series. Where Asteroids drew flat line art and added 3D at the end, this one is real 3D from the first step: a perspective camera behind the runner, animated characters, and models for the whole street.

## Roadmap

| # | Sample | Topic |
|---|--------|-------|
| 1 | [Parkour Runner World](parkour_runner_world/README.md) ([tutorial](parkour_runner_world/TUTORIAL.md)) | A street built from real 3D pieces, a perspective camera, fog and lights, loading each piece once and placing instances of it |
| 2 | [Parkour Runner Runner](parkour_runner_runner/README.md) ([tutorial](parkour_runner_runner/TUTORIAL.md)) | An animated character with clips and blending, easing between three lanes, a follow camera |
| 3 | Parkour Runner Street | An endless street, recycled as the runner moves through it |
| 4 | Parkour Runner Moves | Jump, slide, roll and vault, played with the character's animation clips |
| 5 | Parkour Runner Obstacles | Barriers, fences and containers that appear ahead, and collisions with them |
| 6 | Parkour Runner Score | Coins, distance, a rising speed, and a combo for clean moves |
| 7 | Parkour Runner Polish | A title screen, pause, sounds, effects, and a choice of runner |

The plan may shift as each step teaches something unexpected.

## Assets

The models come from free CC0 packs by [Kenney](https://www.kenney.nl) and [Quaternius](https://quaternius.com), trimmed to what the series uses. See [the assets README](assets/README.md) for the list and the credits.

**These samples need a web server.** Browsers won't let a page opened straight from a file load `.glb` models. Run `npx serve` in the repo's root folder and open the sample through `http://localhost`, or use the live gallery. (Each sample's `tests.html` loads no models and still works from a file.)
