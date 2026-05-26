/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const notificationController = require('../controllers/notification.controller');

// Clean mapping of routers to matching controller methods
router.post('/create', authenticateToken, notificationController.createNotification);
// router.get('/user/:userId', authenticateToken, notificationController.getNotificationsByUserId);

router.get('/user/:userId', (req, res) => {
  res.json({ ok: true, userId: req.params.userId });
});
router.get('/', authenticateToken, notificationController.getAllNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

router.put('/mark-read/:notificationId', authenticateToken, notificationController.markAsRead);
router.put('/admin/mark-read/:notificationId', authenticateToken, notificationController.adminMarkAsRead);

router.delete('/delete/:notificationId', authenticateToken, notificationController.deleteNotification);
router.delete('/', authenticateToken, notificationController.deleteAllNotifications);

module.exports = router;