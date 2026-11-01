QUnit.module("ComfortUi", () => {
  QUnit.test("a switch for each setting, showing what it is, and changing it keeps it and says so", (assert) => {
    const settings = new ComfortSettings(comfortStore(), true);
    const told = [];
    const ui = new ComfortUi(document, settings, (name, value) => told.push([name, value]));
    assert.deepEqual(Object.keys(ui.boxes), ["reduceMotion", "vibration"]);
    assert.true(ui.boxes.reduceMotion.checked);
    assert.true(ui.boxes.vibration.checked);
    ui.boxes.vibration.checked = false;
    ui.boxes.vibration.dispatchEvent(new Event("change"));
    assert.false(settings.vibration);
    assert.deepEqual(told, [["vibration", false]]);
    settings.set("vibration", true);
    ui.refresh();
    assert.true(ui.boxes.vibration.checked);
    ui.root.remove();
  });
});

QUnit.module("InstallUi", () => {
  const stand = (userAgent = "Android") => {
    const target = new EventTarget();
    target.navigator = { userAgent };
    target.matchMedia = () => ({ matches: false });
    return target;
  };

  QUnit.test("no button and no words where there is nothing to do", (assert) => {
    const ui = new InstallUi(document, new InstallOffer(stand("Linux")));
    assert.true(ui.button.classList.contains("hidden"));
    assert.strictEqual(ui.line.textContent, "");
    ui.button.remove();
    ui.line.remove();
  });

  QUnit.test("the steps are said on an iPhone, and the button comes when the browser makes its offer", async (assert) => {
    const phone = new InstallUi(document, new InstallOffer(stand("iPhone")));
    assert.true(phone.line.textContent.includes("Add to Home Screen"));
    phone.button.remove();
    phone.line.remove();

    const win = stand();
    const ui = new InstallUi(document, new InstallOffer(win));
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    win.dispatchEvent(event);
    assert.false(ui.button.classList.contains("hidden"));
    ui.button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.true(ui.button.classList.contains("hidden"), "the offer is used up");
    ui.button.remove();
    ui.line.remove();
  });
});

QUnit.module("PhotoUi", () => {
  QUnit.test("it is hidden until there is a photograph, and then shows it with a button to save", (assert) => {
    const booth = new PhotoBooth(document);
    const parent = document.createElement("div");
    const ui = new PhotoUi(document, booth, parent);
    assert.false(ui.show());
    assert.true(ui.root.classList.contains("hidden"));
    booth.snap(photoCanvas(30, 20, "#345"), null, 30, 20);
    assert.true(ui.show());
    assert.false(ui.root.classList.contains("hidden"));
    assert.true(ui.picture.src.startsWith("data:image/jpeg"));
  });
});
