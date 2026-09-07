const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { UserPosition } = require('../models');
const Designation = require('../models/designation');

exports.getAll = async (req, res) => {
  try {
    // const accounts = await UserPosition.findAll({});
    // ✅ 'as: "designation"' എന്ന് ചേർക്കുക
const accounts = await UserPosition.findAll({
  include: [
    { 
      model: Designation,
      as: 'designation' 
    }
  ]
});

    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};




