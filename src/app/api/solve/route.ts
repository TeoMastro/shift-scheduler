import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const schedule = await request.json();

    if (
      !schedule ||
      !Array.isArray(schedule.employees) ||
      !Array.isArray(schedule.shifts)
    ) {
      return new Response(
        'Invalid payload: expected employees and shifts arrays',
        { status: 400 }
      );
    }

    if (!BACKEND) {
      return new Response('Solver backend URL is not configured', {
        status: 500,
      });
    }

    // Start solving job and return jobId immediately for frontend polling
    const startRes = await fetch(`${BACKEND}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify(schedule),
    });

    if (!startRes.ok) {
      const errorText = await startRes.text();
      return NextResponse.json(
        { error: errorText },
        { status: startRes.status }
      );
    }

    const jobId = await startRes.text();

    // Return jobId immediately for frontend to poll
    return NextResponse.json({ jobId, status: 'SOLVING' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(message, { status: 500 });
  }
}
