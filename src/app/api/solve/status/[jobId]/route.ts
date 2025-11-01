import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseSolution, parseConstraintAnalysis } from '@/lib/solution-parser';

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

    const parsed = parseSolution({
      jobId,
      solution,
    });

    let constraintViolations = undefined;
    if (solution.solverStatus === 'NOT_SOLVING') {
      try {
        const analyzeRes = await fetch(`${BACKEND}/schedules/analyze`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(solution),
          cache: 'no-store',
        });

        if (analyzeRes.ok) {
          const analysis = await analyzeRes.json();
          constraintViolations = parseConstraintAnalysis(analysis);
        }
      } catch (analyzeError) {
        console.warn('Failed to analyze solution:', analyzeError);
      }
    }

    return NextResponse.json({
      jobId,
      solution,
      solverStatus: parsed.solverStatus,
      isFeasible: parsed.isFeasible,
      score: parsed.score,
      constraintViolations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
