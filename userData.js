const STORAGE_KEY = 'reefRangersUsers';
const CURRENT_USER_KEY = 'reefRangersCurrentUser';

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function setCurrentUser(username) {
  localStorage.setItem(CURRENT_USER_KEY, username);
}

function getCurrentUser() {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;
  const users = loadUsers();
  return users[username] || null;
}

function loginOrCreate(username, password) {
  const users = loadUsers();
  let user = users[username];
  if (user) {
    if (user.password !== password) {
      return false; // incorrect password
    }
  } else {
    user = {
      username,
      password,
      creaturesCollected: [],
      signInStreak: 0,
      seashellsEarned: 0,
      missionsCompleted: 0
    };
    users[username] = user;
  }
  saveUsers(users);
  setCurrentUser(username);
  return true;
}

function updateCurrentUser(update) {
  const users = loadUsers();
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username || !users[username]) return;
  Object.assign(users[username], update);
  saveUsers(users);
}

window.loadUsers = loadUsers;
window.saveUsers = saveUsers;
window.setCurrentUser = setCurrentUser;
window.getCurrentUser = getCurrentUser;
window.loginOrCreate = loginOrCreate;
window.updateCurrentUser = updateCurrentUser;
