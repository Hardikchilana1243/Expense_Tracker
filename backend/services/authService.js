const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register a new user in database
 */
const register = async ({ fullName, email, password }) => {
  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error("An account with this email already exists");
    error.code = "USER_EXISTS";
    throw error;
  }

  const newUser = new User({ fullName, email, password });
  await newUser.save();
  return newUser;
};

/**
 * Authenticate existing user by email & password
 */
const authenticatePassword = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const error = new Error("Invalid email or password");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  return user;
};

/**
 * Authenticate or create user via Google OAuth ID token
 */
const authenticateGoogleToken = async (googleToken) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "your-google-client-id") {
    const error = new Error("Google OAuth is not configured on server");
    error.code = "CONFIG_ERROR";
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: googleToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture, email_verified: emailVerified } = payload || {};

  if (!email || !googleId) {
    const error = new Error("Invalid Google token payload");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  if (!emailVerified) {
    const error = new Error("Google account email is not verified");
    error.code = "UNVERIFIED_EMAIL";
    throw error;
  }

  let user = await User.findOne({ email });
  let isNewUser = false;

  if (user) {
    user.googleId = user.googleId || googleId;
    user.profileImage = user.profileImage || picture;
    if (!user.fullName && name) {
      user.fullName = name;
    }
    await user.save();
  } else {
    user = await User.create({
      fullName: name || email.split("@")[0],
      email,
      googleId,
      profileImage: picture,
    });
    isNewUser = true;
  }

  return { user, isNewUser };
};

/**
 * Find user by ID without password field
 */
const findUserById = async (userId) => {
  return User.findById(userId).select("-password");
};

module.exports = {
  register,
  authenticatePassword,
  authenticateGoogleToken,
  findUserById,
};
