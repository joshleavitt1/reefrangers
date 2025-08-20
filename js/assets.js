const artAssets = [
  "../images/bg.png",
  "../images/octomurk.png",
  "../images/shellfin.png",
  "../images/shellfin_battle.png",
  "../images/test.png",
];

function preloadArtAssets() {
  return Promise.all(
    artAssets.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = src;
        }),
    ),
  );
}

window.preloadArtAssets = preloadArtAssets;
