import * as admin from 'firebase-admin';

admin.initializeApp();

// Re-exporta todas as funções diretamente dos seus arquivos de origem.
// A plataforma App Hosting irá descobrir e criar rotas para cada função HTTP individualmente
// e registrar os outros gatilhos (como o de autenticação) corretamente.

export * from './api/webhooks';
export * from './api/workflows';
export * from './api/patients';
export * from './api/templates';
export * from './auth';
export * from './test';
