import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES) || 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE_BYTES) || 3 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// Create uploads directory if it doesn't exist
import { mkdir } from 'fs/promises';
mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter
function fileFilter(req, file, cb) {
  const isImage = file.mimetype.startsWith('image/');
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (isImage && !allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Middleware to check file size on upload
export function validateFileSize(req, res, next) {
  if (!req.file) {
    return next();
  }

  const isImage = req.file.mimetype.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (req.file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return res.status(400).json({
      error: `File too large. Maximum size: ${maxMB} MB`
    });
  }

  next();
}
