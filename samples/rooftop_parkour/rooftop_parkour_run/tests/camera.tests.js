QUnit.module("wrapAngle", () => {
  QUnit.test("leaves an angle in range alone", (assert) => {
    assert.strictEqual(wrapAngle(1), 1);
    assert.strictEqual(wrapAngle(-2), -2);
  });

  QUnit.test("brings an angle that has gone round back into range", (assert) => {
    assert.true(Math.abs(wrapAngle(Math.PI * 2 + 0.5) - 0.5) < 1e-9);
    assert.true(Math.abs(wrapAngle(-Math.PI * 2 - 0.5) + 0.5) < 1e-9);
    assert.true(Math.abs(wrapAngle(Math.PI * 6 + 1) - 1) < 1e-9);
  });

  QUnit.test("is always from -PI up to PI", (assert) => {
    for (let a = -20; a <= 20; a += 0.37) {
      const wrapped = wrapAngle(a);
      assert.true(wrapped >= -Math.PI - 1e-9 && wrapped <= Math.PI + 1e-9, `at ${a}`);
    }
  });
});

QUnit.module("lookAngles", () => {
  const start = { yaw: 0, pitch: 0.3 };

  QUnit.test("a mouse moved right turns the camera right, and left turns it left", (assert) => {
    assert.true(lookAngles(start, 100, 0).yaw > 0);
    assert.true(lookAngles(start, -100, 0).yaw < 0);
  });

  QUnit.test("a mouse moved up lowers the camera and down raises it, unless inverted", (assert) => {
    assert.true(lookAngles(start, 0, -100).pitch < start.pitch);
    assert.true(lookAngles(start, 0, 100).pitch > start.pitch);
    assert.true(lookAngles(start, 0, -100, { invert: true }).pitch > start.pitch);
  });

  QUnit.test("the distance turned is the mouse's distance times the sensitivity", (assert) => {
    const turned = lookAngles(start, 200, 0, { sensitivity: 0.01 });
    assert.true(Math.abs(turned.yaw - 2) < 1e-9);
  });

  QUnit.test("the pitch is held between the limits, so the camera can't go over the top or under the ground", (assert) => {
    assert.strictEqual(lookAngles(start, 0, 1e6).pitch, LOOK.maxPitch);
    assert.strictEqual(lookAngles(start, 0, -1e6).pitch, LOOK.minPitch);
    assert.strictEqual(lookAngles(start, 0, 1e6, { maxPitch: 0.5 }).pitch, 0.5);
  });

  QUnit.test("the yaw goes round and round without growing", (assert) => {
    let angles = start;
    for (let i = 0; i < 1000; i++) angles = lookAngles(angles, 300, 0);
    assert.true(Math.abs(angles.yaw) <= Math.PI + 1e-9);
  });

  QUnit.test("no movement is no change", (assert) => {
    assert.deepEqual(lookAngles(start, 0, 0), start);
  });
});

QUnit.module("orbitPosition and lookForward", () => {
  const target = { x: 10, y: 2, z: -5 };

  QUnit.test("looking north, the camera is south of the target, and raised", (assert) => {
    const at = orbitPosition(target, 0, 0.5, 6);
    assert.true(at.z < target.z);
    assert.true(at.y > target.y);
    assert.true(Math.abs(at.x - target.x) < 1e-9);
  });

  QUnit.test("the camera is always the distance away that it is asked", (assert) => {
    for (const [yaw, pitch] of [[0, 0], [1, 0.4], [-2, 1], [3, -0.3]]) {
      const at = orbitPosition(target, yaw, pitch, 7);
      assert.true(Math.abs(Math.hypot(at.x - target.x, at.y - target.y, at.z - target.z) - 7) < 1e-9);
    }
  });

  QUnit.test("it is behind the way it looks: from the camera, forward goes toward the target", (assert) => {
    const yaw = 0.8;
    const at = orbitPosition(target, yaw, 0, 5);
    const forward = lookForward(yaw);
    assert.true(Math.abs(at.x + forward.x * 5 - target.x) < 1e-9);
    assert.true(Math.abs(at.z + forward.z * 5 - target.z) < 1e-9);
  });

  QUnit.test("lookForward is a unit vector: north for 0, east for a quarter turn", (assert) => {
    assert.deepEqual([lookForward(0).x, lookForward(0).z], [0, 1]);
    assert.true(Math.abs(lookForward(Math.PI / 2).x - 1) < 1e-9);
    assert.true(Math.abs(Math.hypot(lookForward(2.2).x, lookForward(2.2).z) - 1) < 1e-9);
  });
});

