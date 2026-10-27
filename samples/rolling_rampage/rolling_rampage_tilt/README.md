# Rolling Rampage Tilt

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 3 of the Rolling Rampage series. Builds on [Rolling Rampage Marble](../rolling_rampage_marble/README.md). What's new is that on a phone you can **tip the phone like a tray**, and the marble rolls toward the edge that goes down. Tilt is a third kind of stick, added to the keyboard's and the thumb's, so everything after it (the direction in the world, the push on the marble) is the code that was already there.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Marble sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. **Tilt needs a secure page**: `http://localhost` is, and so is the live demo, but a phone opening `http://` plus your computer's address is not. To try tilt without a phone, use Chrome's device mode (F12, then Ctrl+Shift+M) and its **Sensors** panel; the tutorial's Step 5 has the details, and the ways to try it on a real phone.

**Tilt is turned into the same stick as everything else.** The sensor gives two angles, `beta` (forward and back) and `gamma` (left and right), in degrees. The right edge going down is `+gamma`, and the bottom edge going down is `+beta`, the top edge being raised. The tilt is turned by the angle the screen is turned, so on its side it still means "toward the edge that goes down, as seen on the screen". Then a **dead zone** hides a hand that isn't quite still, a **maximum** (20 degrees) is a full stick, and the stick is **eased** toward the tilt to take the jitter out of the sensor.

**A sensor is a bag of awkward facts, and each one is a sentence on the screen.** An iPhone has to be *asked* (`DeviceOrientationEvent.requestPermission`), and only from a tap, and the player can say no. Other phones just start sending readings. A computer's browser has the event but no sensor, and sends one empty reading. A page that isn't secure is sent nothing at all, and doesn't say so. `TiltInput` is a small state machine (`off`, `asking`, `waiting`, `ready`, `denied`, `unsupported`, `insecure`) and `TILT_MESSAGES` has a sentence for each, because a phone has no console.

**Level is wherever the player says.** Nobody plays holding the phone flat on a table. The way it is held when tilt starts is level, the **Set level** button says it again, and so does turning the phone on its side. The level is kept in the phone's own frame and subtracted *before* the tilt is turned to the screen's.

**Hardware is tested with a stand-in.** Everything `TiltInput` needs from the browser (what hears the events, the screen's angle, `DeviceOrientationEvent`, whether the page is secure) is passed in, with the real ones as defaults. The tests give it a fake target and send it readings by hand: permission granted and refused and thrown, no sensor, an insecure page, a switch-off while the question is up, calibration, a phone turned on its side, and the easing.

## Key code

**Which edge went down, and turned to the screen.**

```js
const inPhone = {
  x: wrapDegrees(this.reading.gamma - this.neutral.gamma), // right edge down
  y: -wrapDegrees(this.reading.beta - this.neutral.beta), // beta grows as the top goes up, so the top going down is minus
};
return screenTilt(inPhone, this.orientationAngle());
```

**A rotation by the screen's angle.**

```js
function screenTilt(tilt, angle) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: tilt.x * cos - tilt.y * sin, y: tilt.x * sin + tilt.y * cos };
}
```

**A dead zone and a maximum.**

```js
const strength = Math.min(1, (length - deadZone) / (max - deadZone));
return { x: (tilt.x / length) * strength, y: (tilt.y / length) * strength };
```

**Asking permission from a tap.**

```js
if (typeof this.OrientationEvent.requestPermission === "function") {
  this.state = "asking";
  answer = await this.OrientationEvent.requestPermission(); // throws if it isn't from a tap
}
```

**A third stick.**

```js
const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
marble.push(worldDirection(stick, camera.alpha));
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Marble
- (Tilt itself is the browser's: `deviceorientation`, `DeviceOrientationEvent.requestPermission`, `screen.orientation`, `window.isSecureContext`. Babylon.js is only what the stick is joined to.)

## Controls

- **Tilt: off / on** (a phone, or device mode) — switch tilt steering on. On an iPhone this asks for permission
- **Set level** — the way the phone is held now becomes level
- **Arrow keys or WASD**, or **touch and drag anywhere** — as before, and they work together with tilt
- **R**, or the **Drop again** button — put the marble back at the start
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the angle that wraps, the tilt turned for every way the screen can be turned, the dead zone and the maximum, the easing (including that it is the same however the time is cut up), and `TiltInput` with a fake sensor: permission, an insecure page, no sensor, the first reading, which edge is down, a screen on its side, calibration, and switching off.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

[**Rolling Rampage Levels**](../rolling_rampage_levels/README.md) draws courses as a grid of heights: ramps, holes, and falling off.
