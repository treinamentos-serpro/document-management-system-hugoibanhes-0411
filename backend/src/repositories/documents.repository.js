const fs = require('node:fs');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

function create(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) || null;
}

function findByOwner(owner) {
  return Array.from(documents.values()).filter((document) => document.owner === owner);
}

function createReadStream(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) {
    throw new Error('Nome de armazenamento inválido.');
  }

  return fs.createReadStream(path.join(storageDirectory, storageName));
}

function removeFile(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) {
    return Promise.resolve();
  }

  return fs.promises.unlink(path.join(storageDirectory, storageName)).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

module.exports = {
  create,
  findById,
  findByOwner,
  createReadStream,
  removeFile,
};