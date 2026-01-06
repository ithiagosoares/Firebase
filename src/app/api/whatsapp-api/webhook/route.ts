import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/whatsapp";
import { db } from "@/lib/firebase-admin";

// Token de verificação que você define no painel da Meta
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "vitallink_token_secreto";

// GET: Verificação do Webhook pela Meta
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

// POST: Recebimento de Mensagens
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verifica se é um evento do WhatsApp
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value && value.messages && value.messages[0]) {
        const message = value.messages[0];
        const from = message.from; // Número do cliente
        const textBody = message.text?.body; // Conteúdo da mensagem
        
        // IMPORTANTE: O WhatsApp manda o ID do telefone da empresa que recebeu
        const businessPhoneNumberId = value.metadata?.phone_number_id;

        console.log(`Webhook: Mensagem recebida de ${from} para o Business ID ${businessPhoneNumberId}`);

        if (businessPhoneNumberId && textBody) {
          // 1. Precisamos descobrir qual usuário do sistema é dono desse Business ID
          // Procuramos no Firestore um usuário que tenha esse phoneNumberId salvo na sessão
          const usersSnapshot = await db()
            .collection("users")
            .where("whatsappSession.phoneNumberId", "==", businessPhoneNumberId)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const userId = usersSnapshot.docs[0].id;
            
            // Lógica de Eco simples (Resposta automática de teste)
            // Em produção, aqui você chamaria sua IA ou salvaria no chat
            const responseText = `Recebemos sua mensagem: "${textBody}"`;
            
            // 2. Agora chamamos o sendMessage com os 3 argumentos corretos
            await sendMessage(userId, from, responseText);
            
          } else {
            console.warn(`Nenhum usuário encontrado para o Phone Number ID: ${businessPhoneNumberId}`);
          }
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });

  } catch (error) {
    console.error("Erro ao processar o webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}