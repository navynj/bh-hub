/**
 * GET /api/delivery/realtime/stream
 * Server-Sent Events: office session + ?driverId=…, or driver JWT (Authorization: Bearer).
 *
 * Uses an in-memory bus (same Node process). For multiple app instances or strict serverless
 * timeouts, replace with Redis pub/sub or a hosted realtime provider.
 */

import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { verifyDriverToken } from '@/lib/delivery/driver-auth';
import type { DeliveryRealtimeEvent } from '@/lib/delivery/delivery-realtime-types';
import { getDeliveryRealtimeBus } from '@/lib/delivery/realtime-bus';
import { prisma } from '@/lib/core/prisma';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const driverIdParam = searchParams.get('driverId');

  let driverId: string | null = null;

  const bearer = request.headers.get('authorization');
  const driverPayload = verifyDriverToken(bearer);

  if (driverPayload) {
    driverId = driverPayload.driverId;
  } else {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (!driverIdParam) {
      return new Response('driverId query required', { status: 400 });
    }
    const exists = await prisma.driver.findUnique({
      where: { id: driverIdParam },
      select: { id: true },
    });
    if (!exists) {
      return new Response('Driver not found', { status: 404 });
    }
    driverId = driverIdParam;
  }

  const bus = getDeliveryRealtimeBus();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: DeliveryRealtimeEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const unsubscribe = bus.subscribe(driverId!, send);

      send({ type: 'connected', driverId: driverId! });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
