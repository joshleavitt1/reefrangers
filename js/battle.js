// battle.js — delayed start + HP drain + 2-phase victory + non-combat skip

// ====== Config ======
const START_DELAY_MS = 3000;   // Delay before first question (ms)
const HP_TRANSITION_MS = 600;  // HP bar drain duration (ms)
const LINGER_BOTH_MS = 1200;   // After final damage, keep BOTH creatures visible for this long
const VICTORY_SCREEN_MS = 3000; // (Reserved) winner-only linger before redirect (ms)

// ====== State ======
const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
if (!user) window.location.href = "index.html";

const defaultCreature = {
  name: "Shellfin",
  level: 1,
  hp: 100,
  attack: 10,
  sprite: {
    normal: "../images/shellfin.png",
    battle: "../images/shellfin_battle.png",
  },
};

const playerCreature =
  user?.creatures?.length ? user.creatures[0] : defaultCreature;

const PLAYER_VICTORY_SRC =
  playerCreature.sprite?.normal || "../images/shellfin.png";

const maxHp = playerCreature.hp;
const currentHp =
  typeof playerCreature.currentHp === "number" ? playerCreature.currentHp : maxHp;

const player = {
  name: playerCreature.name,
  hp: currentHp,
  maxHp: maxHp,
  move: { name: "Attack", power: playerCreature.attack },
};

const enemy = {
  name: "Octomurk",
  hp: 100,
  maxHp: 100,
  move: { name: "Constrict", power: 15 },
  sprite: "../images/octomurk.png",
};

let questions = [];
let currentMission = null;
let isGameOver = false;

// Reset end screen when page is shown from bfcache
window.addEventListener("pageshow", () => {
  isGameOver = false;
  document.querySelector(".end-screen")?.remove();
});

// ====== Persistence ======
function persistPlayerHp(extra = {}) {
  if (user?.creatures?.[0]) {
    user.creatures[0].currentHp = player.hp;
    updateCurrentUser({ creatures: user.creatures, ...extra });
  }
}

// ====== Mission Kind Helpers ======
function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}
function missionKind(m) {
  if (!m) return "empty";
  const n = norm(m.name);
  const t = norm(m.type || m.kind || "");
  const fused = `${n} ${t}`.trim();

  if (/(^|[\s_-])(potion|heal|healing)([\s_-]|$)/.test(fused)) return "potion";
  if (/(^|[\s_-])(treasure|chest|loot|reward)([\s_-]|$)/.test(fused)) return "treasure";
  if (/(^|[\s_-])(empty|no[-\s]?battle|skip)([\s_-]|$)/.test(fused)) return "empty";

  return "combat";
}
function isNonCombatMission(m) {
  const k = missionKind(m);
  // Consider lack of enemy as non-combat too
  return k === "empty" || k === "potion" || k === "treasure" || !m?.enemy;
}

// ====== UI Helpers ======
function updateHP() {
  const pPct = (player.hp / player.maxHp) * 100;
  const ePct = (enemy.hp / enemy.maxHp) * 100;
  const pFill = document.getElementById("player-hp");
  const eFill = document.getElementById("enemy-hp");
  if (pFill) pFill.style.width = pPct + "%";
  if (eFill) eFill.style.width = ePct + "%";

  const pStats = document.getElementById("player-stats");
  if (pStats) pStats.textContent = `HP: ${player.hp}/${player.maxHp} | ATK: ${player.move.power}`;
  const eStats = document.getElementById("enemy-stats");
  if (eStats) eStats.textContent = `HP: ${enemy.hp}/${enemy.maxHp} | ATK: ${enemy.move.power}`;
}

function animateHP(side /* "player" | "enemy" */, done) {
  const data = side === "player" ? player : enemy;
  const fill = document.getElementById(`${side}-hp`);
  if (!fill) {
    done?.();
    return;
  }
  fill.style.transition = `width ${HP_TRANSITION_MS}ms ease`;
  void fill.offsetWidth; // reflow
  const pct = (data.hp / data.maxHp) * 100;
  fill.style.width = `${pct}%`;

  let finished = false;
  const fallback = setTimeout(() => !finished && done?.(), HP_TRANSITION_MS + 80);

  const onEnd = (e) => {
    if (e.propertyName !== "width") return;
    finished = true;
    clearTimeout(fallback);
    fill.removeEventListener("transitionend", onEnd);
    done?.();
  };
  fill.addEventListener("transitionend", onEnd, { once: true });

  const statsEl = document.getElementById(`${side}-stats`);
  if (statsEl)
    statsEl.textContent = `HP: ${data.hp}/${data.maxHp} | ATK: ${data.move.power}`;
}

