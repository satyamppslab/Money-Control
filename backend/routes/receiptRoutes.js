const express = require('express');
const router = express.Router();
const { uploadAndScanReceipt } = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('receipt'), uploadAndScanReceipt);

module.exports = router;
