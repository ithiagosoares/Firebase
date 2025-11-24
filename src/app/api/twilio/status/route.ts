import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives delivery status updates from Twilio
export async function POST(request: NextRequest) {
  try {
    // Twilio sends status updates as form data
    const formData = await request.formData();
    const statusUpdate = Object.fromEntries(formData.entries());

    // Log the entire status update payload for debugging
    // You can view these logs in your Firebase project's Functions logs
    console.log('Received Twilio Status Update:', statusUpdate);

    // You can access specific fields like this:
    const messageSid = statusUpdate.MessageSid;
    const messageStatus = statusUpdate.MessageStatus; // e.g., 'sent', 'delivered', 'read', 'failed'
    const to = statusUpdate.To;
    const errorCode = statusUpdate.ErrorCode; // Will exist if the message failed

    // =========================================================================
    // TODO: DATABASE LOGIC
    // This is where you would update your database to reflect the message status.
    // For example: find the message with `messageSid` and update its status
    // to `messageStatus`.
    //
    // Example pseudo-code:
    // await db.messages.update({
    //   where: { twilioSid: messageSid },
    //   data: { status: messageStatus, errorCode: errorCode },
    // });
    // =========================================================================

    // Respond to Twilio with a 200 OK to acknowledge receipt of the update.
    return new NextResponse('Status received', { status: 200 });

  } catch (error) {
    console.error('Error processing Twilio status update:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
