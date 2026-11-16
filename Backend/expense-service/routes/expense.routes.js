const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const expenseController = require('../controllers/expense.controller');
const upload = require('../utils/multer');

// Create a new expense (Any authenticated user)
router.post('/', authenticateToken, expenseController.createExpense);
router.post('/save', authenticateToken, expenseController.createExpense); // Alias for frontend

// File Upload
router.post('/fileupload', upload.single('file'), expenseController.fileUpload);

// Get my expenses (Any authenticated user)
router.get('/me', authenticateToken, expenseController.getUserExpenses);
router.get('/findbyuser', authenticateToken, expenseController.getUserExpenses); // Alias for frontend
router.get('/findbyid/:id', authenticateToken, expenseController.getExpenseById);

// All expenses
router.get('/', authenticateToken, expenseController.getAllExpenses);
router.get('/find', authenticateToken, expenseController.getAllExpenses); // Alias for frontend

router.put('/:id/status', authenticateToken, expenseController.updateExpenseStatus);
router.post('/updatestatus', authenticateToken, expenseController.updateExpenseStatus); // Alias for frontend
router.patch('/update/:id', authenticateToken, expenseController.updateExpense);
router.delete('/:id', authenticateToken, expenseController.deleteExpense);

module.exports = router;
