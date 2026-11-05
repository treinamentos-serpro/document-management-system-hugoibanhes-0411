const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');
const fileStorageRepository = require('../repositories/file-storage.repository');

function createServiceError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function toPublicDocument({ storageName, ...document }) {
  return document;
}

async function uploadDocument(file, owner) {
  if (!file) {
    throw createServiceError(400, 'VALIDATION_ERROR', 'Envie um arquivo para continuar.');
  }

  if (file.size === 0) {
    await fileStorageRepository.removeFile(file.filename);
    throw createServiceError(400, 'VALIDATION_ERROR', 'O arquivo não pode estar vazio.');
  }

  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };

  try {
    documentsRepository.create(document);
  } catch (error) {
    await fileStorageRepository.removeFile(file.filename).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentsRepository
    .findByOwner(owner)
    .sort((left, right) => {
      const dateOrder = right.uploadedAt.localeCompare(left.uploadedAt);
      return dateOrder || left.id.localeCompare(right.id);
    })
    .map(toPublicDocument);
}

function getDocumentDownload(id, owner) {
  const document = documentsRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw createServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: toPublicDocument(document),
    stream: fileStorageRepository.createReadStream(document.storageName),
  };
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentDownload,
};