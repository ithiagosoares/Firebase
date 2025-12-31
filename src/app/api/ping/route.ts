import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Pong! Backend App Hosting funcionando.'
  });
}
