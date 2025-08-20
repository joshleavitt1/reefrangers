const STORAGE_KEY = "reefRangersUsers";
const CURRENT_USER_KEY = "reefRangersCurrentUser";
const USERS_URL = "../data/users.json";

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function createUser(username) {
  const users = loadUsers();
  if (users[username]) return false;
  users[username] = {
    username,
    creatures: [],
    signInStreak: 0,
    seashells: 0,
    missionsCompleted: [],
    lastSignIn: 0,
  };
  saveUsers(users);
  return true;
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

async function login(username) {
  try {
    const response = await fetch(USERS_URL);
    if (!response.ok) {
      return false;
    }
    const users = await response.json();
    saveUsers(users);
    if (!users[username]) {
      return false;
    }
    setCurrentUser(username);
    return true;
  } catch (err) {
    console.error("Failed to load users.json", err);
    return false;
  }
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
window.createUser = createUser;
window.setCurrentUser = setCurrentUser;
window.getCurrentUser = getCurrentUser;
window.login = login;
window.updateCurrentUser = updateCurrentUser;
window.signOut = signOut;
