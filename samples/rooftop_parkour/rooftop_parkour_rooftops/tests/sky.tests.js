QUnit.module("sunAt", () => {
  QUnit.test("the sun is on the horizon at sunrise and sunset, and highest at noon", (assert) => {
    assert.true(Math.abs(sunAt(HOURS.sunrise).elevation) < 1e-9);
    assert.true(Math.abs(sunAt(HOURS.sunset).elevation) < 1e-9);
    assert.true(Math.abs(sunAt(12).elevation - NOON_ELEVATION) < 1e-9);
  });

  QUnit.test("it climbs all morning and falls all afternoon", (assert) => {
    let last = -1;
    for (let hour = HOURS.sunrise; hour <= 12; hour += 0.5) {
      const now = sunAt(hour).elevation;
      assert.true(now > last, `at ${hour}`);
      last = now;
    }
    for (let hour = 12.5; hour <= HOURS.sunset; hour += 0.5) {
      const now = sunAt(hour).elevation;
      assert.true(now < last, `at ${hour}`);
      last = now;
    }
  });

  QUnit.test("it rises in the east, is in the south at noon, and sets in the west", (assert) => {
    assert.true(sunAt(6.5).toSun.x > 0.5);
    assert.true(sunAt(17.5).toSun.x < -0.5);
    const noon = sunAt(12).toSun;
    assert.true(Math.abs(noon.x) < 1e-9);
    assert.true(noon.z < 0);
  });

  QUnit.test("toSun is a unit vector, and the light travels the opposite way", (assert) => {
    for (const hour of [6.5, 9, 12, 15, 17.5]) {
      const { toSun, light } = sunAt(hour);
      assert.true(Math.abs(Math.hypot(toSun.x, toSun.y, toSun.z) - 1) < 1e-9, `at ${hour}`);
      assert.deepEqual([light.x, light.y, light.z], [-toSun.x, -toSun.y, -toSun.z]);
    }
  });

  QUnit.test("in the day the light shines downward", (assert) => {
    for (const hour of [7, 10, 14, 17]) assert.true(sunAt(hour).light.y < 0, `at ${hour}`);
  });
});

QUnit.module("skyLook", () => {
  QUnit.test("the sun is stronger the higher it is", (assert) => {
    const strengths = [0, 0.1, 0.3, 0.6, 1, 1.2].map((elevation) => skyLook(elevation).sunStrength);
    for (let i = 1; i < strengths.length; i++) assert.true(strengths[i] >= strengths[i - 1], `step ${i}`);
    assert.true(strengths[strengths.length - 1] > strengths[0]);
  });

  QUnit.test("below the lowest keyframe, and above the highest, the look stays as it is there", (assert) => {
    assert.deepEqual(skyLook(-2), skyLook(-1));
    assert.deepEqual(skyLook(1.5), skyLook(1.3));
  });

  QUnit.test("a low sun is warmer than a high one: more red than blue", (assert) => {
    const low = skyLook(0.1).sunColor;
    const high = skyLook(1.2).sunColor;
    assert.true(low[0] - low[2] > high[0] - high[2]);
  });

  QUnit.test("between two keyframes it is between their numbers", (assert) => {
    const a = skyLook((8 * Math.PI) / 180);
    const b = skyLook((25 * Math.PI) / 180);
    const middle = skyLook((16.5 * Math.PI) / 180);
    assert.true(middle.sunStrength > a.sunStrength && middle.sunStrength < b.sunStrength);
    assert.true(middle.fogColor[2] > Math.min(a.fogColor[2], b.fogColor[2]) - 1e-9 && middle.fogColor[2] < Math.max(a.fogColor[2], b.fogColor[2]) + 1e-9);
  });

  QUnit.test("every colour is three numbers from 0 to 1", (assert) => {
    for (let hour = HOURS.min; hour <= HOURS.max; hour += 0.5) {
      const look = skyLook(sunAt(hour).elevation);
      for (const color of [look.sunColor, look.skyColor, look.groundColor, look.fogColor]) {
        assert.true(color.length === 3 && color.every((value) => value >= 0 && value <= 1), `at ${hour}`);
      }
    }
  });

  QUnit.test("the range of hours is in the day, so the sun is above the horizon at both ends", (assert) => {
    assert.true(sunAt(HOURS.min).elevation > 0);
    assert.true(sunAt(HOURS.max).elevation > 0);
    assert.true(HOURS.min <= HOURS.start && HOURS.start <= HOURS.max);
  });
});

