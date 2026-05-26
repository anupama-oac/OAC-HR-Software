/* eslint-disable no-undef */
const Notification = require('../models/notification');

// ➕ CREATE A NEW NOTIFICATION
exports.createNotification = async (req, res) => {
    const { userId, message, route } = req.body;
    try {
        const notification = await Notification.create({
            userId,
            message,
            route
        });
        res.status(201).json({ notification });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 🔍 GET ALL NOTIFICATIONS FOR A SPECIFIC USER
exports.getNotificationsByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const notifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
        res.json({ notifications });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 🔍 GET ALL SYSTEM NOTIFICATIONS
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            order: [['createdAt', 'DESC']], 
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 📝 MARK USER NOTIFICATION AS READ
exports.markAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id; 

    try {
        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                userId: userId 
            }
        });

        if (!notification) {
            return res.status(404).send('Notification not found or does not belong to the user.');
        }

        notification.isRead = true;
        await notification.save();

        res.json({
            message: 'Notification marked as read.',
            notification
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 📝 MARK ADMIN/SUPER ADMIN NOTIFICATION AS READ
exports.adminMarkAsRead = async (req, res) => {
    const { notificationId } = req.params;
    try {
        const notification = await Notification.findOne({
            where: { id: notificationId }
        });

        if (!notification) {
            return res.status(404).send('Notification not found.');
        }

        notification.isRead = true;
        await notification.save();

        res.json({
            message: 'Notification marked as read.',
            notification
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 🔢 GET UNREAD COUNT FOR USER
exports.getUnreadCount = async (req, res) => {
    const userId = req.user.id; 
    try {
        const unreadCount = await Notification.count({
            where: {
                userId: userId,
                isRead: false
            }
        });
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// ❌ DELETE A SINGLE NOTIFICATION
exports.deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    try {
        const notification = await Notification.findByPk(notificationId);
        if (!notification) {
            return res.status(404).send('Notification not found.');
        }

        await notification.destroy();
        res.send('Notification deleted successfully.');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// 🗑️ TRUNCATE / DELETE ALL NOTIFICATIONS
exports.deleteAllNotifications = async (req, res) => {
    try {
        await Notification.destroy({ where: {}, truncate: true });
        res.json({ message: 'All notifications deleted successfully.' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};