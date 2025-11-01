import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseScore, isSolutionFeasible } from '@/lib/solution-parser';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    if (!BACKEND) {
      return NextResponse.json(
        { error: 'Solver backend URL is not configured' },
        { status: 500 }
      );
    }

    // Fetch current solution from Timefold backend
    const solRes = await fetch(`${BACKEND}/schedules/${jobId}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!solRes.ok) {
      const errorText = await solRes.text();
      return NextResponse.json({ error: errorText }, { status: solRes.status });
    }

    const solution = await solRes.json();

    // Validate solution structure
    if (!solution || typeof solution.solverStatus === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid solution structure' },
        { status: 500 }
      );
    }

    // Parse score and determine feasibility
    const parsedScore = parseScore(solution.score || null);
    // Check feasibility: hard score === 0 AND all shifts assigned
    const isFeasible = isSolutionFeasible(parsedScore, solution.shifts);

    return NextResponse.json({
      jobId,
      solution,
      solverStatus: solution.solverStatus,
      isFeasible,
      score: parsedScore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
