# Model Lab: Animations

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

Step 3 of the [Model Lab](../README.md) series. Builds on [Model Lab: Skeleton](../model_lab_skeleton/README.md). A **player** for a model's animation clips, like the one in a video app: a list of the clips (with their lengths), play, pause, stop (back to the rest pose), step a frame at a time, a scrubber to any moment, speed from a tenth to double, loop, and a **cross-fade** from one clip into the next so that the model flows instead of jumping. The skeleton from the last sample moves with the clip. Open *Inside the clip* to see what a clip is made of: its tracks, what each moves, and how many keyframes.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, with a list of the words it uses at the start. Run `node reset-tutorial.js` to return this folder to the Skeleton sample, to work through the changes yourself.

The page loads model files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`.

**A clip counts frames, not seconds.** Its length is its frames divided by its frame rate (the lab's clips run at 60), and the same frames at another rate are a different time. `clipInfo` reads that into data, and the tests prove it on a clip that can be held in the head as well as on the real ones.

**Every clip needs exactly the bones of the skeleton.** A clip's *targets* are the names of everything it moves. A test checks that every clip of the fire bender moves exactly the 24 bones of its skeleton, and that the air bender's and the heavy's clips need the same 24. That is why clips can be borrowed between these characters, and it is the check that will say when a clip does not fit.

**A cross-fade is two weights that add up to 1.** For a short time both clips play: the old one's weight falls from 1 to 0 as the new one's rises from 0 to 1, on a smoothstep curve that has no sudden start or stop. The outgoing weight is made as `1 - incoming`, so they cannot fail to add up, and a test checks it at a dozen moments. If they added up to less, the model would dip towards its rest pose in the middle.

**Stop has to put the model back.** Babylon.js leaves a model where a stopped clip left it, so the player writes down the rest pose before anything has played and puts it back on Stop. A test proves the rest pose is not the first frame of a clip.

**The player has no buttons in it.** It is a class with `play`, `pause`, `seek`, `step`, `stop`, and an `update(dt)` that runs the fade from the time that it is told has passed (not from a clock), so a test runs a whole cross-fade in four calls.

**The scrubber lets go while you hold it.** It follows the clip every frame, but while you drag it the panel leaves it alone.

## Key code

```js
function fadeAmount(elapsed, duration) {
  if (!(duration > 0)) return 1;
  const t = Math.min(Math.max(elapsed / duration, 0), 1);
  return t * t * (3 - 2 * t);
}
```

## Controls

- Click a **clip** to play it; click another while one plays to cross-fade into it
- **Play / Pause**, **Stop** (back to the rest pose), **-1 frame** and **+1 frame**, the **scrubber**, the **Speed** and **Fade** sliders, and **Loop**
- **Open "Inside the clip"** to see its tracks; **click a joint** on the skeleton as in the last sample
- **Space** takes a screenshot
