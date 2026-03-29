import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Agora recebemos o 'code' entregue pelo Embedded Signup (e não o token)
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: "Code e UserId são obrigatórios" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_META_CLIENT_ID || process.env.META_CLIENT_ID || "821688910682652"; 
    const clientSecret = process.env.META_CLIENT_SECRET; 

    if (!clientSecret) {
      console.error("ERRO CRÍTICO: META_CLIENT_SECRET não está definido.");
      return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
    }

    console.log(`Recebido code do usuário ${userId}. Iniciando OAuth Dance...`);

    // PASSO 1: Trocar o code pelo accessToken
    const oauthUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
    
    const tokenRes = await fetch(oauthUrl);
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) {
        console.error("Erro ao trocar code por token:", tokenData.error);
        return NextResponse.json({ error: "Falha na troca de código Oauth", details: tokenData.error }, { status: 500 });
    }

    // Diferente do fb_exchange_token, um system token entregue por Embedded Signup já tem vida longa nativa.
    const accessToken = tokenData.access_token;
    console.log("Access token obtido com sucesso pelo Code.");

    // PASSO 2: Descobrir o WABA ID (WhatsApp Business Account ID) usando /debug_token
    const appAccessToken = `${clientId}|${clientSecret}`;
    const debugTokenUrl = `https://graph.facebook.com/v20.0/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`;
    
    const debugRes = await fetch(debugTokenUrl);
    const debugData = await debugRes.json();
    
    let wabaId = "";
    
    if (debugData.data?.granular_scopes) {
        // No OAuth do WhatsApp, o target_id de business_messaging é o WABA ID!
        const messagingScope = debugData.data.granular_scopes.find(
            (s: any) => s.scope === "whatsapp_business_messaging" || s.scope === "whatsapp_business_management"
        );
        if (messagingScope && messagingScope.target_ids && messagingScope.target_ids.length > 0) {
            wabaId = messagingScope.target_ids[0]; // Extraíndo WABA associado
        }
    }
    
    if (!wabaId) {
        console.warn("Aviso: Não foi possível obter o WABA ID via debug_token. Permissões podem estar faltando.");
    }

    // PASSO 3: Descobrir os números de telefone alocados
    let phoneNumberId = "";
    let businessId = "";

    if (wabaId) {
        console.log(`Waba ID descoberto: ${wabaId}. Buscando telefones associados...`);
        try {
            const phonesUrl = `https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
            const phonesRes = await fetch(phonesUrl);
            const phonesData = await phonesRes.json();
            
            if (phonesData.data && phonesData.data.length > 0) {
                // Captura o primeiro telefone cadastrado pelo usuário no Embedded Signup
                phoneNumberId = phonesData.data[0].id;
                console.log(`Telefone encontrado e vinculado: ${phoneNumberId}`);
            }

            // Opcional Passo 4: Buscar o Business Account Id (ID do Gerenciador de Negócios dono deste WABA)
            const wabaDetailsUrl = `https://graph.facebook.com/v20.0/${wabaId}?fields=owner_business&access_token=${accessToken}`;
            const wabaDetailsRes = await fetch(wabaDetailsUrl);
            const wabaDetailsData = await wabaDetailsRes.json();
            
            if (wabaDetailsData.owner_business?.id) {
                businessId = wabaDetailsData.owner_business.id;
            }
        } catch (e: any) {
            console.error("Erro ao buscar detalhes avançados na Graph API:", e.message);
        }
    }

    // Pegando o identificador simples de quem logou (caso precise em relatórios)
    let facebookUserId = "";
    try {
        const meRes = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${accessToken}`);
        const meData = await meRes.json();
        facebookUserId = meData.id || "";
    } catch(e) {}

    // PASSO 5: Salvar absolutamente tudo no banco e enriquecer a inteligência Multi-Tenant!
    // Esses dados ali (wabaId e phoneNumberId principalmente) vão sustentar os Webhooks vindouros
    await db().collection("users").doc(userId).update({
      whatsappSession: {
        accessToken: accessToken,
        facebookUserId: facebookUserId,
        wabaId: wabaId,
        phoneNumberId: phoneNumberId,
        businessId: businessId,
        connectedAt: new Date().toISOString(),
        status: 'connected'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Integração Embedded Signup concluída com sucesso!" 
    });

  } catch (error: any) {
    console.error("Erro interno no servidor:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}