QUnit.module("clearFraction", () => {
  const wall = { minX: -5, maxX: 5, minY: 0, maxY: 30, minZ: -8, maxZ: -4 };
  const from = { x: 0, y: 2, z: 0 };

  QUnit.test("a line that doesn't meet a box is clear all the way", (assert) => {
    assert.strictEqual(clearFraction(from, { x: 0, y: 2, z: 10 }, [wall], 0), 1);
    assert.strictEqual(clearFraction(from, { x: 20, y: 2, z: -6 }, [wall], 0), 1);
  });

  QUnit.test("a line that goes into a box is clear up to it", (assert) => {
    assert.true(Math.abs(clearFraction(from, { x: 0, y: 2, z: -10 }, [wall], 0) - 0.4) < 1e-9);
  });

  QUnit.test("it stops short by the margin", (assert) => {
    assert.true(Math.abs(clearFraction(from, { x: 0, y: 2, z: -10 }, [wall], 1) - 0.3) < 1e-9);
  });

  QUnit.test("a line that goes over the top of a building is clear", (assert) => {
    assert.strictEqual(clearFraction({ x: 0, y: 40, z: 0 }, { x: 0, y: 40, z: -10 }, [wall], 0), 1);
  });

  QUnit.test("of several boxes, it is the nearest that counts", (assert) => {
    const near = { minX: -5, maxX: 5, minY: 0, maxY: 30, minZ: -3, maxZ: -2 };
    assert.true(Math.abs(clearFraction(from, { x: 0, y: 2, z: -10 }, [wall, near], 0) - 0.2) < 1e-9);
  });

  QUnit.test("a line that starts inside a box has no clear way", (assert) => {
    assert.strictEqual(clearFraction({ x: 0, y: 2, z: -6 }, { x: 0, y: 2, z: -10 }, [wall], 0), 0);
  });

  QUnit.test("a line that goes straight along a face of the box without being inside it is clear", (assert) => {
    assert.strictEqual(clearFraction({ x: 6, y: 2, z: 0 }, { x: 6, y: 2, z: -10 }, [wall], 0), 1);
  });

  QUnit.test("no boxes, no problem", (assert) => {
    assert.strictEqual(clearFraction(from, { x: 0, y: 2, z: -10 }, []), 1);
  });
});

QUnit.module("aboveFloorFraction", () => {
  const runner = { x: 0, y: 1.6, z: 0 };

  QUnit.test("a camera that is above the floor is all clear", (assert) => {
    assert.strictEqual(aboveFloorFraction(runner, { x: 0, y: 3, z: -5 }, 0.3), 1);
    assert.strictEqual(aboveFloorFraction(runner, { x: 0, y: 0.3, z: -5 }, 0.3), 1);
  });

  QUnit.test("a camera that would go under it is brought in to the height of the floor", (assert) => {
    const wanted = { x: 0, y: -1, z: -6 };
    const fraction = aboveFloorFraction(runner, wanted, 0.3);
    const y = runner.y + (wanted.y - runner.y) * fraction;
    assert.true(fraction > 0 && fraction < 1);
    assert.true(Math.abs(y - 0.3) < 1e-9);
  });

  QUnit.test("the lower it wants to go, the closer it comes", (assert) => {
    assert.true(aboveFloorFraction(runner, { x: 0, y: -3, z: -6 }, 0.3) < aboveFloorFraction(runner, { x: 0, y: -1, z: -6 }, 0.3));
  });

  QUnit.test("a runner who is not above the floor has no way that is", (assert) => {
    assert.strictEqual(aboveFloorFraction({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: -6 }, 0.3), 0);
  });
});

