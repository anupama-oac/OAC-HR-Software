const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 's1@e2c3r4e5t6';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const rLower = (decoded.roleName || '').toLowerCase().trim();
    const dLower = (decoded.designationName || '').toLowerCase().trim();
    const isSuper = Boolean(
      decoded.isSuperAdmin ||
      decoded.systemRoleId === 1 ||
      rLower === 'super administrator' ||
      rLower === 'super admin' ||
      rLower.includes('super admin') ||
      dLower.includes('super admin')
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
      roleId: decoded.roleId,
      systemRoleId: decoded.systemRoleId || decoded.roleId,
      isSuperAdmin: isSuper,
      roleName: decoded.roleName,
      designationName: decoded.designationName,
      name: decoded.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const dLower = (req.user.designationName || '').toLowerCase().trim();
    const isHrAdminMgr = dLower === 'hr & administration manager' || dLower.includes('hr & administration manager') || dLower.includes('hr & admin manager');
    if (req.user.isSuperAdmin || req.user.systemRoleId === 1 || req.user.roleId === 1 || isHrAdminMgr) {
      return next();
    }
    if (!roles.includes(req.user.roleId) && !roles.includes(req.user.systemRoleId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