QUnit.module("formatHour", () => {
  QUnit.test("writes an hour as a clock", (assert) => {
    assert.strictEqual(formatHour(14), "2:00 pm");
    assert.strictEqual(formatHour(6.5), "6:30 am");
    assert.strictEqual(formatHour(12), "12:00 pm");
    assert.strictEqual(formatHour(0), "12:00 am");
    assert.strictEqual(formatHour(17.75), "5:45 pm");
  });

  QUnit.test("rounds to the minute", (assert) => {
    assert.strictEqual(formatHour(9.999), "10:00 am");
  });
});

QUnit.module("Sky", () => {
  const make = () => {
    const scene = { fogColor: null, clearColor: null };
    const sun = { direction: null, diffuse: null, specular: null, intensity: 0 };
    const ambient = { diffuse: null, groundColor: null, intensity: 0 };
    const dome = { useSunPosition: false, sunPosition: null };
    return { scene, sun, ambient, dome, sky: new Sky(scene, { sun, ambient, dome }) };
  };

  QUnit.test("starts at the hour the game starts at, and sets the lights for it", (assert) => {
    const { sky, sun, ambient } = make();
    assert.strictEqual(sky.hour, HOURS.start);
    assert.true(sun.intensity > 0);
    assert.true(ambient.intensity > 0);
  });

  QUnit.test("the sun shines the way the hour says", (assert) => {
    const { sky, sun } = make();
    sky.setHour(10);
    const light = sunAt(10).light;
    assert.deepEqual([sun.direction.x, sun.direction.y, sun.direction.z], [light.x, light.y, light.z]);
  });

  QUnit.test("the sky and the sun are in the same place", (assert) => {
    const { sky, dome } = make();
    sky.setHour(16);
    const toSun = sunAt(16).toSun;
    assert.true(dome.useSunPosition);
    assert.deepEqual([dome.sunPosition.x, dome.sunPosition.y, dome.sunPosition.z], [toSun.x * 1000, toSun.y * 1000, toSun.z * 1000]);
  });

  QUnit.test("the fog and the clear colour are the colour of the horizon", (assert) => {
    const { sky, scene } = make();
    sky.setHour(8);
    const fog = skyLook(sunAt(8).elevation).fogColor;
    assert.deepEqual([scene.fogColor.r, scene.fogColor.g, scene.fogColor.b], fog);
    assert.deepEqual([scene.clearColor.r, scene.clearColor.g, scene.clearColor.b], fog);
  });

  QUnit.test("an hour outside the range is held to it", (assert) => {
    const { sky } = make();
    sky.setHour(3);
    assert.strictEqual(sky.hour, HOURS.min);
    sky.setHour(23);
    assert.strictEqual(sky.hour, HOURS.max);
  });

  QUnit.test("the sun strength is a dial: 0 turns the sun off, and 2 doubles it", (assert) => {
    const { sky, sun } = make();
    sky.setHour(14);
    const normal = sun.intensity;
    sky.sunStrength = 0;
    sky.setHour(14);
    assert.strictEqual(sun.intensity, 0);
    sky.sunStrength = 2;
    sky.setHour(14);
    assert.true(Math.abs(sun.intensity - normal * 2) < 1e-9);
  });

  QUnit.test("it works with only some of its parts", (assert) => {
    const scene = { fogColor: null, clearColor: null };
    const sky = new Sky(scene, {});
    sky.setHour(9);
    assert.strictEqual(sky.hour, 9);
  });
});
