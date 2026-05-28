const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/stats/count", userController.getUserStats);

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Đổi mật khẩu
router.post("/:id/change-password", userController.changePassword);

module.exports = router;