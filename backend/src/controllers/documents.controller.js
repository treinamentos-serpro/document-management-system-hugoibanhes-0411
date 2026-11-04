const path = require('node:path');
const documentsService = require('../services/documents.service');

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireUserId(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();

  if (!owner) {
    return next(createHttpError(400, 'VALIDATION_ERROR', 'O cabeçalho X-User-Id é obrigatório.'));
  }

  req.owner = owner;
  return next();
}

async function upload(req, res, next) {
  try {
    const document = await documentsService.uploadDocument(req.file, req.owner);
    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.status(200).json(documentsService.listDocuments(req.owner));
  } catch (error) {
    return next(error);
  }
}

function sanitizeDownloadName(originalName) {
  const normalizedName = originalName.replace(/\\/g, '/');
  const basename = path.posix.basename(normalizedName).replace(/[\r\n\0]/g, '');
  return basename || 'document';
}

function download(req, res, next) {
  let downloadResult;

  try {
    downloadResult = documentsService.getDocumentDownload(req.params.id, req.owner);
  } catch (error) {
    return next(error);
  }

  res.status(200);
  res.type('application/octet-stream');
  res.attachment(sanitizeDownloadName(downloadResult.document.originalName));

  downloadResult.stream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    next(createHttpError(500, 'INTERNAL_ERROR', 'Não foi possível baixar o documento.'));
  });

  return downloadResult.stream.pipe(res);
}

module.exports = {
  requireUserId,
  upload,
  list,
  download,
};