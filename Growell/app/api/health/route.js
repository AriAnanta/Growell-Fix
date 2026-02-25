import { NextResponse } from 'next/server';
import { checkMLHealth } from '@/lib/ml';

export async function GET() {
  const mlStatus = await checkMLHealth();
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      ml: mlStatus.status === 'ok' ? 'healthy' : 'unhealthy',
    }
  });
}
