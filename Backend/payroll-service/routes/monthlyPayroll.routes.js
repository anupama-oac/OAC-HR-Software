
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const monthlyPayrollController = require('../controllers/monthlyPayroll.controller');

router.post("/save", authenticateToken, monthlyPayrollController.savePayroll);
router.get("/find", authenticateToken, monthlyPayrollController.findPayroll);
router.get("/findbyuser/:id", authenticateToken, monthlyPayrollController.findPayrollByUser);
router.get("/bypayedfor", authenticateToken, monthlyPayrollController.getPayrollByPayedFor);
router.post("/update", authenticateToken, monthlyPayrollController.updatePayroll);
router.get('/findbyid/:id', authenticateToken, monthlyPayrollController.findPayrollById);
router.patch('/statusupdate/', authenticateToken,monthlyPayrollController.updateStatus);
router.post('/send-email', upload.single('file'), authenticateToken, monthlyPayrollController.sendEmailReport);
router.get('/approve',monthlyPayrollController.approvePayroll);
router.get('/reject',monthlyPayrollController.rejectPayroll);
router.get('/ytd',monthlyPayrollController.getYtdReport);
router.get("/download-payslip/:token", monthlyPayrollController.downloadPayslip);
module.exports = router;