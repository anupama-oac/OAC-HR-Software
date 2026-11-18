const jwt = require('jsonwebtoken');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 's1@e2c3r4e5t6';

// In-memory cache for user metadata to minimize inter-service HTTP latency
let cachedUsers = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Build Authorization header for inter-service communication
 */
function getAuthHeader(incomingToken) {
  if (incomingToken) {
    return incomingToken.startsWith('Bearer ') ? incomingToken : `Bearer ${incomingToken}`;
  }
  // Generate an internal service JWT token
  const token = jwt.sign({ id: 1, roleId: 1, isInternal: true }, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

/**
 * Fetch all users from Auth Service
 */
async function getAllUsers(token) {
  const now = Date.now();
  if (cachedUsers && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedUsers;
  }
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/find`, {
      headers: { Authorization: getAuthHeader(token) }
    });
    if (!res.ok) {
      console.warn(`Auth Service returned status ${res.status} on /find`);
      return cachedUsers || [];
    }
    const data = await res.json();
    const list = data.items || (Array.isArray(data) ? data : []);
    cachedUsers = list;
    lastCacheTime = now;
    return list;
  } catch (err) {
    console.error('Expense Service: Error fetching users from Auth Service:', err.message);
    return cachedUsers || [];
  }
}

/**
 * Fetch a single user by ID
 */
async function getUserById(userId, token) {
  if (!userId) return null;
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/findone/${userId}`, {
      headers: { Authorization: getAuthHeader(token) }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    // Fallback: look in cached user list
    const users = await getAllUsers(token);
    return users.find(u => String(u.id) === String(userId)) || null;
  } catch (err) {
    console.error(`Expense Service: Error fetching user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Fetch multiple users by IDs and return a Map of { [userId]: user }
 */
async function getUsersMap(userIds, token) {
  if (!Array.isArray(userIds) || userIds.length === 0) return {};
  const users = await getAllUsers(token);
  const targetIds = new Set(userIds.map(String));
  const userMap = {};
  for (const u of users) {
    if (targetIds.has(String(u.id))) {
      userMap[u.id] = {
        id: u.id,
        name: u.name,
        empNo: u.empNo,
        email: u.email,
        role: u.role || null
      };
    }
  }
  return userMap;
}

/**
 * Find user IDs with specific role or designation keywords (case-insensitive)
 * e.g. 'finance manager', 'operations manager'
 */
async function getManagerUserIds(roleKeywords, token) {
  const keywords = (Array.isArray(roleKeywords) ? roleKeywords : [roleKeywords]).map(k => k.toLowerCase());
  const users = await getAllUsers(token);
  const matchedIds = [];

  for (const u of users) {
    if (u.separated) continue;
    const roleName = (u.role?.roleName || '').toLowerCase();
    const desigName = (u.userPosition?.designation?.designationName || '').toLowerCase();

    const matches = keywords.some(kw => roleName.includes(kw) || desigName.includes(kw));
    if (matches) {
      matchedIds.push(u.id);
    }
  }

  return [...new Set(matchedIds)];
}

/**
 * Send a notification to a single user via Auth Service API
 */
async function sendNotification(userId, message, route, token) {
  if (!userId) return;
  try {
    await fetch(`${AUTH_SERVICE_URL}/api/notification/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(token)
      },
      body: JSON.stringify({
        userId,
        message,
        route: route || '/login/viewApproval/viewexpenses'
      })
    });
  } catch (err) {
    console.error(`Expense Service: Failed to send notification to user ${userId}:`, err.message);
  }
}

/**
 * Broadcast notifications to multiple user IDs
 */
async function notifyUsers(userIds, message, route, token) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  for (const uid of userIds) {
    await sendNotification(uid, message, route, token);
  }
}

module.exports = {
  getUserById,
  getAllUsers,
  getUsersMap,
  getManagerUserIds,
  sendNotification,
  notifyUsers
};

