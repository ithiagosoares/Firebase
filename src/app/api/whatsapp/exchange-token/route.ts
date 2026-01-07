import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: "Code e UserId são obrigatórios" }, { status: 400 });
    }

    // 1. Definição das Credenciais
    const clientId = process.env.META_CLIENT_ID || "821688910682652"; 
    const clientSecret = process.env.META_CLIENT_SECRET; 

    if (!clientSecret) {
      console.error("ERRO CRÍTICO: META_CLIENT_SECRET não está definido.");
      return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
    }

    console.log(`Iniciando troca de token para o usuário ${userId}...`);

    // 2. Troca o 'code' pelo 'access_token' de curta duração
    // CORREÇÃO: Removi o parâmetro '&redirect_uri=...' pois ele causa erro 191 em fluxos de popup
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Erro da Meta (Token Curto):", JSON.stringify(tokenData.error));
      // Vamos retornar o erro exato para facilitar o debug no frontend se acontecer de novo
      return NextResponse.json({ error: "Falha ao obter access_token", details: tokenData.error }, { status: 500 });
    }

    const shortLivedToken = tokenData.access_token;
    console.log("Token curto obtido. Trocando por longa duração...");

    // 3. Troca por Token de LONGA Duração (60 dias)
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const longTokenRes = await fetch(longLivedUrl);
    const longTokenData = await longTokenRes.json();
    
    const finalToken = longTokenData.access_token || shortLivedToken; 

    // 4. Salvar no Firestore
    
    // Tenta pegar o ID do Facebook do usuário para salvar junto
    let facebookUserId = "";
    try {
        const meRes = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${finalToken}`);
        const meData = await meRes.json();
        facebookUserId = meData.id;
    } catch (e) {
        console.warn("Não foi possível pegar o ID do usuário Meta, seguindo apenas com token.");
    }

    await db().collection("users").doc(userId).update({
      whatsappSession: {
        accessToken: finalToken,
        facebookUserId: facebookUserId,
        connectedAt: new Date().toISOString(),
        status: 'connected'
      }
    });

    return NextResponse.json({ 
      success: true, 
      phoneNumber: "Conectado", 
      message: "Token salvo com sucesso" 
    });

  } catch (error: any) {
    console.error("Erro interno no servidor:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}