const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dns = require("dns");

// Ép buộc Node.js ưu tiên phân giải IPv4 trước IPv6 để tránh lỗi ENETUNREACH trên Render
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Tài khoản không tồn tại" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

    // Tạo token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Quên mật khẩu - Gửi Link Reset Token
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Vui lòng cung cấp địa chỉ Email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email này không tồn tại trong hệ thống" });
    }

    // Tạo chuỗi token ngẫu nhiên bằng thư viện crypto
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Lưu token và đặt thời gian hết hạn là 10 phút (600000 ms)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 600000;
    await user.save();

    console.log(`🔑 [TOKEN] Link khôi phục mật khẩu của ${email} là: /reset-password/${resetToken}`);

    // Gửi email thực tế thông qua cấu hình Gmail SMTP
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ Cảnh báo: Thiếu EMAIL_USER hoặc EMAIL_PASS trong file .env. Không thể gửi email thực tế.");
      return res.status(500).json({ message: "Dịch vụ gửi email chưa được cấu hình trên máy chủ." });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { ...options, family: 4 }, callback);
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        // Không từ chối kết nối nếu chứng chỉ tự ký (Né lỗi phân giải TLS trên Render)
        rejectUnauthorized: false
      }
    });

    // Xác định URL frontend động để sinh resetUrl
    const requestHost = req.get("host") || "";
    const isLocalhost = requestHost.includes("localhost") || requestHost.includes("127.0.0.1") || requestHost.includes("5000");
    const FRONTEND_URL = process.env.FRONTEND_URL || (isLocalhost ? "http://localhost:5173" : "https://cafe-sync-intelligent-system.vercel.app");
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"CafeSync Intelligent System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "🔒 KHÔI PHỤC MẬT KHẨU TÀI KHOẢN CAFESYNC 🔒",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #2E4D3E; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2E4D3E; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
          <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản CafeSync.</p>
          <p>Vui lòng bấm vào nút bên dưới để tiến hành đặt lại mật khẩu mới (Đường link có hiệu lực trong 10 phút):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2E4D3E; color: #D4AF37; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
              Đặt Lại Mật Khẩu
            </a>
          </div>
          <p style="font-size: 12px; color: #888;">Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "Link đặt lại mật khẩu đã được gửi qua Email!" });
  } catch (err) {
    console.error("Lỗi trong forgotPassword:", err);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ", error: err.message });
  }
};

// Đặt lại mật khẩu mới bằng Token
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const token = req.params.token;

    if (!password) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu mới!" });
    }

    // Tìm user có token trùng khớp và token đó phải còn hạn (lớn hơn thời gian hiện tại)
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Mã token không hợp lệ hoặc đã hết hạn!" });
    }

    // Cập nhật mật khẩu mới (Mongoose pre-save hook sẽ tự động băm mật khẩu này)
    user.password = password;
    
    // Xóa bỏ token sau khi đã dùng xong
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ [RESET_PASSWORD] Tài khoản ${user.email} đã đặt lại mật khẩu mới thành công.`);
    res.status(200).json({ message: "Cập nhật mật khẩu mới thành công!" });
  } catch (err) {
    console.error("Lỗi trong resetPassword:", err);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ", error: err.message });
  }
};