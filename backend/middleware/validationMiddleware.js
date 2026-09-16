const { validationResult, body, param, query } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Reusable middleware runner for express-validator array of validation rules
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      error: "validation_error",
      message: formattedErrors[0]?.message || "Validation failed",
      errors: formattedErrors,
    });
  };
};

/**
 * Validates that :userId in route params is a valid ObjectId and matches the authenticated req.userId
 */
const validateUserId = validate([
  param("userId")
    .exists().withMessage("User ID parameter is required")
    .bail()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid User ID format")
    .bail()
    .custom((val, { req }) => {
      if (req.userId && val !== req.userId.toString()) {
        throw new Error("Unauthorized access to user resource");
      }
      return true;
    }),
]);

/**
 * Validates a route parameter is a valid MongoDB ObjectId
 */
const validateMongoId = (paramName) =>
  validate([
    param(paramName)
      .exists().withMessage(`${paramName} parameter is required`)
      .bail()
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage(`Invalid ${paramName} format`),
  ]);

/**
 * Rule builder for financial amount fields (> 0, non-NaN, non-negative)
 */
const amountRule = (field = "amount") =>
  body(field)
    .exists({ checkNull: true, checkFalsy: true }).withMessage(`${field} is required`)
    .bail()
    .isFloat({ gt: 0 }).withMessage(`${field} must be a positive number greater than 0`)
    .bail()
    .custom((val) => !isNaN(val))
    .withMessage(`${field} must be a valid number`);

/**
 * Rule builder for email fields
 */
const emailRule = (field = "email") =>
  body(field)
    .trim()
    .exists().withMessage(`${field} is required`)
    .bail()
    .isEmail().withMessage("Invalid email address format")
    .normalizeEmail();

/**
 * Rule builder for password fields
 */
const passwordRule = (field = "password") =>
  body(field)
    .trim()
    .exists().withMessage(`${field} is required`)
    .bail()
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long");

/**
 * Rule builder for sanitized required string inputs (prevents XSS)
 */
const sanitizedStringRule = (field, displayName = field, minLen = 1) =>
  body(field)
    .trim()
    .exists().withMessage(`${displayName} is required`)
    .bail()
    .isLength({ min: minLen }).withMessage(`${displayName} cannot be empty`)
    .escape();

/**
 * Rule builder for sanitized optional string inputs
 */
const optionalStringRule = (field) =>
  body(field)
    .optional({ checkFalsy: true })
    .trim()
    .escape();

module.exports = {
  validate,
  validateUserId,
  validateMongoId,
  amountRule,
  emailRule,
  passwordRule,
  sanitizedStringRule,
  optionalStringRule,
};
