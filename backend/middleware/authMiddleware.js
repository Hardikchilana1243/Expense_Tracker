const { extractToken, verifyJwt, createAuthErrorResponse } = require("../utils/auth");

const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json(createAuthErrorResponse("unauthorized", "Authentication token required"));
    }

    const decoded = verifyJwt(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json(createAuthErrorResponse("invalid_token", "Invalid token payload"));
    }

    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(createAuthErrorResponse("token_expired", "Session expired, please log in again"));
    }
    return res.status(401).json(createAuthErrorResponse("invalid_token", "Invalid or malformed authentication token"));
  }
};

module.exports = authMiddleware;