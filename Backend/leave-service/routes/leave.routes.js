const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../utils/multer');
const leaveController = require('../controllers/leave.controller');



router.post('/employeeLeave', authenticateToken, leaveController.createEmployeeLeave);
router.put('/removePenalty/:id', authenticateToken, leaveController.removePenalty);
router.put('/removeApprovedPenalty/:id', authenticateToken, leaveController.removeApprovedPenalty);
router.patch('/updateemployeeleave/:id',authenticateToken,leaveController.updateEmployeeLeave);
router.get('/user/:userId',authenticateToken,leaveController.getLeavesByUserId);
router.get('/userlocked/:userId',authenticateToken,leaveController.getLockedLeavesByUserId);
router.get('/find/requested',authenticateToken,leaveController.getRequestedLeaves);
router.get('/find',authenticateToken,leaveController.findAllLeaves);
router.get('/findlocked', authenticateToken, leaveController.findAllLockedLeaves);
router.post('/emergencyLeave',authenticateToken,leaveController.getEmergencyLeaves);
router.patch('/updateemergencyLeave/:id', authenticateToken, leaveController.updateEmergencyLeave);
router.get('/:id', authenticateToken, leaveController.getLeavesById);
router.delete('/untakenLeaveDelete/:id', authenticateToken, leaveController.deleteUntakenleave);
router.get('/find/monthlyleavedays', authenticateToken,leaveController.findMonthlyLeaveDays);
router.get('/all/totalleaves', authenticateToken,leaveController.getTotalLeaves);
router.post('/fileupload', upload.single('file'), authenticateToken, leaveController.fileUpload);
router.patch('/updateLeaveFileUrl/:leaveId', authenticateToken,leaveController.updateLeaveFileUrl);
router.put('/approveLeave/:id', authenticateToken,leaveController.approveLeave);
router.put('/rejectLeave/:id', authenticateToken,leaveController.rejectLeave);
router.get('/findbyrm/:reportingManagerId',authenticateToken,leaveController.getLeavesByManager);
router.get('/all/report', authenticateToken, leaveController.getAllLeaveReport);
router.get('/leaveBalance/:leaveId', authenticateToken, leaveController.getLeaveBalanceByLeaveId);
router.get('/report/month-details', authenticateToken, leaveController.getLeaveBalanceByMonth);



module.exports = router;
