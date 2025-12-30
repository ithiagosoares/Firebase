import * as functions from 'firebase-functions';

/**
 * Uma função de teste HTTP simples para verificar a implantação.
 */
export const ping = functions.https.onRequest((request, response) => {
  functions.logger.info('>>> PING! A função de teste foi executada com sucesso! <<<');
  response.status(200).send('Pong! O backend da pasta `functions` foi implantado.');
});
