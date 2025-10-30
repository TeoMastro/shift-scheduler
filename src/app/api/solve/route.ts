import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;
const POLL_MS = 2000;
const TIMEOUT_MS = 60_000; // wait up to 60s

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    // 1) Start solving
    const startRes = await fetch(`${BACKEND}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify(schedule),
    });

    if (!startRes.ok) {
      return NextResponse.json(
        { error: await startRes.text() },
        { status: startRes.status }
      );
    }

    const jobId = await startRes.text();

    // 2) Poll best solution until solver completes or timeout
    const begin = Date.now();
    let lastSolution: any = null;
    while (Date.now() - begin < TIMEOUT_MS) {
      const solRes = await fetch(`${BACKEND}/schedules/${jobId}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!solRes.ok) {
        return NextResponse.json(
          { error: await solRes.text() },
          { status: solRes.status }
        );
      }

      const solution = await solRes.json();
      lastSolution = solution;

      if (solution.solverStatus === 'NOT_SOLVING') {
        return NextResponse.json({ jobId, solution });
      }

      await sleep(POLL_MS);
    }

    // return best-so-far if time runs out
    return NextResponse.json({ jobId, solution: lastSolution, timedOut: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(message, { status: 500 });
  }
}
