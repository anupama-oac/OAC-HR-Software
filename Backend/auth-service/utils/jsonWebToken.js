const jwt = require('jsonwebtoken');

function jwtTokens({ id, name, email, phoneNumber, roleId, designationId, designationName, isSuperAdmin, empNo, role } = {}) {
    const effectiveRoleId = designationId !== undefined && designationId !== null ? designationId : (roleId || role);
    const user = {
      id,
      name,
      email,
      phoneNumber,
      empNo,
      role: effectiveRoleId,
      roleId: effectiveRoleId,
      designationId: effectiveRoleId,
      designationName,
      isSuperAdmin: Boolean(isSuperAdmin)
    };
    
    // Changed these to JWT_SECRET to match your .env file
    const accessToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    return ({ accessToken, refreshToken });    
}

module.exports = jwtTokens;
