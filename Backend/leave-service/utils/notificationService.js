// utils/notification.js (Inside Leave Service)
const axios = require('axios');

async function createNotification({ id, me, route, authorization }) {
  try {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/notifications/create`, {
      userId: id,
      message: me,
      route
    }, {
      headers: { Authorization: authorization }
    });

    return response.data;
  } catch (error) {
    console.error('Failed to send notification via Auth Service:', error.response?.data || error.message);
    throw error;
  }
}

async function notifyEmployeesAboutLeave({ employeeIds, message, route, authorization }) {
  const results = await Promise.allSettled(employeeIds.map((id) =>
    createNotification({ id, me: message, route, authorization })
  ));
  const failedIds = results.reduce((ids, result, index) => {
    if (result.status === 'rejected') {
      ids.push(employeeIds[index]);
    }
    return ids;
  }, []);

  if (failedIds.length > 0) {
    console.error(`Leave notifications failed for employee IDs: ${failedIds.join(', ')}`);
  }

  return failedIds;
}

module.exports = { createNotification, notifyEmployeesAboutLeave };