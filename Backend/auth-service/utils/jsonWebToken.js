const jwt = require('jsonwebtoken');

function jwtTokens({id, name, email, phoneNumber, roleId, designationId, systemRoleId, roleName, designationName, systemRoleName}){
    const effectiveRoleId = designationId !== undefined && designationId !== null ? designationId : roleId;
    const user = {
      id,
      name,
      email,
      phoneNumber,
      roleId: effectiveRoleId,
      designationId: effectiveRoleId,
      systemRoleId,
      roleName,
      designationName,
      systemRoleName
    };
    
    // Changed these to JWT_SECRET to match your .env file
    const accessToken = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1d'});
    const refreshToken = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '7d'});
    
    return({accessToken, refreshToken});    
}

module.exports = jwtTokens;
