const express = require('express');
const router = express.Router();
const userPositionController = require('../controllers/userPosition.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/add', '/position/add', '/userposition/add'], authenticateToken, userPositionController.add);
router.get(['/findbyuser/:id', '/position/findbyuser/:id', '/userposition/findbyuser/:id'], authenticateToken, userPositionController.findByUserId);
router.patch(['/update/:id', '/position/update/:id', '/userposition/update/:id'], authenticateToken, userPositionController.update);
router.patch(['/updaterole/:id', '/position/updaterole/:id', '/userposition/updaterole/:id'], authenticateToken, userPositionController.updateRole);
router.get(['/', '/position', '/userposition'], authenticateToken, userPositionController.getAll);

module.exports = router;