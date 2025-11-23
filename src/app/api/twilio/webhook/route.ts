
import { NextRequest, NextResponse } from "next/server";

// A Twilio envia os dados como application/x-www-form-urlencoded
// Precisamos parsear o corpo da requisição para um objeto.
async function parseTwilioRequest(req: NextRequest) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const body: { [key: string]: string } = {};
    for (const [key, value] of params.entries()) {
        body[key] = value;
    }
    return body;
}

export async function POST(req: NextRequest) {
    try {
        const body = await parseTwilioRequest(req);

        // Extrai as informações mais importantes da mensagem recebida
        const from = body.From; // Ex: "whatsapp:+5511999998888"
        const to = body.To;     // Ex: "whatsapp:+551947920762"
        const message = body.Body; // A resposta do paciente, ex: "Sim"

        console.log(`--- Mensagem Recebida da Twilio ---`);
        console.log(`De: ${from}`);
        console.log(`Para: ${to}`);
        console.log(`Mensagem: "${message}"`);
        console.log(`---------------------------------`);

        // Responde à Twilio que recebemos a mensagem com sucesso.
        // É crucial responder com 200 OK para evitar que a Twilio tente reenviar.
        return new NextResponse(null, { status: 200 });

    } catch (error) {
        console.error("Erro ao processar webhook da Twilio:", error);
        return new NextResponse("Erro interno do servidor", { status: 500 });
    }
}
