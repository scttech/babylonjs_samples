# Rolling Rampage

<img src="assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

An isometric marble game in the spirit of the classic arcade games, built with real physics (the Havok engine) and made to be played on a phone as well as a desktop, with the option of **tilting the phone** to steer. You roll a steel marble down courses of ramps and ledges, against the clock, past pistons and moving platforms, with enemy marbles chasing you. The levels, the look and the sounds are all original.

Like the other series in this repo, each sample is also a step-by-step tutorial: every folder has a `TUTORIAL.md` you can follow from empty files, a `reset-tutorial.js` to go back to the start, and tests you can run in a browser.

The game is built from boxes and spheres and code. There are no 3D models to download. Its look (riveted gunmetal, chrome, hazard-stripe yellow, safety orange, and the fonts Russo One, Barlow Condensed and Saira Stencil One) is taken from the logo; see the [assets README](assets/README.md).

## The plan

| # | Sample | What it teaches |
|---|--------|-----------------|
| 1 | [Rolling Rampage World](rolling_rampage_world/README.md) ([tutorial](rolling_rampage_world/TUTORIAL.md)) | Loading Havok, bodies, gravity, friction and bounce, a course made from data, a marble, an isometric camera, a page for a phone, and testing physics with no screen |
| 2 | [Rolling Rampage Marble](rolling_rampage_marble/README.md) ([tutorial](rolling_rampage_marble/TUTORIAL.md)) | Steering with forces: keyboard and a floating touch stick, controls relative to the camera, a push that fades near top speed, and a ground check with a ray |
| 3 | [Rolling Rampage Tilt](rolling_rampage_tilt/README.md) ([tutorial](rolling_rampage_tilt/TUTORIAL.md)) | Steering by tipping the phone like a tray: the motion sensor, asking permission, calibration, a dead zone and easing, and testing hardware with a fake sensor |
| 4 | [Rolling Rampage Levels](rolling_rampage_levels/README.md) ([tutorial](rolling_rampage_levels/TUTORIAL.md)) | A course drawn as a grid of heights becomes a mesh the marble rolls on: ramps and holes, walls, a mesh physics shape, a fall limit, and going on to the next level |
| 5 | [Rolling Rampage Clock](rolling_rampage_clock/README.md) ([tutorial](rolling_rampage_clock/TUTORIAL.md)) | A countdown, a goal and checkpoints with bonus seconds: the rules of a run as a state machine, and Havok trigger zones |
| 6 | [Rolling Rampage Hazards](rolling_rampage_hazards/README.md) ([tutorial](rolling_rampage_hazards/TUTORIAL.md)) | A moving platform, a piston and slime: motion as a function of time, animated physics bodies, carrying a rolling marble, and a hazard that builds up |
| 7 | [Rolling Rampage Enemies](rolling_rampage_enemies/README.md) ([tutorial](rolling_rampage_enemies/TUTORIAL.md)) | Marbles that chase you: reusing a class with options, a chase as a state machine, collision events, and a hit with a cooldown |
| 8 | [Rolling Rampage Screens](rolling_rampage_screens/README.md) ([tutorial](rolling_rampage_screens/TUTORIAL.md)) | A mirror-chrome pinball marble, a game as a state machine, a title, a pause, a score and a leaderboard remembered in the browser, sound made in code, and screens that fit a phone |
| 9 | Rolling Rampage Polish | Effects, finishing touches |

The plan may shift as each step teaches something unexpected.

## Playing on a phone

Every step works on a phone. Tilt steering needs the page to be served over **HTTPS** (browsers don't give a page the motion sensors otherwise), which the live demo is. The [Tilt tutorial](rolling_rampage_tilt/TUTORIAL.md) explains how to test it on your own phone.
