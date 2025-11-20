import { NextResponse } from 'next/server';
import { Twilio } from 'twilio';

// Initialize Twilio Client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // The Twilio Sandbox number, e.g., 'whatsapp:+14155238886'

if (!accountSid || !authToken || !twilioWhatsappNumber) {
  throw new Error('Twilio credentials are not set in environment variables.');
}

const client = new Twilio(accountSid, authToken);

export async function POST(request: Request) {
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