function animateAttack(attacker) {
  const rootId = attacker === player ? "player" : "enemy";
  const atkEl =
    document.querySelector(`#${rootId} .fish-sprite`) ||
    document.getElementById(rootId);
  if (!atkEl) return;

  const distance = attacker === player ? 60 : -60;
  atkEl.style.transition = "transform 300ms ease";

  const baseTransform = getComputedStyle(atkEl).transform;
  const base = baseTransform && baseTransform !== "none" ? baseTransform : "";

  atkEl.style.transform = base || "translateX(0)";
  atkEl.getBoundingClientRect(); // reflow

  requestAnimationFrame(() => {
    atkEl.style.transform = `${base} translateX(${distance}px)`;
    const snapBack = () => {
      atkEl.style.transform = `${base} translateX(0)`;
      atkEl.removeEventListener("transitionend", snapBack);
    };
    atkEl.addEventListener("transitionend", snapBack, { once: true });
  });
}

function endBattle(winner) {
  // Guard: don't build twice
  if (document.querySelector(".end-screen")) return;

  // Remove intro if present
  document.getElementById("intro")?.remove();

  const k = missionKind(currentMission);
  const isTreasure = k === "treasure";
  const isPotion = k === "potion";

  if (player.hp > 0 && !isPotion) persistPlayerHp();

  if (typeof isGameOver !== "undefined" && isGameOver) return;
  if (typeof isGameOver === "undefined") window.isGameOver = true;
  else isGameOver = true;

  const LINGER = typeof LINGER_BOTH_MS !== "undefined" ? LINGER_BOTH_MS : 1200;

  // Close any open modal
  const openModal = document.getElementById("modal");
  if (openModal) openModal.classList.remove("show");

  const winnerEl = document.getElementById(winner === player ? "player" : "enemy");
  const winnerIsPlayer = winner === player;

  // Non-combat screens should not linger
  const delay = (isTreasure || isPotion || missionKind(currentMission) === "empty") ? 0 : LINGER;

  setTimeout(() => {
    const battleRoot = document.getElementById("battle");
    const battlefield = document.getElementById("battlefield");
    if (battlefield) battlefield.remove();
    if (openModal) openModal.remove();

    // ----- Build end screen -----
    const victoryBox = document.createElement("div");
    victoryBox.className = "end-screen";

    // Make it visible even if CSS is missing
    victoryBox.style.position = "absolute";
    victoryBox.style.inset = "0";
    victoryBox.style.display = "flex";
    victoryBox.style.flexDirection = "column";
    victoryBox.style.alignItems = "center";
    victoryBox.style.justifyContent = "center";
    victoryBox.style.gap = "16px";
    victoryBox.style.background = "rgba(0,0,0,0.25)";
    victoryBox.style.backdropFilter = "blur(4px)";
    victoryBox.style.opacity = "0"; // will fade in
    victoryBox.style.transition = "opacity 250ms ease";

    const banner = document.createElement("h1");
    banner.className = "end-banner";
    banner.textContent = isTreasure
      ? "Treasure"
      : isPotion
        ? "Potion"
        : winnerIsPlayer
          ? "Victory!"
          : "Defeat";
    banner.style.margin = "0";
    banner.style.color = "#fff";
    banner.style.textShadow = "0 2px 6px rgba(0,0,0,0.5)";

    const spriteWrapper = document.createElement("div");
    spriteWrapper.className = "sprite-wrapper";
    spriteWrapper.style.display = "grid";
    spriteWrapper.style.placeItems = "center";
    spriteWrapper.style.minHeight = "160px";

    const originalSprite = winnerEl?.querySelector(".fish-sprite");
    const sprite = document.createElement("img");
    sprite.className = "end-sprite";
    sprite.alt = isTreasure
      ? "Treasure"
      : isPotion
        ? "Potion"
        : winnerIsPlayer
          ? player.name
          : enemy.name;
    sprite.src = isTreasure
      ? currentMission?.sprite || "../images/treasure.png"
      : isPotion
        ? currentMission?.sprite || "../images/potion.png"
        : winnerIsPlayer
          ? (playerCreature?.sprite?.normal || "../images/shellfin.png")
          : (originalSprite?.getAttribute("src") || "");
    sprite.style.maxWidth = "60%";
    sprite.style.height = "auto";
    sprite.style.filter = "drop-shadow(0 8px 16px rgba(0,0,0,0.35))";
    spriteWrapper.appendChild(sprite);

    const button = document.createElement("button");
    button.className = "end-button";
    const reward = currentMission?.reward || 0;
    button.textContent = winnerIsPlayer
      ? isPotion
        ? "Heal All HP"
        : `Claim 🐚 ${reward} Seashell${reward === 1 ? "" : "s"}`
      : `${enemy.name} stole your seashells`;
    Object.assign(button.style, {
      padding: "10px 16px",
      borderRadius: "12px",
      border: "none",
      fontWeight: "700",
      cursor: "pointer",
    });

    button.addEventListener("click", () => {
      if (winnerIsPlayer) {
        if (isPotion) {
          if (user?.creatures?.[0]) {
            user.creatures[0].currentHp = user.creatures[0].hp;
            updateCurrentUser({ creatures: user.creatures });
          }
        } else if (currentMission && user) {
          const newSeashells = (user.seashells || 0) + reward;
          const idxStr = sessionStorage.getItem("currentMissionIndex");
          const missionsCompleted = Array.isArray(user.missionsCompleted)
            ? [...user.missionsCompleted]
            : [];
          if (idxStr !== null) {
            const idx = parseInt(idxStr, 10);
            if (missionsCompleted[idx]) missionsCompleted[idx].completed = true;
            updateCurrentUser({ seashells: newSeashells, missionsCompleted });
          } else {
            updateCurrentUser({ seashells: newSeashells });
          }
        }
        sessionStorage.removeItem("currentMission");
        sessionStorage.removeItem("currentMissionIndex");
        window.location.href = "missions.html";
      } else {
        sessionStorage.removeItem("currentMission");
        sessionStorage.removeItem("currentMissionIndex");
        window.location.href = "home.html";
      }
    });

    victoryBox.appendChild(banner);
    victoryBox.appendChild(spriteWrapper);
    victoryBox.appendChild(button);

    // Mount safely
    const mountPoint = document.getElementById("battle") || document.body;
    if (mountPoint === document.getElementById("battle")) {
      mountPoint.style.position = "relative";
    }
    mountPoint.appendChild(victoryBox);

    // Double RAF to ensure layout committed, then reveal
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        victoryBox.style.opacity = "1";
        victoryBox.classList.add("show");
      });
    });

    // Watchdog: if reveal failed for some reason, redirect
    setTimeout(() => {
      if (!document.querySelector(".end-screen.show")) {
        sessionStorage.removeItem("currentMission");
        sessionStorage.removeItem("currentMissionIndex");
        window.location.href = winnerIsPlayer ? "missions.html" : "home.html";
      }
    }, 1500);
  }, delay);
}

