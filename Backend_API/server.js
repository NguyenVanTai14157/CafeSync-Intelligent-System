const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const Groq = require("groq-sdk");
const jwt = require('jsonwebtoken');

// 1. CẤU HÌNH & KHỞI TẠO
dotenv.config();
const app = express();

// 2. KẾT NỐI DATABASE
connectDB();

// 3. KHỞI TẠO AI GROQ
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let chatContext = [];

// 4. MIDDLEWARE
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://cafe-sync-intelligent-system.vercel.app', 'https://cafe-sync-intelligent-system-rdrl.vercel.app', 'https://cafe-sync-admin.vercel.app'],
    credentials: true
}));
app.use(express.json());

// 5. CẤU HÌNH THƯ MỤC TĨNH
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ---------------------------------------------------------
// 5.5. KHỞI TẠO SOCKET.IO TRƯỚC ROUTES (QUAN TRỌNG ĐỂ REAL-TIME)
// ---------------------------------------------------------
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://cafe-sync-intelligent-system.vercel.app', 'https://cafe-sync-intelligent-system-rdrl.vercel.app', 'https://cafe-sync-admin.vercel.app'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('🔌 Một khách đã kết nối (ID: ' + socket.id + ')');
    socket.on('disconnect', () => {
        console.log('❌ Một khách đã ngưng kết nối');
    });
});

// Lưu iO vào app để truy cập từ route/controller
app.set('io', io);

// 6. ĐIỀU HƯỚNG ROUTES
// ---------------------------------------------------------
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/orders", require("./src/routes/orderRoutes"));
app.use("/api/products", require("./src/routes/productRoutes"));
app.use("/api/categories", require("./src/routes/category.routes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/ingredients", require("./src/routes/ingredientRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));
app.use("/api/tables", require("./src/routes/tableRoutes"));

// --- 7. CHỨC NĂNG AUTH CUSTOM ---
const User = require('./src/models/User');

app.post('/api/auth/register-custom', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const exist = await User.findOne({ email });
        if (exist) return res.status(400).json({ message: "Email này đã được sử dụng rồi!" });

        const newUser = new User({
            name, email, username: email, password, phone, role: 'customer'
        });
        await newUser.save();
        res.json({ message: "Đăng ký thành công! 🎉" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống khi đăng ký." });
    }
});

app.post('/api/auth/login-custom', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username: email }] });
        if (!user) return res.status(400).json({ message: "Tài khoản không tồn tại!" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu chưa đúng rồi!" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: { name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ khi đăng nhập." });
    }
});

// --- 8. AI ASSISTANT ---
app.post('/api/ai/chat', async (req, res) => {
    const { message, userName } = req.body;
    try {
        chatContext.push({ role: "user", content: message });
        if (chatContext.length > 10) chatContext.shift();

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Bạn là Syncie...`
                },
                ...chatContext
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "";
        chatContext.push({ role: "assistant", content: reply });
        res.json({ reply: reply.trim() });
    } catch (error) {
        res.json({ reply: "Syncie đang bận một chút nha! ☕" });
    }
});

// 9. KHỞI CHẠY SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
    ----------------------------------------------
    🚀 CaféSync Server is blazing fast at: http://localhost:${PORT}
    🔌 Socket.io: Enabled & Loaded BEFORE Routes
    ----------------------------------------------
    `);
});