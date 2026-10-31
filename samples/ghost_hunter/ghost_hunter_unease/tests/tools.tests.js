QUnit.module("rays, cones and aiming", () => {
  const ahead = [0, 0, 1];
  const eye = [0, 1.4, 0];
  const person = (x, z, extra = {}) => ({ key: `p${x},${z}`, kind: "ghoul", base: [x, 0, z], radius: 0.4, height: 1.7, ...extra });

  QUnit.test("a ray straight at a person hits it, at the distance of its middle", (assert) => {
    const t = hitTarget(eye, ahead, person(0, 5), 8);
    assert.true(Math.abs(t - 5) < 1e-9, `${t}`);
  });

  QUnit.test("a ray that passes beside it misses, and one that passes within its radius hits", (assert) => {
    assert.strictEqual(hitTarget(eye, ahead, person(1.5, 5), 8), null);
    assert.true(hitTarget(eye, ahead, person(0.3, 5), 8) !== null);
  });

  QUnit.test("it is hit at any height of it, and missed above and below", (assert) => {
    const target = person(0, 5);
    assert.true(hitTarget([0, 0.3, 0], ahead, target, 8) !== null, "low");
    assert.true(hitTarget([0, 1.6, 0], ahead, target, 8) !== null, "high");
    assert.strictEqual(hitTarget([0, 3, 0], ahead, target, 8), null, "over its head");
  });

  QUnit.test("aiming up and down hits what the line passes through", (assert) => {
    const slope = [0, -0.2, 1].map((n, _, v) => n / Math.hypot(...v));
    assert.true(hitTarget([0, 1.7, 0], slope, person(0, 5), 8) !== null);
    assert.strictEqual(hitTarget([0, 1.7, 0], [0, 0.2, 1].map((n, _, v) => n / Math.hypot(...v)), person(0, 5), 8), null);
  });

  QUnit.test("behind the player, or beyond the range, is a miss", (assert) => {
    assert.strictEqual(hitTarget(eye, ahead, person(0, -5), 8), null);
    assert.strictEqual(hitTarget(eye, ahead, person(0, 12), 8), null);
    assert.true(hitTarget(eye, ahead, person(0, 7), 8) !== null);
  });

  QUnit.test("the aim assist makes a thumb's width of difference", (assert) => {
    const target = person(0.55, 5);
    assert.strictEqual(hitTarget(eye, ahead, target, 8, 0), null);
    assert.true(hitTarget(eye, ahead, target, 8, 0.3) !== null);
  });

  QUnit.test("a small thing on the floor can be hit by a ray at the floor", (assert) => {
    const spider = { key: "s", kind: "spider", base: [0, 0, 4], radius: 0.35, height: 0.35 };
    const down = [0, -1.4, 4].map((n, _, v) => n / Math.hypot(...v));
    assert.true(hitTarget(eye, down, spider, 8) !== null);
    assert.strictEqual(hitTarget(eye, ahead, spider, 8), null, "not along the room at eye height");
  });

  QUnit.test("a cone has a width, a length, and a middle", (assert) => {
    assert.true(inCone(eye, ahead, [0, 1.4, 5], 16, 7));
    assert.true(inCone(eye, ahead, [1, 1.4, 5], 16, 7), "11 degrees off");
    assert.false(inCone(eye, ahead, [3, 1.4, 5], 16, 7), "31 degrees off");
    assert.false(inCone(eye, ahead, [0, 1.4, 9], 16, 7), "too far");
    assert.false(inCone(eye, ahead, [0, 1.4, -3], 16, 7), "behind");
    assert.true(inCone(eye, ahead, eye, 16, 7), "at the eye");
  });

  QUnit.test("a light is full until the battery is low, and then dims to nothing", (assert) => {
    assert.strictEqual(lightPower(1), 1);
    assert.strictEqual(lightPower(TOOLS.light.dimBelow), 1);
    assert.true(Math.abs(lightPower(TOOLS.light.dimBelow / 2) - 0.5) < 1e-9);
    assert.strictEqual(lightPower(0), 0);
  });
});