function enemyTurn() {
  animateAttack(enemy);
  setTimeout(() => {
    player.hp = Math.max(0, player.hp - enemy.move.power);

    if (player.hp <= 0) {
      // On defeat, reset HP to max and clear seashells
      if (user?.creatures?.[0]) {
        user.creatures[0].currentHp = user.creatures[0].hp;
        updateCurrentUser({ creatures: user.creatures, seashells: 0 });
      }
    } else {
      persistPlayerHp();
    }
    persistPlayerHp(player.hp <= 0 ? { seashells: 0 } : undefined);

    animateHP("player", () => {
      if (player.hp <= 0) {
        endBattle(enemy);
      } else {
        setTimeout(fetchQuestion, 1200);
      }
    });
  }, 600);
}

// ====== Quiz ======
function fetchQuestion() {
  if (!questions?.length) {
    console.error("No questions loaded.");
    return;
  }

  const q = questions[Math.floor(Math.random() * questions.length)];
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  let timeLeft = 15;
  let timerId;

  content.innerHTML = `<div>${q.q}</div>
    <div id="timer" style="margin:10px 0; font-size:14px; color:#555;">Time left: ${timeLeft}s</div>
    ${q.options.map((opt) => `<button>${opt}</button>`).join("")}`;
  modal.classList.add("show");

  timerId = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.textContent = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      showAnswerFeedback(null);
    }
  }, 1000);

  function showAnswerFeedback(selected) {
    clearInterval(timerId);
    const buttons = Array.from(content.querySelectorAll("button"));
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.innerText === q.answer) {
        btn.classList.add("correct");
        btn.innerHTML += " ✅";
      } else {
        btn.classList.add("wrong");
        btn.innerHTML += " ❌";
      }
    });

    setTimeout(() => {
      modal.classList.remove("show");
      if (selected === q.answer) {
        // Correct → player's attack; enemy turn skipped
        setTimeout(playerAttack, 500);
      } else {
        setTimeout(enemyTurn, 500);
      }
    }, 2000);
  }

  content.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => showAnswerFeedback(btn.innerText));
  });
}

