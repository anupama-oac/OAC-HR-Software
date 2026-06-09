const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { UserAccount } = require('../models');


exports.getAll = async (req, res) => {
  try {
    const accounts = await UserAccount.findAll({});

    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};