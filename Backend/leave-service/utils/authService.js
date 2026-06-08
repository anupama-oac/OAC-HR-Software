const axios = require('axios');

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:4000/api/auth';

const authService = {
  /**
   * Fetch all active users
   */
  async getAllActiveUsers() {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/find`);

      if (response.data?.items) {
        return response.data.items;
      }

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        'Error connecting to Auth Service find API:',
        error.message
      );
      return [];
    }
  },

  /**
   * Get HR Administrator details
   */
  async getHRDetails() {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/find?search=HR Administrator`
      );

      const users = response.data?.items || [];

      const hrUser = users.find(
        (u) => u.role?.roleName === 'HR Administrator'
      );

      if (!hrUser) return null;

      return {
        id: hrUser.id,
        name: hrUser.name,
        mail:
          hrUser.userPosition?.officialMailId ||
          hrUser.officialMailId ||
          hrUser.email
      };
    } catch (error) {
      console.error(
        'Error fetching HR Details from Auth API:',
        error.message
      );
      return null;
    }
  },

  /**
   * Get user personal details
   */
  async getUserPersonal(userId) {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/userpersonal/${userId}`
      );

      return response.data;
    } catch (error) {
      console.error(
        `Error fetching user personal details for ${userId}:`,
        error.message
      );
      return null;
    }
  },


/**
   * Get user position/employment details
   */
  async getUserPosition(userId) {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/position/${userId}`
      );

      return response.data;
    } catch (error) {
      console.error(
        `Error fetching user position details for ${userId}:`,
        error.message
      );
      return null;
    }
  },

  /**
   * Get team details and list of team leads for a specific user ID
   */
  async getTeamLeadsByUserId(userId) {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/teams/user/${userId}`
      );
      
      // Expected payload structural layout: 
      // { teamId: 10, teamLeads: [{ name: "Alice", officialMailId: "alice@company.com" }] }
      return response.data || null;
    } catch (error) {
      console.error(`Error fetching team lead details for user ${userId}:`, error.message);
      return null;
    }
  },

  async triggerNotification(id, me, route) {
    try {
      const response = await axios.post(`${AUTH_SERVICE_URL}/notifications`, {
        id,   // Target User ID receiving the notification
        me,   // Notification text message
        route // Frontend dashboard redirect URL path
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to broadcast microservice notification to user ${id}:`, error.message);
      return null;
    }
  },


  /**
   * Get user details filtering by designation name
   */
  async getUserByDesignation(designationName) {
    try {
      // Hits your microservice find endpoint with a query string filter
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/find?search=${encodeURIComponent(designationName)}`
      );

      const users = response.data?.items || [];
      
      // Locate the precise match matching the Operations Manager role profile
      return users.find(u => u.designation?.designationName === designationName) || null;
    } catch (error) {
      console.error(`Error fetching user by designation (${designationName}):`, error.message);
      return null;
    }
  },
  /**
   * Get user with reporting manager
   */
  async getUserWithReportingManager(userId) {
    try {
      // Opting to pull details from isolated personal records first to save network memory overload
      const personalData = await this.getUserPersonal(userId);
      
      if (personalData) {
        return {
          id: userId,
          name: personalData.name || null,
          reportingManagerId: personalData.reportingMangerId || personalData.reportingManagerId || null
        };
      }

      // Fallback fallback: Check main pool directory if personal endpoint doesn't return formatting expected
      const response = await axios.get(`${AUTH_SERVICE_URL}/find`);
      const users = response.data?.items || [];
      const targetUser = users.find((u) => Number(u.id) === Number(userId));

      if (!targetUser) return null;

      return {
        id: targetUser.id,
        name: targetUser.name,
        reportingManagerId:
          targetUser.statutoryinfo?.reportingMangerId ||
          targetUser.reportingMangerId ||
          null
      };
    } catch (error) {
      console.error(
        `Error locating manager context for user ${userId}:`,
        error.message
      );
      return null;
    }
  },

  /**
   * Get single user by ID
   */
  async getUserById(userId) {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/users/${userId}`,
        {
          timeout: 3000,
          headers: {
            'X-Internal-Service-Token':
              process.env.INTERNAL_SERVICE_SECRET || ''
          }
        }
      );

      if (!response.data) return null;

      const user = response.data;

      return {
        id: user.id,
        name: user.fullName || user.name,
        empNo: user.employeeNumber || user.empNo,
        email: user.email
      };
    } catch (error) {
      console.error(
        `AuthService isolated fetch failed for ID ${userId}:`,
        error.message
      );
      return null;
    }
  }
};

module.exports = authService;