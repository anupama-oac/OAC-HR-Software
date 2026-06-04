const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../utils/multer');
const leaveTypeController = require('../controllers/leaveType.controller');


router.post('/', authenticateToken, leaveTypeController.createLeaveType);
router.get('/', authenticateToken, leaveTypeController.getLeaveTypes);
router.get('/find', authenticateToken, leaveTypeController.PaginatedLeaveTypes);
router.delete('/:id', authenticateToken,leaveTypeController.deleteLeaveType);
router.patch('/:id', authenticateToken, leaveTypeController.updateLeaveType);







module.exports = router;