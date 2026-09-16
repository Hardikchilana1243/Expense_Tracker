const authService = require("../services/authService");
const {
  signJwt,
  buildCookieOptions,
  extractToken,
  verifyJwt,
  createAuthErrorResponse,
} = require("../utils/auth");

const cookieOptions = buildCookieOptions(7);

// ================= REGISTER =================
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const newUser = await authService.register({ fullName, email, password });
    const token = signJwt({ id: newUser._id, email: newUser.email });

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profileImageUrl: newUser.profileImage || null,
      },
    });
  } catch (error) {
    if (error.code === "USER_EXISTS") {
      return res.status(400).json(createAuthErrorResponse("user_exists", error.message));
    }
    console.error("Register error:", error);
    res.status(500).json(createAuthErrorResponse("server_error", "Registration failed. Please try again later."));
  }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.authenticatePassword({ email, password });
    const token = signJwt({ id: user._id, email: user.email });

    res.cookie("token", token, cookieOptions);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImageUrl: user.profileImage || null,
      },
    });
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") {
      return res.status(401).json(createAuthErrorResponse("invalid_credentials", error.message));
    }
    console.error("Login error:", error);
    res.status(500).json(createAuthErrorResponse("server_error", "Login failed. Please try again later."));
  }
};

// ================= GOOGLE AUTH =================
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, token } = req.body;
    const googleToken = idToken || token;

    const { user, isNewUser } = await authService.authenticateGoogleToken(googleToken);
    const jwtToken = signJwt({ id: user._id, email: user.email });
    res.cookie("token", jwtToken, cookieOptions);

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser ? "User created successfully" : "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImageUrl: user.profileImage || null,
      },
    });
  } catch (error) {
    if (error.code === "CONFIG_ERROR") {
      return res.status(500).json(createAuthErrorResponse("config_error", error.message));
    }
    if (error.code === "INVALID_TOKEN") {
      return res.status(400).json(createAuthErrorResponse("invalid_token", error.message));
    }
    if (error.code === "UNVERIFIED_EMAIL") {
      return res.status(401).json(createAuthErrorResponse("unverified_email", error.message));
    }
    console.error("Google auth error:", error);
    res.status(401).json(createAuthErrorResponse("invalid_token", "Google token verification failed"));
  }
};

// ================= LOGOUT =================
exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", buildCookieOptions(0));
    res.json({ success: true, message: "Logout successful" });
  } catch (error) {
    res.status(500).json(createAuthErrorResponse("server_error", "Logout failed"));
  }
};

// ================= GET CURRENT USER =================
exports.getCurrentUser = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json(createAuthErrorResponse("unauthorized", "No session token found"));
    }

    const decoded = verifyJwt(token);
    const user = await authService.findUserById(decoded.id);

    if (!user) {
      return res.status(404).json(createAuthErrorResponse("not_found", "User account not found"));
    }

    res.json({
      success: true,
      message: "User verified",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImageUrl: user.profileImage || null,
        bankAccount: user.bankAccount || null,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      console.warn("⚠️  /auth/me — invalid or expired token:", error.message);
    } else {
      console.error("Get current user error:", error);
    }
    res.status(401).json(createAuthErrorResponse("invalid_token", "Invalid or expired session token"));
  }
};

// ================= GET USER INFO =================
exports.getUserInfo = async (req, res) => {
  try {
    const user = await authService.findUserById(req.userId);
    if (!user) {
      return res.status(404).json(createAuthErrorResponse("not_found", "User not found"));
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json(createAuthErrorResponse("server_error", "Failed to fetch user profile"));
  }
};
