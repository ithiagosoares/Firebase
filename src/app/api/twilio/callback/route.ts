
import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const db = getFirestore(getFirebaseAdminApp());
  const { searchParams } = new URL(request.url);

  const state = searchParams.get("state"); 
  const whatsAppBusinessAccountId = searchParams.get("whatsAppBusinessAccountId");
  const anabled = searchParams.get("anabled");

  try {
    console.log("Twilio callback received:", {
      state,
      whatsAppBusinessAccountId,
      anabled,
    });

    if (!state || !whatsAppBusinessAccountId || anabled !== "true") {
      console.error("Callback inválido da Twilio. Parâmetros ausentes ou conexão não habilitada.");
      return new NextResponse("Falha na conexão. Por favor, tente novamente.", { status: 400 });
    }

    const userId = state;

    await db.collection("clinics").doc(userId).set(
      {
        wabaId: whatsAppBusinessAccountId,
        isTwilioConnected: true, 
      },
      { merge: true }
    );

    console.log(`WABA ID ${whatsAppBusinessAccountId} salvo para o usuário ${userId}`);

    return new NextResponse(
      '<!DOCTYPE html><html><head><script>window.close();</script></head><body>Conexão bem-sucedida! Esta janela pode ser fechada.</body></html>',
      {
        headers: { "Content-Type": "text/html" },
      }
    );

  } catch (error: any) {
    console.error("Erro ao processar o callback da Twilio:", error);
    return new NextResponse(
      "Ocorreu um erro ao salvar sua conexão. Por favor, contate o suporte.",
      { status: 500 }
    );
  }
}
