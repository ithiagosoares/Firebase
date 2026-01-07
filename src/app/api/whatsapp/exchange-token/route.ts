import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Recebemos agora o 'accessToken' direto, e não mais o 'code'
    const { accessToken, userId } = await req.json();

    if (!accessToken || !userId) {
      return NextResponse.json({ error: "AccessToken e UserId são obrigatórios" }, { status: 400 });
    }

    const clientId = process.env.META_CLIENT_ID || "821688910682652"; 
    const clientSecret = process.env.META_CLIENT_SECRET; 

    if (!clientSecret) {
      console.error("ERRO CRÍTICO: META_CLIENT_SECRET não está definido.");
      return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
    }

    console.log(`Recebido token curto do usuário ${userId}. Iniciando extensão para longa duração...`);

    // ETAPA ÚNICA: Troca o token curto (1 hora) por um de LONGA duração (60 dias)
    // Esse endpoint NÃO exige redirect_uri, eliminando o erro de validação.
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${accessToken}`;
    
    const longTokenRes = await fetch(longLivedUrl);
    const longTokenData = await longTokenRes.json();
    
    if (longTokenData.error) {
        console.error("Erro ao estender token:", longTokenData.error);
        return NextResponse.json({ error: "Falha ao estender token", details: longTokenData.error }, { status: 500 });
    }

    const finalToken = longTokenData.access_token || accessToken; 
    console.log("Token de longa duração obtido com sucesso.");

    // Tenta pegar o ID do Facebook do usuário para salvar junto (Opcional, mas útil)
    let facebookUserId = "";
    try {
        const meRes = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${finalToken}`);
        const meData = await meRes.json();
        facebookUserId = meData.id;
    } catch (e) {
        console.warn("Não foi possível pegar o ID do usuário Meta.");
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
      message: "Integração concluída com sucesso" 
    });

  } catch (error: any) {
    console.error("Erro interno no servidor:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}