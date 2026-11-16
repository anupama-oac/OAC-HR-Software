const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

const authService = {
  async getAllActiveUsers() {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/find`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || (Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Payroll Service: Error fetching users from Auth Service:', err.message);
      return [];
    }
  },

  async getUserById(id) {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`Payroll Service: Error fetching user ${id}:`, err.message);
      return null;
    }
  }
};

module.exports = authService;
