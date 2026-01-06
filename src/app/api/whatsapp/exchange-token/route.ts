import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: "Código ou UserId ausente" }, { status: 400 });
    }

    // 1. Trocar o código pelo Access Token do Usuário do Sistema
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_CLIENT_ID}&client_secret=${process.env.META_CLIENT_SECRET}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("Erro na troca de token Meta:", tokenData);
      throw new Error("Falha ao obter access_token da Meta");
    }

    const accessToken = tokenData.access_token;

    // 2. Obter o ID da conta do WhatsApp Business (WABA ID) e ID do Telefone
    // Usamos o token recém-criado para consultar quais contas ele tem acesso
    const debugTokenUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugRes = await fetch(debugTokenUrl);
    const debugData = await debugRes.json();
    
    // Agora buscamos os telefones associados a esse WABA
    // Nota: Em produção, você pode precisar listar as contas e pedir pro usuário selecionar se houver mais de uma.
    // Aqui assumimos que ele conectou a conta certa.
    const wabaId = debugData.data.granularity_scope?.[0]?.target_ids?.[0]; // Simplificação comum

    // Vamos buscar os números de telefone conectados a esse Token
    // Documentação: https://developers.facebook.com/docs/whatsapp/business-management-api/manage-phone-numbers
    const phoneUrl = `https://graph.facebook.com/v19.0/me?fields=accounts{whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}}&access_token=${accessToken}`;
    
    const phoneRes = await fetch(phoneUrl);
    const phoneData = await phoneRes.json();

    // Lógica para extrair o primeiro número de telefone encontrado
    let phoneNumberId = "";
    let displayPhoneNumber = "";
    
    // Navegar na estrutura complexa do JSON da Meta para achar o ID
    // Estrutura típica: data.accounts.data[0].whatsapp_business_accounts.data[0].phone_numbers.data[0].id
    // Isso pode variar dependendo da conta, vamos tentar uma busca segura:
    try {
        const accounts = phoneData.accounts?.data?.[0]?.whatsapp_business_accounts?.data?.[0];
        const phoneInfo = accounts?.phone_numbers?.data?.[0];
        
        if (phoneInfo) {
            phoneNumberId = phoneInfo.id;
            displayPhoneNumber = phoneInfo.display_phone_number;
        }
    } catch (e) {
        console.error("Erro ao fazer parse dos dados do telefone:", e);
    }

    if (!phoneNumberId) {
        // Fallback: Se não achou automaticamente, salvamos apenas o token e pedimos configuração manual ou tentamos outra lógica
        console.warn("Phone Number ID não encontrado automaticamente.");
    }

    // 3. Salvar no Firestore
    await db().collection("users").doc(userId).update({
      whatsappSession: {
        accessToken: accessToken,
        phoneNumberId: phoneNumberId, // Se vazio, o usuário precisará configurar ou refazer
        wabaId: wabaId || null,
        displayPhoneNumber: displayPhoneNumber || null,
        connectedAt: new Date().toISOString(),
        status: 'connected'
      }
    });

    return NextResponse.json({ success: true, phoneNumber: displayPhoneNumber });

  } catch (error: any) {
    console.error("Erro no exchange-token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}