const multer = require('multer');
const path = require('path');

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|pdf|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images (jpg/jpeg/png/webp) or PDFs only!'));
  }
}

// Files are held in memory only long enough to send to Gemini for OCR, then
// discarded - nothing is persisted to disk (serverless filesystems are
// ephemeral, so a written file wouldn't be retrievable afterward anyway).
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
