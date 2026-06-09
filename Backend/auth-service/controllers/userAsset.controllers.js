const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const UserAssets = require('../models/userAsset');
