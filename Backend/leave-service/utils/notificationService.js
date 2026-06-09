// utils/notification.js (Inside Leave Service)
const axios = require('axios');

async function createNotification({ id, me, route }) {
  try {
    // Replace with your actual Auth Service domain/port
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001'; 
    
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/notifications/create`, {
      id,      // Maps to userId in Auth Service
      me,      // Maps to message in Auth Service
      route
    });

    return response.data;
  } catch (error) {
    console.error("Failed to send notification via Auth Service:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createNotification };