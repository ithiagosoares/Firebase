
import { NextRequest, NextResponse } from 'next/server';

// Rota de verificação do Webhook da Meta (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook da Meta verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('Falha na verificação do Webhook da Meta.');
    return new NextResponse(null, { status: 403 });
  }
}

// Rota para receber eventos do Webhook (POST)
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Evento bruto do webhook recebido:', JSON.stringify(body, null, 2));

  try {
    // ETAPA 1: EXTRAIR AS INFORMAÇÕES DA MENSAGEM
    // O objeto do webhook pode ser complexo. Esta lógica navega com segurança até os dados que importam.
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Se não for uma mensagem de texto ou se não houver dados, ignoramos o evento.
    if (!message || message.type !== 'text') {
      console.log('Evento ignorado (não é uma mensagem de texto).');
      return new NextResponse(null, { status: 200 });
    }

    const from = message.from; // Número de telefone de quem enviou. Ex: "5511999998888"
    const text = message.text.body; // O conteúdo da mensagem. Ex: "Olá, gostaria de agendar uma consulta."

    console.log(`MENSAGEM EXTRAÍDA -> De: ${from}, Texto: "${text}"`);

    // ETAPA 2: LÓGICA DE NEGÓCIO (O CÉREBRO DA SUA APLICAÇÃO)
    // É aqui que a mágica acontece. O que você faz com a mensagem?

    // **PRÓXIMOS PASSOS PARA VOCÊ IMPLEMENTAR:**
    // 1. **Consultar Paciente:** Verifique no seu banco de dados se o número `from` já pertence a um paciente cadastrado.
    //
    // 2. **Analisar Intenção:** Use 'if/else' ou uma IA para entender o que o `text` significa.
    //    - O paciente quer agendar? `if (text.toLowerCase().includes('agendar')) { ... }`
    //    - Quer confirmar uma consulta? `if (text.toLowerCase().includes('confirmar')) { ... }`
    //    - É uma pergunta geral?
    //
    // 3. **Executar Ação:** Com base na intenção, faça algo. Salve a confirmação no banco, procure horários livres, etc.
    //
    // 4. **Preparar Resposta:** Construa a mensagem de texto que você enviará de volta.
    //    - `const resposta = 'Consulta confirmada com sucesso!';`
    //
    // 5. **Enviar Resposta:** Use a API de envio de mensagens da Meta para mandar a `resposta` para o número `from`.
    //    (Este será o nosso próximo grande passo juntos, quando você estiver pronto).


  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    // Mesmo em caso de erro, retornamos 200 para a Meta não ficar reenviando o evento.
    return new NextResponse(null, { status: 200 });
  }

  // ETAPA 3: CONFIRMAR RECEBIMENTO
  // Enviamos uma resposta 200 OK para a Meta para dizer "Recebi, obrigado. Não precisa enviar de novo."
  return new NextResponse(null, { status: 200 });
}
