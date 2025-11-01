export interface ShiftAssignment {
  id: string;
  employeeName: string;
  requiredSkill: string;
  start: Date;
  end: Date;
  location: string;
  employee: {
    name: string;
    skills: string[];
    unavailableDates: string[];
    undesiredDates: string[];
    desiredDates: string[];
  };
}

export interface ParsedScore {
  hard: number;
  soft: number;
}

export interface ParsedSolution {
  assignments: ShiftAssignment[];
  solverStatus: string;
  score: ParsedScore | null;
  isFeasible: boolean;
  error?: string;
}

interface TimefoldShift {
  id: string;
  start: string;
  end: string;
  location: string;
  requiredSkill: string;
  employee: {
    name: string;
    skills: string[];
    unavailableDates: string[];
    undesiredDates: string[];
    desiredDates: string[];
  };
}

interface TimefoldSolution {
  employees: unknown[];
  shifts: TimefoldShift[];
  score: string | null;
  solverStatus: string;
}

interface TimefoldResponse {
  jobId: string;
  solution: TimefoldSolution;
}

/**
 * Parses the score string from Timefold API
 * Format: "0hard/718.84530soft" or "0hard/-1.15470soft"
 */
export function parseScore(scoreString: string | null): ParsedScore | null {
  if (!scoreString) return null;

  // Updated regex to handle negative soft scores: (\d+)hard/(-?[\d.]+)soft
  // -? allows optional negative sign before the soft score
  const regex = /(\d+)hard\/(-?[\d.]+)soft/;
  const match = scoreString.match(regex);

  if (!match) {
    return null;
  }

  return {
    hard: parseInt(match[1], 10),
    soft: parseFloat(match[2]),
  };
}

/**
 * Checks if a solution is feasible based on hard score and shift assignments
 * A solution is feasible when:
 * 1. Hard score === 0 (no hard constraint violations)
 * 2. All shifts have employees assigned (no null employees)
 */
export function isSolutionFeasible(
  score: ParsedScore | null,
  shifts?: TimefoldShift[]
): boolean {
  if (!score) return false;

  // Hard score must be 0 for feasibility
  if (score.hard !== 0) return false;

  // If shifts are provided, check that all are assigned
  if (shifts && Array.isArray(shifts)) {
    const allAssigned = shifts.every(
      (shift) => shift.employee !== null && shift.employee !== undefined
    );
    return allAssigned;
  }

  // If no shifts provided, just check hard score
  return true;
}

/**
 * Parses a Timefold solution response into a structured format
 */
export function parseSolution(response: TimefoldResponse): ParsedSolution {
  try {
    // Validate response structure
    if (!response || !response.solution) {
      return {
        assignments: [],
        solverStatus: 'UNKNOWN',
        score: null,
        isFeasible: false,
        error: 'Invalid response structure: missing solution',
      };
    }

    const { solution } = response;

    // Validate solution structure
    if (!Array.isArray(solution.shifts)) {
      return {
        assignments: [],
        solverStatus: solution.solverStatus || 'UNKNOWN',
        score: null,
        isFeasible: false,
        error: 'Invalid solution structure: shifts must be an array',
      };
    }

    if (!solution.solverStatus) {
      return {
        assignments: [],
        solverStatus: 'UNKNOWN',
        score: null,
        isFeasible: false,
        error: 'Invalid solution structure: missing solverStatus',
      };
    }

    // Parse score
    const parsedScore = parseScore(solution.score);
    const feasible = isSolutionFeasible(parsedScore, solution.shifts);

    // Transform shifts to assignments
    const assignments: ShiftAssignment[] = solution.shifts.map((shift) => {
      // Validate shift structure
      if (!shift.id || !shift.start || !shift.end || !shift.employee) {
        throw new Error(
          `Invalid shift structure: missing required fields (id, start, end, or employee)`
        );
      }

      // Parse ISO datetime strings
      const startDate = new Date(shift.start);
      const endDate = new Date(shift.end);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(
          `Invalid date format for shift ${shift.id}: ${shift.start} or ${shift.end}`
        );
      }

      return {
        id: shift.id,
        employeeName: shift.employee.name,
        requiredSkill: shift.requiredSkill || '',
        start: startDate,
        end: endDate,
        location: shift.location || 'Default',
        employee: shift.employee,
      };
    });

    return {
      assignments,
      solverStatus: solution.solverStatus,
      score: parsedScore,
      isFeasible: feasible,
    };
  } catch (error) {
    return {
      assignments: [],
      solverStatus: 'UNKNOWN',
      score: null,
      isFeasible: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error parsing solution',
    };
  }
}
