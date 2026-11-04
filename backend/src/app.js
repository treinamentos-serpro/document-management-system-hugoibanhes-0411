// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentsRoutes = require('./routes/documents.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;

  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'FILE_TOO_LARGE';
    message = 'O arquivo excede o limite permitido.';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Envie um único arquivo no campo file.';
  } else if (!error.status) {
    status = 500;
    code = 'INTERNAL_ERROR';
    message = 'Ocorreu um erro interno.';
  }

  return res.status(status).json({ error: { code, message } });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
