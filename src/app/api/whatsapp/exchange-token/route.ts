import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: "Code e UserId são obrigatórios" }, { status: 400 });
    }

    // 1. Definição das Credenciais (Usando os nomes corretos do apphosting.yaml)
    const clientId = process.env.META_CLIENT_ID || "821688910682652"; // Seu App ID
    const clientSecret = process.env.META_CLIENT_SECRET; // <--- AQUI ESTAVA O ERRO PROVAVELMENTE

    if (!clientSecret) {
      console.error("ERRO CRÍTICO: META_CLIENT_SECRET não está definido nas variáveis de ambiente.");
      return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
    }

    console.log(`Iniciando troca de token para o usuário ${userId}...`);

    // 2. Troca o 'code' pelo 'access_token' de usuário
    // Nota: Para códigos vindos do FB.login(), o redirect_uri geralmente deve ser a URL exata ou vazia dependendo do fluxo.
    // Vamos tentar passar a URL base do site ou deixar sem se falhar.
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=https://vitallink.clinic/`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Erro da Meta ao trocar token:", JSON.stringify(tokenData.error));
      return NextResponse.json({ error: "Falha ao obter access_token da Meta", details: tokenData.error }, { status: 500 });
    }

    const shortLivedToken = tokenData.access_token;
    console.log("Access Token de curta duração obtido com sucesso.");

    // 3. Troca o token de curta duração por um de LONGA duração (60 dias)
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const longTokenRes = await fetch(longLivedUrl);
    const longTokenData = await longTokenRes.json();
    
    const finalToken = longTokenData.access_token || shortLivedToken; // Usa o longo se der certo, senão usa o curto

    // 4. Busca o número de telefone e o ID da conta do WhatsApp Business (WABA)
    // Precisamos saber quais ativos esse usuário tem acesso
    const meUrl = `https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${finalToken}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json();

    // Busca as contas do WhatsApp Business vinculadas
    const wabaUrl = `https://graph.facebook.com/v20.0/${meData.id}/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}&access_token=${finalToken}`;
    // Nota: Essa query acima é complexa, às vezes é melhor buscar granularmente. 
    // Vamos tentar uma abordagem mais direta para pegar o telefone se possível, ou salvar apenas o token e deixar o usuário configurar depois.
    // Para simplificar e garantir o sucesso do erro 500 agora, vamos focar em salvar o token.
    
    // Vamos salvar o token no Firestore
    await db().collection("users").doc(userId).update({
      whatsappSession: {
        accessToken: finalToken,
        facebookUserId: meData.id,
        connectedAt: new Date().toISOString(),
        status: 'connected'
      }
    });

    return NextResponse.json({ 
      success: true, 
      phoneNumber: "Pendente de seleção", // Podemos melhorar isso num segundo passo
      message: "Token salvo com sucesso" 
    });

  } catch (error: any) {
    console.error("Erro interno no servidor:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}