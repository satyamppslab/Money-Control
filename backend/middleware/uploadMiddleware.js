const multer = require('multer');
const path = require('path');

function checkFileType(file, cb) {
  const allowedExts = /\.(jpg|jpeg|png|webp|pdf)$/i;
  const isExtAllowed = allowedExts.test(file.originalname);
  const isMimeAllowed = (file.mimetype && file.mimetype.startsWith('image/')) || file.mimetype === 'application/pdf';

  if (isExtAllowed || isMimeAllowed) {
    return cb(null, true);
  } else {
    cb(new Error('Images (jpg/jpeg/png/webp) or PDFs only!'));
  }
}

// Files are held in memory only long enough to send to OCR API, then discarded.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
