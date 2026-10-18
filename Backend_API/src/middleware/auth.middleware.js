const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/**
 * Middleware kiểm tra quyền truy cập cho nhân viên và quản trị viên
 * Chặn Guest (không token), token không hợp lệ (401), và role Customer (403)
 */
exports.requireStaff = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Vui lòng đăng nhập tài khoản nhân viên / quản trị." });
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "CAFE_SYNC_SECRET_KEY");
  } catch {
    return res.status(401).json({ message: "Token xác thực không hợp lệ hoặc đã hết hạn." });
  }

  const { isStaffRole } = require("../utils/orderWorkflow");
  if (!decoded || !decoded.role || !isStaffRole(decoded.role)) {
    return res.status(403).json({ message: "Chức năng chỉ dành cho nhân viên và quản trị viên." });
  }

  req.user = decoded;
  next();
};