QUnit.module("Tools", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1] };
  const target = (key, kind, x, z) => ({ key, kind, base: [x, 0, z], radius: 0.4, height: 1.7 });
  const world = (...targets) => ({ player, targets });
  const none = { beam: false };

  QUnit.test("the light is off at first, and does nothing off", (assert) => {
    const tools = new Tools();
    const frame = tools.update(1, none, world(target("a", "spider", 0, 3)));
    assert.false(frame.lightOn);
    assert.deepEqual(frame.lit, []);
    assert.deepEqual(frame.hits, []);
  });

  QUnit.test("a light on shows what is in the cone and not what is out of it", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(0.1, none, world(target("in", "ghoul", 0, 5), target("out", "ghoul", 4, 5), target("far", "ghoul", 0, 12)));
    assert.deepEqual(frame.lit, ["in"]);
  });

  QUnit.test("light hurts by each kind's weakness: a spider a lot, a ghoul a little, a ghost not at all", (assert) => {
    const hurt = (kind) => {
      const tools = new Tools();
      tools.toggleLight();
      return tools.update(1, none, world(target("a", kind, 0, 4))).hits[0].damage;
    };
    assert.true(Math.abs(hurt("spider") - 3 * TOOLS.light.damage * lightPower(1)) < 1e-9);
    assert.true(hurt("spider") > hurt("doll") && hurt("doll") > hurt("skeleton") && hurt("skeleton") > hurt("ghoul"));
    assert.strictEqual(hurt("ghost"), 0);
  });

  QUnit.test("light stuns what is stunned by it, for as long as it is on it", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(0.5, none, world(target("a", "spider", 0, 4), target("b", "ghoul", 0, 5)));
    assert.true(Math.abs(frame.hits[0].stun - 0.75) < 1e-9);
    assert.strictEqual(frame.hits[1].stun, 0);
  });

  QUnit.test("the battery runs down while the light is on, and up while it is off", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    tools.update(20, none, world());
    assert.true(Math.abs(tools.charge - (1 - 20 * TOOLS.light.drain)) < 1e-9);
    tools.toggleLight();
    tools.update(3, none, world());
    assert.true(Math.abs(tools.charge - (1 - 20 * TOOLS.light.drain + 3 * TOOLS.light.recharge)) < 1e-9);
    tools.update(1000, none, world());
    assert.strictEqual(tools.charge, 1, "never more than full");
  });

  QUnit.test("a flat battery puts the light out, and it will not come on until it has got some back", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(1000, none, world());
    assert.false(frame.lightOn);
    assert.strictEqual(tools.charge, 0);
    assert.false(tools.toggleLight(), "it will not come on");
    tools.update(TOOLS.light.restartAt / TOOLS.light.recharge + 0.1, none, world());
    assert.true(tools.toggleLight(), "and now it will");
  });

  QUnit.test("a low battery gives a weaker light, and so does less", (assert) => {
    const hurt = (charge) => {
      const tools = new Tools();
      tools.charge = charge;
      tools.toggleLight();
      return tools.update(0.001, none, world(target("a", "spider", 0, 4))).hits[0].damage;
    };
    assert.true(hurt(0.05) < hurt(1) * 0.5);
  });

  QUnit.test("the beam does nothing until it is fired, and then it finds the nearest thing it is on", (assert) => {
    const tools = new Tools();
    const targets = world(target("near", "ghoul", 0, 3), target("far", "ghoul", 0, 6));
    assert.strictEqual(tools.update(0.1, none, targets).aimed, null);
    const frame = tools.update(0.1, { beam: true }, targets);
    assert.strictEqual(frame.aimed, "near");
    assert.true(Math.abs(frame.aimDistance - 3) < 0.1);
    assert.true(frame.firing);
  });

  QUnit.test("it builds a hold, and captures when the hold is full, and says so once", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "skeleton", 0, 4));
    let captured = [];
    let seconds = 0;
    while (captured.length === 0 && seconds < 10) {
      captured = tools.update(0.1, { beam: true }, targets).captured;
      seconds += 0.1;
    }
    assert.true(Math.abs(seconds - 2) < 0.15, `${seconds.toFixed(1)} s`);
    assert.strictEqual(captured[0].key, "g");
    assert.strictEqual(tools.total("skeleton"), 1);
    assert.strictEqual(tools.gripOn("g"), 0);
  });

  QUnit.test("a thing the beam likes is captured sooner than one it does not", (assert) => {
    const timeFor = (kind) => {
      const tools = new Tools();
      let seconds = 0;
      while (tools.update(0.05, { beam: true }, world(target("a", kind, 0, 4))).captured.length === 0 && seconds < 30) seconds += 0.05;
      return seconds;
    };
    assert.true(timeFor("floater") < timeFor("ghoul") && timeFor("ghoul") < timeFor("horde"));
  });

  QUnit.test("the hold is lost when the beam is taken off, a little at a time", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "ghoul", 0, 4));
    tools.update(0.5, { beam: true }, targets);
    const held = tools.gripOn("g");
    assert.true(held > 0.2);
    tools.update(0.1, none, targets);
    assert.true(tools.gripOn("g") < held && tools.gripOn("g") > 0);
    tools.update(5, none, targets);
    assert.strictEqual(tools.gripOn("g"), 0);
  });

  QUnit.test("moving the beam to another thing starts again with it, and lets go of the first", (assert) => {
    const tools = new Tools();
    tools.update(0.5, { beam: true }, world(target("a", "ghoul", 0, 4)));
    tools.update(0.1, { beam: true }, world(target("a", "ghoul", 4, 4), target("b", "ghoul", 0, 4)));
    assert.true(tools.gripOn("b") > 0);
    assert.true(tools.gripOn("a") < 0.7 * 0.5 + 0.05);
  });

  QUnit.test("the beam heats up as it is fired, overheats, and will not fire until it has cooled", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "horde", 0, 4));
    let seconds = 0;
    while (!tools.overheated && seconds < 10) { tools.update(0.1, { beam: true }, targets); seconds += 0.1; }
    assert.true(Math.abs(seconds - TOOLS.beam.overheatAt / TOOLS.beam.heat) < 0.2, `${seconds.toFixed(1)} s`);
    assert.false(tools.update(0.1, { beam: true }, targets).firing, "it will not fire");
    tools.update((TOOLS.beam.overheatAt - TOOLS.beam.resumeAt) / TOOLS.beam.cool + 0.2, none, targets);
    assert.false(tools.overheated);
    assert.true(tools.update(0.1, { beam: true }, targets).firing);
  });

  QUnit.test("an unknown kind is hurt by nothing and held at the ordinary rate", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(1, { beam: true }, world(target("x", "dragon", 0, 4)));
    assert.strictEqual(frame.hits[0].damage, 0);
    assert.true(frame.grip > 0);
  });

  QUnit.test("every kind there is has a weakness, and the table makes sense", (assert) => {
    for (const kind of [...Object.keys(CREATURES), "ghost"]) {
      const w = WEAKNESS[kind];
      assert.true(w && w.light >= 0 && w.stun >= 0 && w.beam > 0, kind);
    }
    assert.strictEqual(WEAKNESS.ghost.light, 0);
    assert.true(TOOLS.light.restartAt < 1 && TOOLS.beam.resumeAt < TOOLS.beam.overheatAt);
    assert.true(TOOLS.light.range < TOOLS.beam.range + 2 && TOOLS.light.halfAngle < 45);
  });

  QUnit.test("the numbers are the table's: a stronger beam is quicker", (assert) => {
    const quick = new Tools({ ...TOOLS, beam: { ...TOOLS.beam, grip: 2 } });
    let seconds = 0;
    while (quick.update(0.05, { beam: true }, world(target("a", "skeleton", 0, 4))).captured.length === 0 && seconds < 10) seconds += 0.05;
    assert.true(seconds < 0.7);
  });
});