QUnit.module("PointerLook", () => {
  class FakeCanvas {
    constructor() {
      this.listeners = {};
      this.requests = 0;
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    requestPointerLock() {
      this.requests++;
    }
  }

  const make = () => {
    const canvas = new FakeCanvas();
    const listeners = {};
    const doc = {
      pointerLockElement: null,
      exits: 0,
      addEventListener: (type, callback) => (listeners[type] = callback),
      exitPointerLock() {
        this.exits++;
        this.pointerLockElement = null;
      },
    };
    const changes = [];
    const look = new PointerLook(canvas, doc, (locked) => changes.push(locked));
    return { look, canvas, doc, listeners, changes };
  };

  QUnit.test("a click on the canvas asks the browser to take hold of the mouse", (assert) => {
    const { canvas } = make();
    canvas.listeners.click();
    assert.strictEqual(canvas.requests, 1);
  });

  QUnit.test("it doesn't ask again while it has it", (assert) => {
    const { canvas, doc } = make();
    doc.pointerLockElement = canvas;
    canvas.listeners.click();
    assert.strictEqual(canvas.requests, 0);
  });

  QUnit.test("locked says whether the canvas holds the mouse", (assert) => {
    const { look, canvas, doc } = make();
    assert.false(look.locked);
    doc.pointerLockElement = canvas;
    assert.true(look.locked);
  });

  QUnit.test("onChange is told when the browser takes or lets go of the mouse (Esc lets go)", (assert) => {
    const { listeners, canvas, doc, changes } = make();
    doc.pointerLockElement = canvas;
    listeners.pointerlockchange();
    doc.pointerLockElement = null;
    listeners.pointerlockchange();
    assert.deepEqual(changes, [true, false]);
  });

  QUnit.test("take gives how far the mouse has moved since last time, and forgets it", (assert) => {
    const { look, canvas, doc, listeners } = make();
    doc.pointerLockElement = canvas;
    listeners.mousemove({ movementX: 4, movementY: -2 });
    listeners.mousemove({ movementX: 6, movementY: 1 });
    assert.deepEqual(look.take(), { dx: 10, dy: -1 });
    assert.deepEqual(look.take(), { dx: 0, dy: 0 });
  });

  QUnit.test("a mouse that moves while it isn't held is not a look", (assert) => {
    const { look, listeners } = make();
    listeners.mousemove({ movementX: 50, movementY: 50 });
    assert.deepEqual(look.take(), { dx: 0, dy: 0 });
  });

  QUnit.test("unlock lets go if it has the mouse", (assert) => {
    const { look, canvas, doc } = make();
    look.unlock();
    assert.strictEqual(doc.exits, 0);
    doc.pointerLockElement = canvas;
    look.unlock();
    assert.strictEqual(doc.exits, 1);
  });
});

QUnit.module("OrbitCamera", () => {
  const makeCamera = () => {
    const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } }, target: null, setTarget(target) { this.target = target; } };
    return { camera, orbit: new OrbitCamera(camera, { yaw: 0, pitch: 0.3, distance: 6, height: 1.5 }) };
  };

  QUnit.test("look turns it by the mouse's movement", (assert) => {
    const { orbit } = makeCamera();
    orbit.look(100, 0);
    assert.true(orbit.yaw > 0);
  });

  QUnit.test("its sensitivity and invert can be changed", (assert) => {
    const { orbit } = makeCamera();
    orbit.sensitivity = 0.01;
    orbit.look(100, 0);
    assert.true(Math.abs(orbit.yaw - 1) < 1e-9);
    orbit.invert = true;
    const before = orbit.pitch;
    orbit.look(0, -10);
    assert.true(orbit.pitch > before);
  });

  QUnit.test("follow puts the camera behind the target, and points it at the runner's shoulders", (assert) => {
    const { camera, orbit } = makeCamera();
    orbit.follow({ x: 3, y: 0, z: 4 });
    assert.true(camera.position.z < 4);
    assert.true(camera.position.y > 1.5);
    assert.deepEqual([camera.target.x, camera.target.y, camera.target.z], [3, 1.5, 4]);
    assert.true(Math.abs(Math.hypot(camera.position.x - 3, camera.position.y - 1.5, camera.position.z - 4) - 6) < 1e-9);
  });

  QUnit.test("a wall behind the runner brings the camera in", (assert) => {
    const { camera, orbit } = makeCamera();
    orbit.boxes = [{ minX: -10, maxX: 10, minY: 0, maxY: 50, minZ: -4, maxZ: -2 }];
    orbit.follow({ x: 0, y: 0, z: 0 });
    assert.true(camera.position.z > -2.01);
    assert.true(Math.hypot(camera.position.x, camera.position.y - 1.5, camera.position.z) < 6);
  });

  QUnit.test("the camera stays above the ground, and comes in toward the runner instead of going under it", (assert) => {
    const { camera, orbit } = makeCamera();
    orbit.pitch = -0.35;
    orbit.follow({ x: 0, y: 0, z: 0 });
    assert.true(camera.position.y >= orbit.floor - 1e-9);
    assert.true(Math.hypot(camera.position.x, camera.position.y - 1.5, camera.position.z) < 6);
  });

  QUnit.test("on a raised sidewalk the floor is raised with the runner's feet", (assert) => {
    const { camera, orbit } = makeCamera();
    orbit.pitch = -0.35;
    orbit.follow({ x: 0, y: 5, z: 0 });
    assert.true(camera.position.y >= 5 + orbit.floor - 1e-9);
  });

  QUnit.test("however close the wall, the camera is never brought in further than the closest it will come", (assert) => {
    const { camera, orbit } = makeCamera();
    orbit.boxes = [{ minX: -10, maxX: 10, minY: 0, maxY: 50, minZ: -1, maxZ: -0.5 }];
    orbit.follow({ x: 0, y: 0, z: 0 });
    const distance = Math.hypot(camera.position.x, camera.position.y - 1.5, camera.position.z);
    assert.true(Math.abs(distance - 6 * orbit.closest) < 1e-9);
  });
});
