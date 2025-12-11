const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrstudio29664457918969 = onRequest({}, (req, res) => server.then(it => it.handle(req, res)));
  