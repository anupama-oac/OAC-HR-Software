const jwt = require('jsonwebtoken');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 's1@e2c3r4e5t6';

function getAuthHeader(incomingToken) {
  if (incomingToken) {
    return incomingToken.startsWith('Bearer ') ? incomingToken : `Bearer ${incomingToken}`;
  }
  const token = jwt.sign({ id: 1, roleId: 1, isSuperAdmin: true, isInternal: true }, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

const authService = {
  async getAllActiveUsers(token) {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/find`, {
        headers: { Authorization: getAuthHeader(token) }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || (Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Payroll Service: Error fetching users from Auth Service:', err.message);
      return [];
    }
  },

  async getUserById(id, token) {
    if (!id) return null;
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/findone/${id}`, {
        headers: { Authorization: getAuthHeader(token) }
      });
      if (res.ok) {
        return await res.json();
      }
      const users = await this.getAllActiveUsers(token);
      return users.find(u => String(u.id) === String(id)) || null;
    } catch (err) {
      console.error(`Payroll Service: Error fetching user ${id}:`, err.message);
      return null;
    }
  }
};

module.exports = authService;
