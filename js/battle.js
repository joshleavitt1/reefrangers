// battle.js — delayed start + HP drain + 2-phase victory

// ====== Config ======
const START_DELAY_MS = 3000; // Delay before first question (ms)
const HP_TRANSITION_MS = 600; // HP bar drain duration (ms)
const LINGER_BOTH_MS = 1200; // After final damage, keep BOTH creatures visible for this long
const VICTORY_SCREEN_MS = 3000; // Show winner-only screen before redirect (ms)

// ====== State ======
const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
if (!user) {
  window.location.href = "index.html";
}
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
  user && user.creatures && user.creatures.length > 0
    ? user.creatures[0]
    : defaultCreature;
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

window.addEventListener("pageshow", () => {
  isGameOver = false;
  const endScreen = document.querySelector(".end-screen");
  if (endScreen) endScreen.remove();
});

function persistPlayerHp() {
  if (user && user.creatures && user.creatures[0]) {
    user.creatures[0].currentHp = player.hp;
    updateCurrentUser({ creatures: user.creatures });
  }
}

// ====== Helpers ======
function updateHP() {
  const pPct = (player.hp / player.maxHp) * 100;
  const ePct = (enemy.hp / enemy.maxHp) * 100;
  document.getElementById("player-hp").style.width = pPct + "%";
  document.getElementById("enemy-hp").style.width = ePct + "%";
  const pStats = document.getElementById("player-stats");
  if (pStats)
    pStats.textContent = `HP: ${player.hp}/${player.maxHp} | ATK: ${player.move.power}`;
  const eStats = document.getElementById("enemy-stats");
  if (eStats)
    eStats.textContent = `HP: ${enemy.hp}/${enemy.maxHp} | ATK: ${enemy.move.power}`;
}

