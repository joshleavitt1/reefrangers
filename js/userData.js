const STORAGE_KEY = "reefRangersUsers";
const CURRENT_USER_KEY = "reefRangersCurrentUser";
const USERS_URL = "../data/users.json";

function normalizeUsername(name) {
  return name ? name.toLowerCase() : "";
}

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  const normalized = {};
  for (const [key, value] of Object.entries(parsed)) {
    normalized[normalizeUsername(key)] = value;
  }
  return normalized;
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function createUser(username) {
  const norm = normalizeUsername(username);
  const users = loadUsers();
  if (users[norm]) return false;
  users[norm] = {
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
  localStorage.setItem(CURRENT_USER_KEY, normalizeUsername(username));
}

function getCurrentUser() {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;
  const users = loadUsers();
  return users[normalizeUsername(username)] || null;
}

async function login(username) {
  const norm = normalizeUsername(username);
  // First, try to load the user from localStorage so progress is preserved
  let users = loadUsers();
  if (users[norm]) {
    // Ensure normalized keys are persisted
    saveUsers(users);
    setCurrentUser(norm);
    return true;
  }

  // If the user isn't found locally, fall back to the bundled users.json
  try {
    const response = await fetch(USERS_URL);
    if (!response.ok) {
      return false;
    }
    const fetched = await response.json();
    const normalizedFetched = {};
    for (const [key, value] of Object.entries(fetched)) {
      normalizedFetched[normalizeUsername(key)] = value;
    }
    // Merge fetched users with any existing local data without overwriting
    users = { ...normalizedFetched, ...users };
    if (!users[norm]) {
      return false;
    }
    saveUsers(users);
    setCurrentUser(norm);
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
  const norm = normalizeUsername(username);
  if (!norm || !users[norm]) return;
  Object.assign(users[norm], update);
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
