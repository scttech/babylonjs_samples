// Press Space to download a PNG screenshot of the current Babylon.js canvas.
// Shared across every sample via BABYLON.EngineStore, so individual sample
// scripts don't need to expose their engine/scene to use it.
window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();

  const engine = BABYLON.EngineStore.LastCreatedEngine;
  const scene = BABYLON.EngineStore.LastCreatedScene;
  if (!engine || !scene || !scene.activeCamera) return;

  BABYLON.CreateScreenshot(engine, scene.activeCamera, { precision: 1 }, (data) => {
    const link = document.createElement("a");
    link.href = data;
    link.download = `babylonjs-screenshot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  document.body.classList.add("screenshot-flash");
  setTimeout(() => document.body.classList.remove("screenshot-flash"), 150);
});
