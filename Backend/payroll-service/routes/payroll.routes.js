const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

router.post(['/', ''], payrollController.savePayroll);
router.get(['/', ''], payrollController.getPayrolls);
router.get('/:id', payrollController.getPayrollByUserId);
router.patch('/:id', payrollController.updatePayroll);

module.exports = router;