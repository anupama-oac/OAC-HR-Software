const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const UserAssets = require('../models/userAsset');


module.exports = router