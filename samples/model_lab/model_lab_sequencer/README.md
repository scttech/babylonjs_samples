# Model Lab: Sequencer

<img src="../assets/images/model_lab_logo_small.webp" alt="GLB Model Lab" width="360">

Step 4 of the [Model Lab](../README.md) series. Builds on [Model Lab: Animations](../model_lab_animations/README.md). A **sequence** is a list of clips that play one after another by themselves, with a cross-fade built into each join: walk, then run, then strike, then settle into an idle. The page has a list of steps you can edit (the clip, how many **times** it plays, its **speed**, move up, move down, take away), a **timeline** that draws every step as a bar so that you can see where they overlap, and play, pause, stop and scrub controls for the whole sequence. **Loop** it and the last step fades into the first. *Suggest one* makes a sequence that suits whatever model is open, from its clip names.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, with a list of the words it uses at the start. Run `node reset-tutorial.js` to return this folder to the Animations sample, to work through the changes yourself.

The page loads model files, so it needs a **web server**: run `npx serve` in the repo root and open the sample through `http://localhost`.

**Three ways to combine clips.** A *cross-fade* changes from one clip to another when you click; a *chain* (this sample) is a list of clips that plays on its own; a *layer* plays two clips at once on different parts of the body (a later sample).

**A step begins before the one before it ends.** That overlap is the cross-fade, and it is held to half of the shorter of the two steps so that a fade never reaches back past the start of the step before. Between two steps of the same clip there is no fade, because a clip cannot be blended with itself.

**The plan is a function of time.** `poseAt(plan, time)` says which clips are playing, how far into each, and how much each counts, from the time and nothing else, so scrubbing a whole sequence and playing it are the same thing, and tests can ask about any moment. Tests check that the weights add up to 1 at every one of hundreds of moments, with fades of every length, with steps that repeat and run fast, and with loops.

**A paused clip ignores its weight.** The sequencer does not let Babylon.js run the clips: it holds each one at almost no speed and moves it to a frame by hand every frame, which *does* blend. A test stops in the middle of a fade and checks that the hips are exactly halfway between where each clip puts them alone.

**The sequencer and the clip player take turns.** Playing a sequence stops the clip player, and using the clip player makes the sequence let go. The one that does not have the clips never touches them.

## Key code

```js
step.fadeIn = fadeBetween(planned[at - 1], step, fade);
step.start = planned[at - 1].end - step.fadeIn;
```

## Controls

- **Add step**, **Suggest one**, and on each step: the clip, **times** and **speed**, `^` and `v` to move it, `x` to take it away
- **Fade** (how long the joins are) and **Loop the sequence**
- **Play sequence / Pause**, **Stop**, and the **scrubber** over the whole sequence; the red line on the timeline is where it is
- The clip player above still works: clicking a clip in it stops the sequence
- **Space** takes a screenshot
