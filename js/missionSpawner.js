// missionSpawner.js
// Spawns a random mission first after 5s, then every 30s.

(async function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    let missions = [];
    try {
      const res = await fetch("../data/missions.json");
      const data = await res.json();
      if (Array.isArray(data.missions)) missions = data.missions;
    } catch (err) {
      console.error("Failed to load missions:", err);
      return;
    }

    function pickMission() {
      const roll = Math.floor(Math.random() * 16) + 1; // 1-16
      return missions.find((m) =>
        String(m.spawn)
          .split(",")
          .map((n) => parseInt(n.trim(), 10))
          .includes(roll),
      );
    }

    function spawnMission() {
      const app = document.getElementById("app");
      if (!app) return;

      const bubbles = app.querySelectorAll(".mission-bubble");
      if (bubbles.length >= 3) bubbles[0].remove();

      const mission = pickMission();
      if (!mission) return;

      const bubble = document.createElement("div");
      bubble.className = "apple-glass mission-bubble spawn";

      const size = 120;
      const maxLeft = app.clientWidth - size;
      const maxTop = app.clientHeight - size;
      bubble.style.left = `${Math.random() * maxLeft}px`;
      bubble.style.top = `${Math.random() * maxTop}px`;

      const img = document.createElement("img");
      const sprite = mission.enemy ? mission.enemy.sprite : mission.sprite;
      img.src = sprite;
      img.alt = mission.name;
      bubble.appendChild(img);

      bubble.addEventListener("click", () => {
        sessionStorage.setItem("currentMission", JSON.stringify(mission));
        const idx = missions.indexOf(mission);
        sessionStorage.setItem("currentMissionIndex", String(idx));
        window.location.href = "battle.html";
      });

      app.appendChild(bubble);
    }

    setTimeout(() => {
      spawnMission();
      setInterval(spawnMission, 30000);
    }, 5000);
  });
})();
