// missionSpawner.js
// Random mission spawning with persistence across reloads.

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

    let activeMissions = [];
    try {
      const stored = sessionStorage.getItem("activeMissions");
      if (stored) activeMissions = JSON.parse(stored);
    } catch {
      activeMissions = [];
    }

    function saveActive() {
      sessionStorage.setItem("activeMissions", JSON.stringify(activeMissions));
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

    function createBubble(mission, idx, left, top, id, animate) {
      const app = document.getElementById("app");
      if (!app) return;

      const bubble = document.createElement("div");
      bubble.className = `apple-glass mission-bubble${animate ? " spawn" : ""}`;
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
      bubble.dataset.id = String(id);

      const img = document.createElement("img");
      const sprite = mission.enemy ? mission.enemy.sprite : mission.sprite;
      img.src = sprite;
      img.alt = mission.name;
      bubble.appendChild(img);

      bubble.addEventListener("click", () => {
        sessionStorage.setItem("currentMission", JSON.stringify(mission));
        sessionStorage.setItem("currentMissionIndex", String(idx));
        activeMissions = activeMissions.filter((m) => m.id !== id);
        saveActive();
        window.location.href = "battle.html";
      });

      app.appendChild(bubble);
    }

    function restoreMissions() {
      activeMissions.forEach(({ id, index, left, top }) => {
        const mission = missions[index];
        if (mission) createBubble(mission, index, left, top, id, false);
      });
    }

    function spawnMission() {
      const app = document.getElementById("app");
      if (!app) return;

      if (activeMissions.length >= 3) {
        const first = app.querySelector(".mission-bubble");
        if (first) first.remove();
        activeMissions.shift();
      }

      const mission = pickMission();
      if (!mission) return;

      const idx = missions.indexOf(mission);
      const size = 120;
      const maxLeft = app.clientWidth - size;
      const maxTop = app.clientHeight - size;
      const left = Math.random() * maxLeft;
      const top = Math.random() * maxTop;
      const id = Date.now() + Math.random();

      createBubble(mission, idx, left, top, id, true);
      activeMissions.push({ id, index: idx, left, top });
      saveActive();
      sessionStorage.setItem("lastSpawnTime", String(Date.now()));
    }

    restoreMissions();

    const lastSpawn = parseInt(sessionStorage.getItem("lastSpawnTime"), 10);
    const delay = isNaN(lastSpawn)
      ? 5000
      : Math.max(0, 30000 - (Date.now() - lastSpawn));

    setTimeout(() => {
      spawnMission();
      setInterval(spawnMission, 30000);
    }, delay);
  });
})();

