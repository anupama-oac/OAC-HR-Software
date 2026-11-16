const axios = require('axios');

// You can pull this URL from your .env file
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000/api/auth';

/**
 * Fetches user details by ID from the Auth Service
 */
exports.getUserById = async (userId) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/findone/${userId}`);
    return response.data || { id: userId };
  } catch (error) {
    // Graceful fallback so leave queries by userId still succeed
    return { id: userId };
  }
};

/**
 * Optional: Fetches multiple users at once if you are listing leaves for all employees
 */
exports.getUsersByIds = async (userIds) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/users/batch`, { userIds });
    return response.data; // Returns an array or map of users
  } catch (error) {
    console.error("Error fetching batch users:", error.message);
    return [];
  }
};
