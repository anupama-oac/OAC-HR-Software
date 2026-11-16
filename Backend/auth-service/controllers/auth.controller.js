/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const jwtTokens = require('../utils/jsonWebToken');
const User = require('../models/user');
const { UserPosition, Role, Designation } = require('../models');

const logFile = path.join(__dirname, '..', 'login-attempts.log');
function logAttempt(entry) {
  try {
    fs.appendFileSync(logFile, JSON.stringify({ time: new Date().toISOString(), ...entry }) + '\n');
  } catch (e) {
    // ignore logging errors
  }
}

exports.Login = async (req, res) => {
  try {
    const rawEmpNo = (req.body.empNo || '').toString().trim();
    const rawPassword = (req.body.password || '').toString().trim();

    if (!rawEmpNo || !rawPassword) {
      logAttempt({ empNo: rawEmpNo, status: 400, reason: 'Missing empNo or password' });
      return res.status(400).json({ message: 'Employee number and password are required' });
    }

    const lowered = rawEmpNo.toLowerCase();
    const user = await User.findOne({
      where: {
        separated: { [Op.not]: true },
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('empNo')), lowered),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), lowered),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), lowered)
        ]
      }
    });

    if (!user) {
      logAttempt({ empNo: rawEmpNo, pwdLen: rawPassword.length, status: 401, reason: 'User not found' });
      return res.status(401).json({ message: `User not found: ${rawEmpNo}` });
    }

    let validPassword = await bcrypt.compare(rawPassword, user.password);
    if (!validPassword && req.body.password !== rawPassword) {
      validPassword = await bcrypt.compare(req.body.password, user.password);
    }

    if (!validPassword) {
      logAttempt({ empNo: rawEmpNo, matchedUser: user.empNo, pwdLen: rawPassword.length, pwdHint: rawPassword.substring(0, 2) + '***', status: 401, reason: 'Incorrect password' });
      return res.status(401).json({ message: 'Incorrect password' });
    }

    logAttempt({ empNo: rawEmpNo, matchedUser: user.empNo, status: 200, reason: 'Success' });

    // Look up designation from userPosition and role name from Role
    const userPos = await UserPosition.findOne({
      where: { userId: user.id },
      include: [{ model: Designation, as: 'designation' }]
    });
    const roleRecord = await Role.findByPk(user.roleId);
    let systemRoleName = roleRecord?.roleName || '';
    const designationName = userPos?.designation?.designationName || '';
    const designationId = userPos?.designationId ?? user.roleId;

    const dLower = (designationName || '').toLowerCase().trim();
    const isHrAdminManager = dLower === 'hr & administration manager' ||
                             dLower.includes('hr & administration manager') ||
                             dLower.includes('hr & admin manager');

    if (isHrAdminManager) {
      systemRoleName = 'Super Administrator';
    }
    const roleName = isHrAdminManager ? 'Super Administrator' : (systemRoleName || designationName || 'Employee');

    const tokenPayload = {
      ...user.dataValues,
      roleId: designationId,
      designationId: designationId,
      systemRoleId: isHrAdminManager ? 1 : user.roleId,
      roleName: roleName,
      systemRoleName: systemRoleName,
      designationName: designationName,
      isSuperAdmin: isHrAdminManager || systemRoleName.toLowerCase().includes('super admin')
    };

    const token = jwtTokens(tokenPayload);
    res.cookie('refreshtoken', token.refreshToken, { httpOnly: true });

    return res.status(200).json({
      token: token,
      role: designationId,
      roleId: designationId,
      systemRoleId: isHrAdminManager ? 1 : user.roleId,
      designationId: designationId,
      roleName: roleName,
      systemRoleName: systemRoleName,
      designationName: designationName,
      isSuperAdmin: isHrAdminManager || systemRoleName.toLowerCase().includes('super admin'),
      name: user.name,
      id: user.id,
      paswordReset: user.paswordReset,
      empNo: user.empNo
    });
  } catch (error) {
    logAttempt({ empNo: req.body?.empNo, status: 500, reason: error.message });
    return res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { password, paswordReset, empNo } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = hashedPassword;
    if (paswordReset !== undefined) {
      user.paswordReset = paswordReset;
    }
    if (empNo && empNo.trim()) {
      user.empNo = empNo.trim();
    }

    await user.save();

    const userPos = await UserPosition.findOne({ where: { userId: user.id } });
    res.send(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.FindUser = async (req, res) => {
  try {
    const user = await User.findAll({
      where: { id: req.params.id }
    });
    res.send(user);
  } catch (error) {
    res.send(error.message);
  }
};
