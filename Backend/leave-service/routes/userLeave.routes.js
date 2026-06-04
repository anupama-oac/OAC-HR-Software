const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../utils/multer');
const holidayController = require('../controllers/holiday.controller');
const userLeaveController = require('../controllers/userLeave.controller');

router.get('/leavecount/:userId/:typeid/:year', authenticateToken, userLeaveController.getLeaveCount);
router.all('/', authenticateToken, userLeaveController.create);
router.get('/', authenticateToken, userLeaveController.getAll);
router.get('/byuserandtype/:userid/:typeid', authenticateToken, userLeaveController.getByUserAndType);
router.get('/byuser/:userid', authenticateToken, userLeaveController.getByUser);
router.patch('/update', authenticateToken, userLeaveController.update);
router.get('/forencashment/:year', authenticateToken, userLeaveController.getForEncashment);
router.delete('/:id', authenticateToken, userLeaveController.delete);


module.exports = router;