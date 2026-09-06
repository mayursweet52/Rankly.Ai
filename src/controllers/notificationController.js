const prisma = require('../config/database');

function getUserId(req) {
    return (req.session && (req.session.userId || req.session.user?.id)) || (req.user && req.user.id) || null;
}

const getNotifications = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.json({ success: true, notifications: [], authenticated: false });
        }
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.json({ success: true, count: 0, unreadCount: 0, authenticated: false });
        }
        const count = await prisma.notification.count({
            where: { userId, isRead: false }
        });
        res.json({ success: true, count, unreadCount: count, authenticated: true });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        res.status(500).json({ success: false, error: 'Internal server error', count: 0, unreadCount: 0 });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const markAllRead = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('markAllRead error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const createNotification = async (userId, title, message, type = 'info', link = null) => {
    try {
        return await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
    createNotification
};
