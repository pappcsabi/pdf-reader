const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ALLOWED_MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function getExt(mimetype) {
  const map = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
  };
  return map[mimetype] || '';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id;
    if (!userId) {
      return cb(new Error('User not authenticated'));
    }
    const dir = path.join('uploads', userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = getExt(file.mimetype) || path.extname(file.originalname) || '';
    const uuid = crypto.randomBytes(16).toString('hex');
    cb(null, `${uuid}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error('Tip fișier nepermis. Doar PDF, DOCX și TXT.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

module.exports = { upload, ALLOWED_MIMES };
