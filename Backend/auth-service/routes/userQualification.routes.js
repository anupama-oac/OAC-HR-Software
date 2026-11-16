const express = require('express');
const router = express.Router();
const userQualificationController = require('../controllers/userQualification.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/save', '/add', '/qualification/save', '/qualification/add'], authenticateToken, userQualificationController.add);
router.get(['/findbyuser/:id', '/qualification/findbyuser/:id'], authenticateToken, userQualificationController.findByUserId);
router.patch(['/update/:id', '/qualification/update/:id'], authenticateToken, userQualificationController.update);
router.get(['/', '/qualification', '/userqualification'], authenticateToken, userQualificationController.getAll);

module.exports = router;