const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Route login gốc của Admin
router.post("/login", authController.login);

// Route khởi động đăng nhập Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route callback nhận phản hồi từ Google
router.get('/google/callback',
    (req, res, next) => {
        const requestHost = req.get('host') || '';
        const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
        const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

        passport.authenticate('google', {
            failureRedirect: `${FRONTEND_URL}/login?error=google_failed`,
            session: false
        })(req, res, next);
    },
    async (req, res) => {
        try {
            const user = req.user;
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY',
                { expiresIn: '1d' }
            );

            // Xác định URL frontend để redirect về
            const requestHost = req.get('host') || '';
            const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');

            // Ở local, frontend client chạy trên port 5173
            const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

            // Redirect về frontend kèm token và thông tin người dùng trong query
            res.redirect(`${FRONTEND_URL}/login?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
        } catch (error) {
            console.error("Lỗi callback redirect:", error);
            res.status(500).send("Lỗi máy chủ khi đăng nhập Google.");
        }
    }
);

// Route khởi động đăng nhập Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));

// Route callback nhận phản hồi từ Facebook
router.get('/facebook/callback',
    (req, res, next) => {
        const requestHost = req.get('host') || '';
        const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
        const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

        passport.authenticate('facebook', {
            failureRedirect: `${FRONTEND_URL}/login?error=facebook_failed`,
            session: false
        })(req, res, next);
    },
    async (req, res) => {
        try {
            const user = req.user;
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY',
                { expiresIn: '1d' }
            );

            const requestHost = req.get('host') || '';
            const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
            const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

            res.redirect(`${FRONTEND_URL}/login?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
        } catch (error) {
            console.error("Lỗi callback redirect Facebook:", error);
            res.status(500).send("Lỗi máy chủ khi đăng nhập Facebook.");
        }
    }
);

module.exports = router;
