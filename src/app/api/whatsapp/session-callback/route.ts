import {NextRequest, NextResponse} from 'next/server';

/**
 * Rota de API para receber callbacks do n8n sobre o status da sessão do WhatsApp.
 * Quando o n8n é notificado pelo backend do WhatsApp que uma sessão está 'ready',
 * ele chama este endpoint para informar o aplicativo principal.
 *
 * @param {NextRequest} request O objeto da requisição recebida.
 * @returns {NextResponse} Uma resposta JSON confirmando o recebimento.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log para depuração - você verá isso nos logs do seu App Hosting no Firebase
    console.log('Recebido callback de sessão do WhatsApp via n8n:', body);

    const {userId, sessionId, status, meta} = body;

    // TODO: Implementar a lógica de negócio aqui.
    // Por exemplo:
    // 1. Validar os dados recebidos.
    // 2. Atualizar o status da conexão do WhatsApp para o usuário no Firestore.
    //    const userRef = doc(firestore, "users", userId);
    //    await updateDoc(userRef, {
    //        whatsappSession: {
    //            id: sessionId,
    //            status: status,
    //            connectedAt: new Date().toISOString()
    //        }
    //    });
    // 3. (Opcional) Enviar uma notificação em tempo real para o cliente (frontend) se ele estiver online.

    if (!userId || !status) {
      return NextResponse.json(
        {success: false, message: 'Faltando userId ou status no corpo da requisição.'},
        {status: 400}
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Callback recebido com sucesso!',
      data: body,
    });
  } catch (error) {
    console.error('Erro ao processar callback do webhook:', error);
    return NextResponse.json(
      {success: false, message: 'Erro interno do servidor.'},
      {status: 500}
    );
  }
}
