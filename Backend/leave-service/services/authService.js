const axios = require('axios');

// You can pull this URL from your .env file
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000/auth-service';

/**
 * Fetches user details by ID from the Auth Service
 */
exports.getUserById = async (userId) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`);
    return response.data; // Returns user object { name, empNo, etc. }
  } catch (error) {
    console.error(`Error fetching user ${userId} from Auth Service:`, error.message);
    return null; // Return null if user not found or service down
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