const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const advSalaryController = require('../controllers/advanceSalary.controller')


router.post("/", authenticateToken, advSalaryController.createAdvanceSalary);
router.get("/notcompleted", authenticateToken, advSalaryController.getNotCompleted);
router.get("/findall", authenticateToken, advSalaryController.findAll);
router.get("/findbyid/:id", authenticateToken, advSalaryController.findById);
router.get("/findbyuserid/:id", authenticateToken, advSalaryController.findByUserId);
router.get("/findbyuseridall/:id", authenticateToken, advSalaryController.findByUserIdAll);
router.patch('/update/:id', authenticateToken, advSalaryController.updateAdvanceSalary);
router.patch('/closeadvance/:id', authenticateToken, advSalaryController.closeAdvance);
router.delete('/delete/:id', authenticateToken, advSalaryController.deleteAdvance);

module.exports = router