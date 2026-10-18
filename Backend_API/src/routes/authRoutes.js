const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { isStaffRole } = require("../utils/orderWorkflow");

// Cache lưu trữ kết quả trao đổi mã code (OAuth code) ngắn hạn để ngăn chặn lỗi trùng lặp request từ trình duyệt
const codeCache = new Map();

// Route login gốc của Admin
router.post("/login", authController.login);

// Route login dành riêng cho Customer Web
router.post("/login-custom", authController.loginCustom);

// Các tuyến đường khôi phục mật khẩu
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/debug-env", (req, res) => {
  res.json({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_SENDER: process.env.EMAIL_SENDER,
    EMAIL_PASS_length: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0,
    EMAIL_PASS_start: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.substring(0, 15) : "",
  });
});

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
            const requestHost = req.get('host') || '';
            const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
            const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

            // RBAC: Chặn tài khoản nhân viên / quản trị đăng nhập Customer Web qua Google OAuth
            if (user.role !== 'customer' || isStaffRole(user.role)) {
                return res.redirect(`${FRONTEND_URL}/login?error=staff_account_not_allowed`);
            }

            const token = jwt.sign(
                { id: user._id, role: user.role, email: user.email },
                process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY',
                { expiresIn: '1d' }
            );

            // Redirect về frontend kèm token và thông tin người dùng trong query
            res.redirect(`${FRONTEND_URL}/login?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}`);
        } catch (error) {
            console.error("Lỗi callback redirect:", error);
            res.status(500).send("Lỗi máy chủ khi đăng nhập Google.");
        }
    }
);

// Route khởi động đăng nhập Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['public_profile'] }));

// Route callback nhận phản hồi từ Facebook
router.get('/facebook/callback',
    (req, res, next) => {
        const code = req.query.code;
        console.log(`[FB_CALLBACK] ➡️ Nhận yêu cầu callback từ Facebook: ${req.originalUrl} | IP: ${req.ip} | Thời gian: ${new Date().toISOString()}`);
        
        const requestHost = req.get('host') || '';
        const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
        const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

        // Nếu code đã được xử lý và lưu trong cache (do trình duyệt gửi nhiều yêu cầu đồng thời)
        if (code && codeCache.has(code)) {
            console.log(`[FB_CALLBACK] ⚡ Phát hiện yêu cầu trùng lặp cho code: ${code.substring(0, 15)}... Trả về kết quả từ Cache.`);
            const cachedData = codeCache.get(code);
            if (cachedData.user.role !== 'customer' || isStaffRole(cachedData.user.role)) {
                return res.redirect(`${FRONTEND_URL}/login?error=staff_account_not_allowed`);
            }
            return res.redirect(`${FRONTEND_URL}/login?token=${cachedData.token}&name=${encodeURIComponent(cachedData.user.name)}&email=${encodeURIComponent(cachedData.user.email)}&role=${encodeURIComponent(cachedData.user.role)}`);
        }

        passport.authenticate('facebook', {
            session: false
        }, (err, user, info) => {
            if (err) {
                console.error("[FB_CALLBACK] ❌ Lỗi xác thực Passport Facebook:", err);
                return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed&details=${encodeURIComponent(err.message || err)}`);
            }
            if (!user) {
                console.warn("[FB_CALLBACK] ⚠️ Không tìm thấy hoặc xác thực user thất bại");
                return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
            }
            req.user = user;
            next();
        })(req, res, next);
    },
    async (req, res) => {
        try {
            const user = req.user;
            const requestHost = req.get('host') || '';
            const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') || requestHost.includes('5000');
            const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");

            // RBAC: Chặn tài khoản nhân viên / quản trị đăng nhập Customer Web qua Facebook OAuth
            if (user.role !== 'customer' || isStaffRole(user.role)) {
                return res.redirect(`${FRONTEND_URL}/login?error=staff_account_not_allowed`);
            }

            const code = req.query.code;
            const token = jwt.sign(
                { id: user._id, role: user.role, email: user.email },
                process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY',
                { expiresIn: '1d' }
            );

            // Lưu kết quả thành công vào cache trong 15 giây để phòng hờ yêu cầu trùng lặp đến sau
            if (code) {
                codeCache.set(code, { token, user });
                setTimeout(() => {
                    codeCache.delete(code);
                }, 15000);
            }

            console.log(`[FB_CALLBACK] ✅ Đăng nhập thành công, chuyển hướng về frontend: ${user.email}`);
            res.redirect(`${FRONTEND_URL}/login?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}`);
        } catch (error) {
            console.error("[FB_CALLBACK] ❌ Lỗi khi sinh token hoặc redirect:", error);
            res.status(500).send("Lỗi máy chủ khi đăng nhập Facebook.");
        }
    }
);

module.exports = router;
