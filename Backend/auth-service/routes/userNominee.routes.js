const express = require('express');
const router = express.Router();
const userNomineeController = require('../controllers/userNominee.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/add', '/nominee/add', '/usernominee/add'], authenticateToken, userNomineeController.add);
router.get(['/findbyuser/:id', '/nominee/findbyuser/:id', '/usernominee/findbyuser/:id'], authenticateToken, userNomineeController.findByUserId);
router.patch(['/update/:id', '/nominee/update/:id', '/usernominee/update/:id'], authenticateToken, userNomineeController.update);
router.get(['/', '/nominee', '/usernominee'], authenticateToken, userNomineeController.getAll);

module.exports = router;
