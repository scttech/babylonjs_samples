# Ghost Hunter

<img src="assets/images/ghost_hunter_logo.webp" alt="Ghost Hunter" width="360">

An augmented reality ghost hunt for your phone. The camera shows the room you are standing in, a 3D scene is drawn over it, and the dead turn up in your room: ghosts that drift through the walls, ghouls that lurch out of the dark, spiders that crawl across the ceiling. Find them with a flashlight and a detector, and capture them before they get to you.

It is made to be **creepy on purpose**, with sudden scares, flashing light and loud sound, so every sample has a content warning at the start, and a later one adds a scare-level setting and a calm mode.

Like the other series in this repo, each sample is also a step-by-step tutorial: every folder has a `TUTORIAL.md` you can follow from empty files, a `reset-tutorial.js` to go back to the start, and tests you can run in a browser. Every sample has a **`?dev`** mode: add it to the address and a panel appears with sliders and read-outs for the things worth watching while you play.

## What you need

- A **phone** is what the game is made for. An Android phone with Chrome gets real augmented reality (WebXR) from the second sample on. An iPhone gets the camera version: the camera's picture behind the scene, and the motion sensors to look around.
- A **desktop** can run everything except the sensors: you drag to look, and a dark room with a floor takes the place of the camera's picture. All the rules are plain arithmetic with tests, so most of the game can be built and tried without a phone.
- **HTTPS.** A phone only lets a page use its camera and its motion sensors if the page comes over HTTPS (a page on `localhost` counts, but only on the same computer). To try a sample on a phone, use the published gallery, or open a tunnel to your computer: `npx serve` in the repo root, and in another terminal a tunnel such as `npx localtunnel --port 3000` or `cloudflared tunnel --url http://localhost:3000`, then open the address it prints on the phone.

## The plan

| # | Sample | What it teaches |
|---|--------|-----------------|
| 1 | [Ghost Hunter Room](ghost_hunter_room/README.md) ([tutorial](ghost_hunter_room/TUTORIAL.md)) | The camera's picture behind a see-through 3D scene, the motion sensors of a phone (and the permission an iPhone asks for), looking around by dragging as the fallback, a start screen with a content warning, and what a device can do worked out from a description of it |
| 2 | Real AR | A WebXR session, finding the floor and the walls with hit tests, a reticle, anchors, and one way of looking that is either WebXR or the camera version |
| 3 | Apparitions | A ghost made in code: a see-through shader, a wispy trail, flicker, fading in and out, and mist |
| 4 | Creatures | Spiders, ghouls and skeletons from models, with walks, crawls and lunges, and spiders that crawl on the surfaces the phone found |
| 5 | The Hunt | A director that decides what appears, where and when: behind you, at the edge of the view, out of a wall |
| 6 | Jump Scares | Build-up, silence and then the lunge, with sound that comes from where the creature is, vibration, and a scare-level setting |
| 7 | Tools | A flashlight that reveals, a capture beam that drains and traps, and a weakness for each creature |
| 8 | Detectors | An EMF meter, a radar, a spirit box you tune, and thermal vision, all made from the same numbers about where things are |
| 9 | Rounds | Rounds and difficulty, health and a sanity meter that makes the screen go wrong, a ghost journal of everything caught, and scores kept in the browser |
| 10 | Polish | Calm mode, install as an app, a photo of the scare, and testing on real phones |

The plan may shift as each step teaches something unexpected.

## Credits

Everything in this series that you can see or hear (apart from the code) was made by other people and shared for free, and they deserve the credit. See the [assets README](assets/README.md).
