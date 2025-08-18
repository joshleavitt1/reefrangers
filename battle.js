const player = { name: 'Shellfin', hp: 100, move: { name: 'Fin Swipe', power: 100 } };
const enemy = { name: 'Octomurk', hp: 100, move: { name: 'Constrict', power: 20 } };

let questions = [];

function updateHP() {
  document.getElementById('player-hp').style.width = player.hp + '%';
  document.getElementById('enemy-hp').style.width = enemy.hp + '%';
}

function setTextbox(text) {
  document.getElementById('textbox').innerHTML = text;
}

function animateAttack(attacker, defender) {
  const atkEl = document.getElementById(attacker === player ? 'player' : 'enemy');
  const defEl = document.getElementById(defender === player ? 'player' : 'enemy');
  const direction = attacker === player ? '60px' : '-60px';
  atkEl.style.transform = `translateX(${direction})`;
  defEl.classList.add('shake');
  setTimeout(() => { atkEl.style.transform = 'translateX(0)'; }, 300);
  setTimeout(() => { defEl.classList.remove('shake'); }, 500);
}

function endBattle(winner) {
  setTextbox(`${winner.name} wins the battle!`);
  setTimeout(() => {
    window.location.href = "index.html";
  }, 3000);
}

function playerAttack() {
  setTextbox(`${player.name} used ${player.move.name}!`);
  animateAttack(player, enemy);
  setTimeout(() => {
    enemy.hp = Math.max(0, enemy.hp - player.move.power);
    updateHP();
    if (enemy.hp <= 0) return endBattle(player);
    setTimeout(fetchQuestion, 1200);
  }, 600);
}

function enemyTurn() {
  setTextbox(`${enemy.name} used ${enemy.move.name}!`);
  animateAttack(enemy, player);
  setTimeout(() => {
    player.hp = Math.max(0, player.hp - enemy.move.power);
    updateHP();
    if (player.hp <= 0) return endBattle(enemy);
    setTimeout(fetchQuestion, 1200);
  }, 600);
}

function fetchQuestion() {
  const q = questions[Math.floor(Math.random() * questions.length)];
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');

  let timeLeft = 15;
  let timerId;

  content.innerHTML = `<div>${q.q}</div>
    <div id="timer" style="margin:10px 0; font-size:14px; color:#555;">Time left: ${timeLeft}s</div>
    ${q.options.map(opt => `<button>${opt}</button>`).join('')}`;
  modal.classList.add('show');

  timerId = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      showAnswerFeedback(null);
    }
  }, 1000);

  function showAnswerFeedback(selected) {
    clearInterval(timerId);
    const buttons = Array.from(content.querySelectorAll('button'));
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.innerText === q.answer) {
        btn.classList.add('correct');
        btn.innerHTML += " ✅";
      } else {
        btn.classList.add('wrong');
        btn.innerHTML += " ❌";
      }
    });
    setTimeout(() => {
      modal.classList.remove('show');
      if (selected === q.answer) {
        setTextbox(`Correct! ${player.name} attacks!`);
        setTimeout(playerAttack, 500);
      } else {
        setTextbox(`Wrong! ${enemy.name} attacks!`);
        setTimeout(enemyTurn, 500);
      }
    }, 2000);
  }

  const buttons = content.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => showAnswerFeedback(btn.innerText));
  });
}

async function init() {
  try {
    const res = await fetch("questions.json");
    questions = await res.json();
  } catch (err) {
    console.error("Failed to load questions:", err);
  }
  updateHP();
  setTimeout(fetchQuestion, 1000);
}

init();
