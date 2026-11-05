const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const configuredFileSizeLimit = Number(process.env.MAX_FILE_SIZE_BYTES);
const fileSizeLimit = Number.isSafeInteger(configuredFileSizeLimit) && configuredFileSizeLimit > 0
  ? configuredFileSizeLimit
  : 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => callback(error, storageDirectory));
  },
  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: fileSizeLimit, files: 1, fields: 0, parts: 2 },
});

function parseUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(error);
    }

    if (error instanceof multer.MulterError || !error.code) {
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.message = 'A requisição de upload não é válida.';
    }

    return next(error);
  });
}

router.post('/upload', documentsController.requireUserId, parseUpload, documentsController.upload);
router.get('/documents', documentsController.requireUserId, documentsController.list);
router.get('/documents/:id/download', documentsController.requireUserId, documentsController.download);

module.exports = router;