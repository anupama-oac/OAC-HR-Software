const express = require('express');
const router = express.Router();
const statutoryInfoController = require('../controllers/statutoryInfo.controllers');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/add', '/statutoryinfo/add', '/statutory/add'], authenticateToken, statutoryInfoController.add);
router.get(['/findbyuser/:id', '/statutoryinfo/findbyuser/:id', '/statutory/findbyuser/:id'], authenticateToken, statutoryInfoController.findByUserId);
router.patch(['/update/:id', '/statutoryinfo/update/:id', '/statutory/update/:id'], authenticateToken, statutoryInfoController.update);
router.get(['/', '/statutoryinfo', '/statutory'], authenticateToken, statutoryInfoController.getAll);

module.exports = router;
