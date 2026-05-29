const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    role: { type: String, default: "customer" },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Thay đoạn code cũ bằng đoạn này để hết lỗi "next"
UserSchema.pre("save", async function () {
  // Nếu mật khẩu không thay đổi thì không làm gì cả
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // Với async function, mình không cần gọi next() nữa, 
    // Mongoose sẽ tự biết khi nào xong.
  } catch (err) {
    throw err; // Báo lỗi nếu có vấn đề khi băm mật khẩu
  }
});

module.exports = mongoose.model("User", UserSchema);