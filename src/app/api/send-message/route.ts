import { NextResponse } from 'next/server';
import { Twilio } from 'twilio';

export async function POST(request: Request) {
  // Move Twilio Client initialization and credential check inside the POST function
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  // Check for credentials at runtime, not build time
  if (!accountSid || !authToken || !twilioWhatsappNumber) {
    console.error('Twilio credentials are not set in environment variables.');
    // Return a server error instead of throwing an error that crashes the build
    return NextResponse.json({ error: 'Twilio service is not configured on the server.' }, { status: 500 });
  }

  const client = new Twilio(accountSid, authToken);

  try {
    const { to, body } = await request.json();

    if (!to || !body) {
      return NextResponse.json({ error: 'Missing "to" or "body" in request' }, { status: 400 });
    }

    // IMPORTANT: The 'to' number must be in the format 'whatsapp:+5511999998888'
    // It must also be a number that has joined your Twilio Sandbox.
    const message = await client.messages.create({
      from: twilioWhatsappNumber,
      to: `whatsapp:${to}`,
      body: body,
    });

    console.log('Message sent:', message.sid);

    return NextResponse.json({ success: true, messageSid: message.sid });

  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
