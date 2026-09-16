const express = require("express");

const {
  registerUser,
  loginUser,
  googleAuth,
  getCurrentUser,
  getUserInfo,
  logoutUser,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const {
  validate,
  emailRule,
  passwordRule,
  sanitizedStringRule,
} = require("../middleware/validationMiddleware");

const {
  loginLimiter,
  signupLimiter,
  googleAuthLimiter,
  sessionAuthLimiter,
} = require("../middleware/rateLimiterMiddleware");

const router = express.Router();

const signupValidation = validate([
  sanitizedStringRule("fullName", "Full name", 2),
  emailRule("email"),
  passwordRule("password"),
]);

const loginValidation = validate([
  emailRule("email"),
  sanitizedStringRule("password", "Password", 1),
]);

router.post("/signup", signupLimiter, signupValidation, registerUser);
router.post("/login", loginLimiter, loginValidation, loginUser);
router.post("/google", googleAuthLimiter, googleAuth);
router.get("/me", sessionAuthLimiter, getCurrentUser);
router.post("/logout", logoutUser);
router.get("/getUser", authMiddleware, getUserInfo);

module.exports = router;
