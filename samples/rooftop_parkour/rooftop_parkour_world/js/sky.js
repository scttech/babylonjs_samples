// The sky and the sun, by the time of day. Where the sun is (sunAt) and what the light looks like when it is there (skyLook) are plain
// functions of the hour, so they can be tested, and so the developer panel can ask for any hour and see the district in it. The
// Sky class then puts those numbers on the lights, the sky and the fog of a scene. See ../tests/sky.tests.js.

// The hours of the day the game shows. The sun rises at 6 and sets at 18, and the range stops half an hour short of each, where the sun
// is still a few degrees up: the sky material has no night, and goes black when the sun goes below the horizon.
const HOURS = { sunrise: 6, sunset: 18, min: 6.5, max: 17.5, start: 14 };

// How high the sun gets at noon, in radians (about 69 degrees: it is a city in the summer).
const NOON_ELEVATION = 1.2;

// Where the sun is at an hour: its height above the horizon (`elevation`, in radians, below 0 when it is under it) and how far it
// has gone from east round to west (`azimuth`, 0 to PI between sunrise and sunset). `toSun` is a unit vector from the world toward
// the sun (x is east, z is north, so a sun in the south has a negative z), and `light` is the way the light travels, which is the
// opposite way.
function sunAt(hour) {
  const day = (hour - HOURS.sunrise) / (HOURS.sunset - HOURS.sunrise);
  const elevation = Math.sin(Math.PI * day) * NOON_ELEVATION;
  const azimuth = Math.PI * day;
  const toSun = { x: Math.cos(azimuth) * Math.cos(elevation), y: Math.sin(elevation), z: -Math.sin(azimuth) * Math.cos(elevation) };
  return { elevation, azimuth, toSun, light: { x: -toSun.x, y: -toSun.y, z: -toSun.z } };
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// What the light looks like when the sun is a number of degrees above the horizon: the colour and strength of the sun, the colour
// and strength of the light from the sky and from the ground, and the colour of the fog and the horizon. They are keyframes, and
// everything between is a blend of the two on either side.
const LOOKS = [
  { deg: -9, sun: "#ff7a3a", sunStrength: 0, sky: "#39446a", ground: "#1c1e28", ambient: 0.35, fog: "#3b4666" },
  { deg: 0, sun: "#ff8a45", sunStrength: 0.4, sky: "#8a7a92", ground: "#3a3230", ambient: 0.5, fog: "#d79c78" },
  { deg: 8, sun: "#ffb070", sunStrength: 1.0, sky: "#a9b4d0", ground: "#4a4640", ambient: 0.65, fog: "#e8c9a4" },
  { deg: 25, sun: "#ffe0b8", sunStrength: 1.5, sky: "#b5cdee", ground: "#5a5f6a", ambient: 0.8, fog: "#cfe0f2" },
  { deg: 60, sun: "#fff6e8", sunStrength: 1.8, sky: "#bcd8f7", ground: "#666b75", ambient: 0.9, fog: "#d6e8f8" },
].map((look) => ({ ...look, sun: hexToRgb(look.sun), sky: hexToRgb(look.sky), ground: hexToRgb(look.ground), fog: hexToRgb(look.fog) }));

const mix = (a, b, t) => a + (b - a) * t;
const mixColor = (a, b, t) => a.map((value, i) => mix(value, b[i], t));

// The look of the light with the sun at an elevation in radians. Beyond the first and last keyframe, the look stays as it is there.
function skyLook(elevation) {
  const deg = (elevation * 180) / Math.PI;
  if (deg <= LOOKS[0].deg) return lookOf(LOOKS[0]);
  if (deg >= LOOKS[LOOKS.length - 1].deg) return lookOf(LOOKS[LOOKS.length - 1]);
  const next = LOOKS.findIndex((look) => look.deg > deg);
  const a = LOOKS[next - 1];
  const b = LOOKS[next];
  const t = (deg - a.deg) / (b.deg - a.deg);
  return {
    sunColor: mixColor(a.sun, b.sun, t),
    sunStrength: mix(a.sunStrength, b.sunStrength, t),
    skyColor: mixColor(a.sky, b.sky, t),
    groundColor: mixColor(a.ground, b.ground, t),
    ambientStrength: mix(a.ambient, b.ambient, t),
    fogColor: mixColor(a.fog, b.fog, t),
  };
}

function lookOf(look) {
  return { sunColor: look.sun, sunStrength: look.sunStrength, skyColor: look.sky, groundColor: look.ground, ambientStrength: look.ambient, fogColor: look.fog };
}

// An hour as the words on a clock: 14 is "2:00 pm", 6.5 is "6:30 am", 12 is "12:00 pm".
function formatHour(hour) {
  const minutes = Math.round(hour * 60) % (24 * 60);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
}

class Sky {
  // `sun` is a DirectionalLight, `ambient` a HemisphericLight, and `dome` the SkyMaterial of the sky box. Any may be left out
  // (the tests give it a few stand-ins), and whatever is there is set.
  constructor(scene, { sun, ambient, dome } = {}) {
    this.scene = scene;
    this.sun = sun;
    this.ambient = ambient;
    this.dome = dome;
    this.hour = HOURS.start;
    this.sunStrength = 1; // a dial for the sun, for the developer panel: 1 is as the look says
    this.setHour(this.hour);
  }

  // Puts the district in the light of an hour of the day.
  setHour(hour) {
    this.hour = Math.min(HOURS.max, Math.max(HOURS.min, hour));
    const position = sunAt(this.hour);
    const look = skyLook(position.elevation);
    const color3 = (rgb) => new BABYLON.Color3(rgb[0], rgb[1], rgb[2]);

    if (this.sun) {
      this.sun.direction = new BABYLON.Vector3(position.light.x, position.light.y, position.light.z);
      this.sun.diffuse = color3(look.sunColor);
      this.sun.specular = color3(look.sunColor);
      this.sun.intensity = look.sunStrength * this.sunStrength;
    }
    if (this.ambient) {
      this.ambient.diffuse = color3(look.skyColor);
      this.ambient.groundColor = color3(look.groundColor);
      this.ambient.intensity = look.ambientStrength;
    }
    if (this.dome) {
      this.dome.useSunPosition = true;
      this.dome.sunPosition = new BABYLON.Vector3(position.toSun.x * 1000, position.toSun.y * 1000, position.toSun.z * 1000);
    }
    this.scene.fogColor = color3(look.fogColor);
    this.scene.clearColor = new BABYLON.Color4(look.fogColor[0], look.fogColor[1], look.fogColor[2], 1);
    this.position = position;
    this.look = look;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HOURS, NOON_ELEVATION, sunAt, skyLook, formatHour, Sky };
} else {
  Object.assign(window, { HOURS, NOON_ELEVATION, sunAt, skyLook, formatHour, Sky });
}