// ====== Init ======
async function initGame() {
  const params = new URLSearchParams(window.location.search);
  const forceEnd = params.has("end");

  // Load mission first
  try {
    const stored = sessionStorage.getItem("currentMission");
    if (stored) {
      currentMission = JSON.parse(stored);
    } else {
      const res = await fetch("../data/missions.json");
      const data = await res.json();
      if (Array.isArray(data.missions) && data.missions.length > 0) {
        currentMission =
          data.missions[Math.floor(Math.random() * data.missions.length)];
      }
    }

    // Hydrate enemy from mission if present
    if (currentMission?.enemy) {
      const e = currentMission.enemy;
      enemy.name = e.name ?? enemy.name;
      enemy.hp = typeof e.hp === "number" ? e.hp : enemy.hp;
      enemy.maxHp = enemy.hp;
      enemy.move.power = typeof e.attack === "number" ? e.attack : enemy.move.power;
      if (e.sprite) enemy.sprite = e.sprite;
    } else if (currentMission?.sprite) {
      // Non-combat missions may still want a sprite on the end screen
      enemy.name = currentMission.name ?? enemy.name;
      enemy.sprite = currentMission.sprite;
    }
  } catch (err) {
    console.error("Failed to load missions:", err);
  }

// Skip combat for non-combat missions or explicit override
if (forceEnd || isNonCombatMission(currentMission)) {
  // Defer two frames to ensure DOM and layout are ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => endBattle(player));
  });
  return;
}


  // Load questions only for combat missions
  try {
    const res = await fetch("../data/questions.json");
    const data = await res.json();
    if (Array.isArray(data)) questions = data;
  } catch (err) {
    console.error("Failed to load questions:", err);
  }

  // Populate names/sprites
  const playerNameEl = document.getElementById("player-name");
  if (playerNameEl) playerNameEl.textContent = player.name;
  const enemyNameEl = document.getElementById("enemy-name");
  if (enemyNameEl) enemyNameEl.textContent = enemy.name;
  const enemySpriteEl = document.querySelector("#enemy .fish-sprite");
  if (enemySpriteEl && enemy.sprite) enemySpriteEl.src = enemy.sprite;
  const playerSpriteEl = document.querySelector("#player .fish-sprite");
  if (playerSpriteEl && playerCreature.sprite?.battle) {
    playerSpriteEl.src = playerCreature.sprite.battle;
  }

  // Set initial HP UI
  updateHP();

  // Intro fade + delayed first question
  const intro = document.getElementById("intro");
  if (intro) {
    intro.style.opacity = "1";
    intro.style.transition = "opacity 0.5s ease";
  }

  setTimeout(() => {
    if (intro) {
      intro.style.opacity = "0";
      setTimeout(() => {
        intro.style.display = "none";
        setTimeout(fetchQuestion, 600);
      }, 500);
    } else {
      fetchQuestion();
    }
  }, START_DELAY_MS);
}

window.addEventListener("DOMContentLoaded", initGame);
