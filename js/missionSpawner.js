// missionSpawner.js
// Random mission spawning with persistence across reloads.
// Spawns a random mission immediately and every 2s.

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
      missions = Array.isArray(data.missions) ? data.missions : [];
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
      const weights = {
        "Very Often": 0.90,
        Often: 0.06,
        Sometimes: 0.03,
        Rare: 0.01,
      };
      const total = missions.reduce(
        (sum, m) => sum + (weights[m.spawn] || 0),
        0,
      );
      let r = Math.random() * total;
      for (const m of missions) {
        r -= weights[m.spawn] || 0;
        if (r <= 0) return m;
      }
      return missions[missions.length - 1];
    }

    function createBubble(mission, index, left, top, id, animate) {
      const app = document.getElementById("app");
      if (!app) return;

      const bubble = document.createElement("div");
      bubble.className = `apple-glass mission-bubble${animate ? " spawn" : ""}`;
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
      bubble.style.width = bubble.style.height = "120px";
      bubble.dataset.id = String(id);

      const sprite = mission.enemy ? mission.enemy.sprite : mission.sprite;
      if (sprite) {
        const img = document.createElement("img");
        img.src = sprite;
        img.alt = mission.name;
        bubble.appendChild(img);
      }

      bubble.addEventListener("click", () => {
        if (mission.name === "Empty") {
          activeMissions = activeMissions.filter((m) => m.id !== id);
          saveActive();
          bubble.remove();
          return;
        }

        // Persist the mission so battle.html knows what was selected
        sessionStorage.setItem("currentMission", JSON.stringify(mission));
        sessionStorage.setItem("currentMissionIndex", String(index));

        // Remove from active list and persist
        activeMissions = activeMissions.filter((m) => m.id !== id);
        saveActive();

        // Non-combat missions (e.g., Potion or Treasure) skip combat and go
        // straight to the battle end screen. Flag this in sessionStorage so
        // battle.js can immediately render the result.
        if (mission.enemy) {
          window.location.href = "battle.html";
        } else {
          sessionStorage.setItem("forceBattleEnd", "1");
          window.location.href = "battle.html";
        }
        // Non-combat missions (e.g., Potion or Treasure) should skip directly to
        // the battle end screen. We signal this via a query param so battle.js
        // can immediately show the result without attempting a fight.
        const target = mission.enemy ? "battle.html" : "battle.html?end=1";
        window.location.href = target;
main
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

      if (activeMissions.length >= 6) {
        const first = app.querySelector(".mission-bubble");
        if (first) first.remove();
        activeMissions.shift();
      }

      const mission = pickMission();
      if (!mission) return;

      const index = missions.indexOf(mission);
      const size = 120;
      const maxLeft = app.clientWidth - size;
      const maxTop = app.clientHeight - size;
      let left, top;
      let attempts = 0;
      do {
        left = Math.random() * maxLeft;
        top = Math.random() * maxTop;
        attempts++;
      } while (
        activeMissions.some(
          (m) =>
            Math.abs(m.left - left) < size && Math.abs(m.top - top) < size,
        ) &&
        attempts < 20
      );
      const id = Date.now() + Math.random();

      createBubble(mission, index, left, top, id, true);
      activeMissions.push({ id, index, left, top });
      saveActive();
    }

    restoreMissions();

    spawnMission();
    setInterval(spawnMission, 2000);
  });
})();

