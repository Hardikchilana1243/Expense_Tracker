const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { uploadStatement } = require("../middleware/uploadMiddleware");
const { uploadStatement: uploadStatementController, previewStatement } = require("../controllers/statementController");

router.use(authMiddleware);
router.post("/preview", uploadStatement, previewStatement);
router.post("/upload", uploadStatement, uploadStatementController);

module.exports = router;
