/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|pdf|txt|xlsx|xls|csv)$/i;
  const allowedMimes = /jpeg|jpg|png|pdf|txt|text\/plain|spreadsheetml|ms-excel|excel|octet-stream|csv/i;

  const extValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimes.test(file.mimetype);

  if (extValid || mimeValid) {
    return cb(null, true);
  }
  return cb(new Error('File format is not supported'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10000000 }, // 10 MB in bytes
  fileFilter: fileFilter
});


module.exports = upload;