QUnit.module("what the tools do to creatures and ghosts", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a stunned creature stands where it is and does nothing, and then goes on", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 6], random: () => 0 });
    creature.state = "stalk";
    creature.yaw = Math.PI;
    creature.stun(1);
    const start = creature.position.slice();
    for (let i = 0; i < 18; i++) creature.update(0.05, player);
    assert.deepEqual(creature.position, start, "it has not moved");
    for (let i = 0; i < 40; i++) creature.update(0.05, player);
    assert.true(creature.position[2] < start[2], "and then it comes");
  });

  QUnit.test("a stun does not last longer than the table allows, and adds up", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 6] });
    creature.stun(1);
    creature.stun(1);
    assert.strictEqual(creature.stunned, 2);
    creature.stun(100);
    assert.strictEqual(creature.stunned, TOOLS.light.stunMax);
  });

  QUnit.test("a stunned creature does not lunge, even when it is close", (assert) => {
    const creature = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 1], random: () => 0 });
    creature.state = "stalk";
    creature.stun(2);
    creature.update(0.5, player);
    assert.strictEqual(creature.state, "stalk");
    assert.deepEqual(creature.events, []);
  });

  QUnit.test("a creature that is dying is not stunned, and does not stop dying", (assert) => {
    const creature = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 6] });
    creature.hit(100);
    creature.stun(2);
    for (let i = 0; i < 80; i++) creature.update(0.05, player);
    assert.true(creature.done);
  });

  QUnit.test("a creature is captured: it goes the way of a dead one, and says so", (assert) => {
    const creature = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 6] });
    assert.true(creature.capture());
    assert.strictEqual(creature.state, "dying");
    assert.true(creature.captured);
    assert.deepEqual(creature.events, ["captured"]);
    assert.false(creature.capture(), "only once");
  });

  QUnit.test("a ghost is half there until it is shown, and all there when it is", (assert) => {
    const ghost = new Apparition({ id: 1, home: [0, 0, 5], delay: 0 });
    ghost.update(6, [0, 1.4, 0]);
    ghost.reveal = 1;
    const shown = ghost.opacity();
    ghost.reveal = 0;
    const hidden = ghost.opacity();
    assert.true(Math.abs(hidden / shown - GHOST.unlit) < 1e-9, `${(hidden / shown).toFixed(2)}`);
    assert.true(hidden > 0, "it is still a little there");
    ghost.reveal = 0.5;
    assert.true(ghost.opacity() > hidden && ghost.opacity() < shown);
  });

  QUnit.test("a ghost is shown by default, so nothing that does not use the light is changed", (assert) => {
    const ghost = new Apparition({ id: 1, home: [0, 0, 5], delay: 0 });
    assert.strictEqual(ghost.reveal, 1);
  });

  QUnit.test("a ghost is captured: it fades, and is counted, and one that has not shown itself is not captured", (assert) => {
    const haunting = new Haunting();
    const ghost = haunting.summon([0, 0, 5], { delay: 0 });
    const waiting = haunting.summon([2, 0, 5], { delay: 50 });
    haunting.update(5, { position: [0, 1.4, 0] });
    assert.true(haunting.capture(ghost.id));
    assert.true(ghost.captured);
    assert.true(ghost.fadeStart !== null);
    assert.false(haunting.capture(waiting.id), "it has not begun");
    assert.false(haunting.capture(999));
  });
});