function animateHP(side /* "player" | "enemy" */, done) {
  const data = side === "player" ? player : enemy;
  const fill = document.getElementById(`${side}-hp`);
  if (!fill) {
    done?.();
    return;
  }
  fill.style.transition = `width ${HP_TRANSITION_MS}ms ease`;
  void fill.offsetWidth; // force reflow so transition triggers
  const pct = (data.hp / data.maxHp) * 100;
  fill.style.width = `${pct}%`;

  let finished = false;
  const fallback = setTimeout(() => {
    if (!finished) done?.();
  }, HP_TRANSITION_MS + 80);

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

// ====== 2-Phase Victory ======
// Phase A: linger both creatures visible for LINGER_BOTH_MS (no layout changes)
// Phase B: show ONLY winner, centered with "Winner" banner; swap sprite if player wins
function endBattle(winner) {
  persistPlayerHp();
  if (typeof isGameOver !== "undefined" && isGameOver) return;
  if (typeof isGameOver === "undefined") window.isGameOver = true;
  else isGameOver = true;

  const LINGER = typeof LINGER_BOTH_MS !== "undefined" ? LINGER_BOTH_MS : 1200;
  const isTreasure = currentMission && currentMission.name === "Treasure";

  // Close any open modal
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("show");

  const winnerEl = document.getElementById(
    winner === player ? "player" : "enemy",
  );
  const winnerIsPlayer = winner === player;

  // Phase A: linger briefly with both creatures visible (skip for treasure)
  setTimeout(() => {
    const battleRoot = document.getElementById("battle");
    const battlefield = document.getElementById("battlefield");

    // Remove battlefield/UI so only background remains
    if (battlefield) battlefield.remove();
    if (modal) modal.remove();

    if (battleRoot) battleRoot.style.position = "relative";

    // === Victory/defeat overlay ===
    const victoryBox = document.createElement("div");
    victoryBox.className = "end-screen";

    // Banner
    const banner = document.createElement("h1");
    banner.className = "end-banner";
    banner.textContent = isTreasure
      ? "Treasure"
      : winnerIsPlayer
        ? "Victory!"
        : "Defeat";

    // Sprite wrapper
    const spriteWrapper = document.createElement("div");
    spriteWrapper.className = "sprite-wrapper";

    // Winner sprite (player gets special art)
    const originalSprite = winnerEl?.querySelector(".fish-sprite");
    const sprite = document.createElement("img");
    sprite.className = "end-sprite";
    sprite.alt = isTreasure
      ? "Treasure"
      : winnerIsPlayer
        ? player.name
        : enemy.name;
    sprite.src = isTreasure
      ? currentMission?.sprite || "../images/treasure.png"
      : winnerIsPlayer
        ? PLAYER_VICTORY_SRC
        : originalSprite?.getAttribute("src") || "";

    spriteWrapper.appendChild(sprite);

    // Dynamic button
    const button = document.createElement("button");
    button.className = "end-button";
    const reward = currentMission?.reward || 0;
    button.textContent = winnerIsPlayer
      ? `Claim 🐚 ${reward} Seashell${reward === 1 ? "" : "s"}`
      : "Back to Missions";
    button.addEventListener("click", () => {
      if (winnerIsPlayer) {
        if (currentMission && user) {
          const newSeashells =
            (user.seashells || 0) + (currentMission.reward || 0);
          const idxStr = sessionStorage.getItem("currentMissionIndex");
          const missionsCompleted = Array.isArray(user.missionsCompleted)
            ? [...user.missionsCompleted]
            : [];
          if (idxStr !== null) {
            const idx = parseInt(idxStr, 10);
            if (missionsCompleted[idx]) missionsCompleted[idx].completed = true;
            updateCurrentUser({
              seashells: newSeashells,
              missionsCompleted,
            });
          } else {
            updateCurrentUser({ seashells: newSeashells });
          }
        }
        sessionStorage.removeItem("currentMission");
        sessionStorage.removeItem("currentMissionIndex");
        window.location.href = "mission.html";
      } else {
        sessionStorage.removeItem("currentMission");
        sessionStorage.removeItem("currentMissionIndex");
        window.location.href = "mission.html";
      }
    });

    // Assemble
    victoryBox.appendChild(banner);
    victoryBox.appendChild(spriteWrapper);
    victoryBox.appendChild(button);
    battleRoot.appendChild(victoryBox);

    // Trigger reveal animations
    requestAnimationFrame(() => {
      victoryBox.classList.add("show");
    });
  }, isTreasure ? 0 : LINGER);
}

// ====== Turn Flow ======
function playerAttack() {
  animateAttack(player);
  setTimeout(() => {
    enemy.hp = Math.max(0, enemy.hp - player.move.power);
    animateHP("enemy", () => {
      if (enemy.hp <= 0) {
        endBattle(player);
      } else {
        setTimeout(fetchQuestion, 1200);
      }
    });
  }, 600);
}

function enemyTurn() {
  animateAttack(enemy);
  setTimeout(() => {
    player.hp = Math.max(0, player.hp - enemy.move.power);
    persistPlayerHp();
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
  if (!questions || questions.length === 0) {
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
        // ✅ Correct: player's attack; enemy's turn is skipped automatically
        setTimeout(playerAttack, 500);
      } else {
        setTimeout(enemyTurn, 500);
      }
    }, 2000);
  }

  const buttons = content.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => showAnswerFeedback(btn.innerText));
  });
}

// ====== Delayed Init Flow ======
async function initGame() {
  // Load questions
  try {
    const res = await fetch("../data/questions.json");
    const data = await res.json();
    if (Array.isArray(data)) questions = data;
  } catch (err) {
    console.error("Failed to load questions:", err);
  }

  // Load mission data
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
    if (currentMission && currentMission.enemy) {
      const e = currentMission.enemy;
      enemy.name = e.name;
      enemy.hp = e.hp;
      enemy.maxHp = e.hp;
      enemy.move.power = e.attack;
      if (e.sprite) enemy.sprite = e.sprite;
    } else if (currentMission && currentMission.sprite) {
      enemy.name = currentMission.name;
      enemy.sprite = currentMission.sprite;
    }
  } catch (err) {
    console.error("Failed to load missions:", err);
  }

  // If mission has no enemy (e.g., Treasure), show reward immediately
  if (!currentMission || !currentMission.enemy) {
    endBattle(player);
    return;
  }

  const playerNameEl = document.getElementById("player-name");
  if (playerNameEl) playerNameEl.textContent = player.name;
  const enemyNameEl = document.getElementById("enemy-name");
  if (enemyNameEl) enemyNameEl.textContent = enemy.name;
  const enemySpriteEl = document.querySelector("#enemy .fish-sprite");
  if (enemySpriteEl && enemy.sprite) {
    enemySpriteEl.src = enemy.sprite;
  }

  const playerSpriteEl = document.querySelector("#player .fish-sprite");
  if (playerSpriteEl && playerCreature.sprite && playerCreature.sprite.battle) {
    playerSpriteEl.src = playerCreature.sprite.battle;
  }

  // Initial HP state
  updateHP();

  // Intro overlay fade + delayed start
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
