const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { uploadStatement } = require("../middleware/uploadMiddleware");
const { uploadStatement: uploadStatementController, previewStatement } = require("../controllers/statementController");

router.use(authMiddleware);
router.post("/preview", uploadStatement, previewStatement);
router.post("/upload", uploadStatement, uploadStatementController);
// Dual export compatibility: direct Express router function, default export, and named export
router.default = router;
router.router = router;

module.exports = router;
module.exports.default = router;
module.exports.router = router;
