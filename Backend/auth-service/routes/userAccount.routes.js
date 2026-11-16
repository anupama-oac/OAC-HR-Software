const express = require('express');
const router = express.Router();
const userAccountController = require('../controllers/userAccount.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post(['/add', '/account/add', '/useraccount/add'], authenticateToken, userAccountController.add);
router.get(['/findbyuser/:id', '/account/findbyuser/:id', '/useraccount/findbyuser/:id'], authenticateToken, userAccountController.findByUserId);
router.patch(['/update/:id', '/account/update/:id', '/useraccount/update/:id'], authenticateToken, userAccountController.update);
router.get(['/', '/account', '/useraccount', '/find'], authenticateToken, userAccountController.getAll);

module.exports = router;