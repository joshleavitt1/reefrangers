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

function login(username, password) {
  const users = loadUsers();
  const user = users[username];
  if (!user || user.password !== password) {
    return false;
  }
  setCurrentUser(username);
  return true;
}

function signOut() {
  localStorage.removeItem(CURRENT_USER_KEY);
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
window.login = login;
window.updateCurrentUser = updateCurrentUser;
window.signOut = signOut;
