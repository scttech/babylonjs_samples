# Rooftop Parkour Touch

Step 9 of the Rooftop Parkour series. Builds on [Rooftop Parkour Screens](../rooftop_parkour_screens/README.md). The game needed a keyboard and a mouse; now it can be played on a **phone held sideways**: a **thumb stick** under the left thumb (push it all the way to sprint), a **drag to look** on the right of the screen, a **jump** button, and a **pause** button. The controller does not know whether it is told to run by a key or a thumb: both speak the same language, `{ forward, right, sprint, jump }`.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Screens sample. Run `node reset-tutorial.js` to return this folder to the Screens sample, to work through the changes yourself.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost` (a phone needs the page over the network: see the [series README](../README.md)). Add **`?dev`** to the address for the developer panel, and **`?touch`** to switch the touch controls on with a mouse (a press and drag is a thumb), or **`?touch=off`** to switch them off on a phone.

**A thumb is a number.** `stickValue` is how far the thumb has gone from where it was put down, from nothing to one. The first part of the reach is a **dead zone** (a thumb is never quite still) and the rest is stretched to fill the range, so the push grows smoothly from nothing. A push nearly all the way is a sprint; less is a jog. The stick measures from **where the thumb went down**, so the player puts it where their thumb is, and the ring is drawn there.

**A finger is an id.** A touch screen can have several fingers on it, and each is told apart by a pointer id that stays the same until it comes up. The stick remembers its finger's id and listens to no other, so a thumb that slides across to the right half of the screen is still the stick's, and a cancelled touch (a notification, a palm) is an ended one, or the runner would run forever.

**One language.** `mergeInput` puts the keyboard and the thumbs together (the larger push, a sprint or a jump from either), so a hybrid works and nothing else in the game has to know which it is hearing. A phone has no mouse to take, so Play and Resume do not ask for the pointer lock, and a phone held upright is a pause.

## Key code

**The dead zone, stretched.**

```js
const amount = reach <= table.deadZone ? 0 : (reach - table.deadZone) / (1 - table.deadZone);
```

**A finger keeps its job.**

```js
move(id, x, y) {
  if (id !== this.id) return;
```

**The same language as the keys.**

```js
const input = touch.enabled ? mergeInput(moveInput(heldKeys), touch.input()) : moveInput(heldKeys);
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Screens
- Pointer events with pointer ids on the canvas, `setPointerCapture`, and `touch-action: none` so the page does not scroll or zoom under a drag
- (The thumbs themselves need no Babylon.js: the arithmetic, the stick and the look pad are plain code, tested with made-up pointer events.)

## Controls

- Everything from the Screens sample, with a keyboard and mouse
- On a phone held sideways (or with `?touch`): the **left** of the screen is a stick (push all the way to sprint), the **right** looks, **JUMP** (hold for a long jump), and the **II** at the top pauses
- With **`?dev`**: a **Touch** section with the reach of the stick, the dead zone, where the sprint begins, how far a drag looks, a switch for touch controls, and read-outs of the fingers

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the stick (the dead zone, the stretch, the sprint), what a phone is, which fingers do what (made-up pointer events are sent to a plain element), that each finger keeps its job, what is drawn where the thumb went down, and the jump button.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The district is a handcrafted map. The last sample, [Rooftop Parkour Generator](../rooftop_parkour_generator/README.md), is the **generator**: a city made from a seed that follows the same rules for what can be jumped.
