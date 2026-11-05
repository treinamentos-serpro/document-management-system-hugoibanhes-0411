const fs = require('node:fs');
const path = require('node:path');
const storageDirectory = require('../config/storage');

function isValidStorageName(storageName) {
  return Boolean(storageName) && path.basename(storageName) === storageName;
}

function getStoragePath(storageName) {
  if (!isValidStorageName(storageName)) {
    throw new Error('Nome de armazenamento inválido.');
  }

  return path.join(storageDirectory, storageName);
}

function createReadStream(storageName) {
  return fs.createReadStream(getStoragePath(storageName));
}

function removeFile(storageName) {
  if (!isValidStorageName(storageName)) {
    return Promise.resolve();
  }

  return fs.promises.unlink(getStoragePath(storageName)).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

module.exports = {
  createReadStream,
  removeFile,
};
