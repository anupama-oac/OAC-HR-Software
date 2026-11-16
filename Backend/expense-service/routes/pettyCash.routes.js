const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const pettyCashController = require('../controllers/pettyCash.controller');

// All Petty Cash routes require authentication
router.use(authenticateToken);

// Log a transaction
router.post('/', pettyCashController.addTransaction);

// Get transaction history
router.get('/', pettyCashController.getTransactions);

// Get balance
router.get('/balance', pettyCashController.getBalance);

// Get by user ID
router.get('/user/:userId', pettyCashController.getByUserId);

// Update a transaction
router.patch('/:id', pettyCashController.updateTransaction);

// Delete a transaction
router.delete('/:id', pettyCashController.deleteTransaction);

module.exports = router;
