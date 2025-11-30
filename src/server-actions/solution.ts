'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { formatTime } from '@/lib/time-utils';

/**
 * Check if user is a manager and has access to solutions
 */
async function checkManagerAccess() {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: +session.user.id },
    select: {
      role: true,
      company_id: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'MANAGER') {
    throw new Error('Manager access required');
  }

  if (!user.company_id) {
    throw new Error('User not associated with a company');
  }

  return {
    userId: +session.user.id,
    companyId: user.company_id,
    role: user.role,
  };
}

interface GetSolutionsParams {
  page?: string;
  limit?: string;
  feasibleOnly?: boolean;
  sortBy?: 'created_at' | 'hard_score' | 'soft_score';
  sortDirection?: 'asc' | 'desc';
}

interface GetSolutionsResult {
  solutions: Array<{
    id: number;
    startDate: Date;
    endDate: Date;
    hardScore: number;
    softScore: number;
    isFeasible: boolean;
    version: number;
    createdAt: Date;
    createdBy: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    assignmentCount: number;
    parentSolutionId: number | null;
  }>;
  totalCount: number;
  totalPages: number;
}

/**
 * Get paginated list of solutions for the company
 */
export async function getSolutionsAction(
  params: GetSolutionsParams = {}
): Promise<GetSolutionsResult> {
  try {
    const { companyId } = await checkManagerAccess();

    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '20', 10);
    const offset = (page - 1) * limit;

    const sortBy = params.sortBy || 'created_at';
    const sortDirection = params.sortDirection || 'desc';

    // Build where clause
    const where: any = {
      company_id: companyId,
    };

    if (params.feasibleOnly) {
      where.is_feasible = true;
    }

    // Get total count
    const totalCount = await prisma.solution.count({ where });

    // Get solutions
    const solutions = await prisma.solution.findMany({
      where,
      select: {
        id: true,
        start_date: true,
        end_date: true,
        hard_score: true,
        soft_score: true,
        is_feasible: true,
        version: true,
        created_at: true,
        parent_solution_id: true,
        created_by: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        shift_assignments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortDirection,
      },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      solutions: solutions.map((s) => ({
        id: s.id,
        startDate: s.start_date,
        endDate: s.end_date,
        hardScore: s.hard_score,
        softScore: s.soft_score,
        isFeasible: s.is_feasible,
        version: s.version,
        createdAt: s.created_at,
        createdBy: {
          firstName: s.created_by.first_name,
          lastName: s.created_by.last_name,
          email: s.created_by.email,
        },
        assignmentCount: s.shift_assignments.length,
        parentSolutionId: s.parent_solution_id,
      })),
      totalCount,
      totalPages,
    };
  } catch (error) {
    logger.error('Error fetching solutions', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getSolutionsAction',
    });
    throw error;
  }
}

interface GetSolutionByIdResult {
  solution: {
    id: number;
    timefoldJobId: string;
    startDate: Date;
    endDate: Date;
    hardScore: number;
    softScore: number;
    isFeasible: boolean;
    solverStatus: string;
    version: number;
    metadata: any;
    createdAt: Date;
    createdBy: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    parentSolutionId: number | null;
  };
  assignments: Array<{
    id: number;
    employeeName: string;
    shiftDate: Date;
    shiftStartTime: string;
    shiftEndTime: string;
    requiredSkill: string;
    location: string;
    isModified: boolean;
    userHasShiftId: number;
    timefoldShiftId: string;
  }>;
  childSolutions: Array<{
    id: number;
    version: number;
    createdAt: Date;
  }>;
}

/**
 * Get full details of a specific solution
 */
export async function getSolutionByIdAction(
  solutionId: number
): Promise<GetSolutionByIdResult | null> {
  try {
    const { companyId } = await checkManagerAccess();

    const solution = await prisma.solution.findFirst({
      where: {
        id: solutionId,
        company_id: companyId,
      },
      select: {
        id: true,
        timefold_job_id: true,
        start_date: true,
        end_date: true,
        hard_score: true,
        soft_score: true,
        is_feasible: true,
        solver_status: true,
        version: true,
        metadata: true,
        created_at: true,
        parent_solution_id: true,
        created_by: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        shift_assignments: {
          select: {
            id: true,
            timefold_required_skill: true,
            location: true,
            is_modified: true,
            user_has_shift_id: true,
            timefold_shift_id: true,
            user_has_shift: {
              select: {
                date: true,
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                  },
                },
                shift_type: {
                  select: {
                    start_time: true,
                    end_time: true,
                  },
                },
              },
            },
          },
        },
        child_solutions: {
          select: {
            id: true,
            version: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!solution) {
      return null;
    }

    return {
      solution: {
        id: solution.id,
        timefoldJobId: solution.timefold_job_id,
        startDate: solution.start_date,
        endDate: solution.end_date,
        hardScore: solution.hard_score,
        softScore: solution.soft_score,
        isFeasible: solution.is_feasible,
        solverStatus: solution.solver_status,
        version: solution.version,
        metadata: solution.metadata,
        createdAt: solution.created_at,
        createdBy: {
          firstName: solution.created_by.first_name,
          lastName: solution.created_by.last_name,
          email: solution.created_by.email,
        },
        parentSolutionId: solution.parent_solution_id,
      },
      assignments: solution.shift_assignments.map((a) => ({
        id: a.id,
        employeeName:
          [a.user_has_shift.user.first_name, a.user_has_shift.user.last_name]
            .filter(Boolean)
            .join(' ') || a.user_has_shift.user.email,
        employeeId: a.user_has_shift.user.id,
        shiftDate: a.user_has_shift.date,
        shiftStartTime: formatTime(a.user_has_shift.shift_type.start_time),
        shiftEndTime: formatTime(a.user_has_shift.shift_type.end_time),
        requiredSkill: a.timefold_required_skill,
        location: a.location,
        isModified: a.is_modified,
        userHasShiftId: a.user_has_shift_id,
        timefoldShiftId: a.timefold_shift_id,
      })),
      childSolutions: solution.child_solutions.map((c) => ({
        id: c.id,
        version: c.version,
        createdAt: c.created_at,
      })),
    };
  } catch (error) {
    logger.error('Error fetching solution by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getSolutionByIdAction',
      solutionId,
    });
    throw error;
  }
}

interface ValidationResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if a solution can be re-optimized
 * BLOCKING: Manual shifts exist in date range
 * WARNING: Employees/shift types/skills deleted or changed
 */
export async function checkSolutionValidityAction(
  solutionId: number
): Promise<ValidationResult> {
  try {
    const { companyId } = await checkManagerAccess();

    // Get solution details
    const solution = await prisma.solution.findFirst({
      where: {
        id: solutionId,
        company_id: companyId,
      },
      select: {
        start_date: true,
        end_date: true,
        shift_assignments: {
          select: {
            timefold_required_skill: true,
            user_has_shift: {
              select: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!solution) {
      return {
        canProceed: false,
        errors: ['Solution not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // BLOCKING CHECK: Check for manual shifts in date range
    const manualShifts = await prisma.userHasShift.findMany({
      where: {
        user: {
          company_id: companyId,
        },
        date: {
          gte: solution.start_date,
          lte: solution.end_date,
        },
        // Exclude shifts that are part of this solution
        solution_assignments: {
          none: {
            solution_id: solutionId,
          },
        },
      },
      select: {
        id: true,
        date: true,
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        shift_type: {
          select: {
            name: true,
          },
        },
      },
    });

    if (manualShifts.length > 0) {
      errors.push(
        `Found ${manualShifts.length} manual shift(s) in date range. Please delete them first or choose a different date range.`
      );
      // Add details about first few conflicts
      manualShifts.slice(0, 5).forEach((shift) => {
        const userName = shift.user.first_name && shift.user.last_name
          ? `${shift.user.first_name} ${shift.user.last_name}`
          : shift.user.email;
        errors.push(
          `- ${userName} on ${new Date(shift.date).toLocaleDateString()} (${shift.shift_type.name})`
        );
      });
      if (manualShifts.length > 5) {
        errors.push(`... and ${manualShifts.length - 5} more`);
      }
    }

    // WARNING: Check for deleted/inactive employees
    const uniqueEmployeeIds = [
      ...new Set(solution.shift_assignments.map((a) => a.user_has_shift.user.id)),
    ];

    const activeEmployees = await prisma.user.findMany({
      where: {
        id: { in: uniqueEmployeeIds },
        company_id: companyId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    const activeEmployeeIds = new Set(activeEmployees.map((e) => e.id));
    const inactiveCount = uniqueEmployeeIds.filter(
      (id) => !activeEmployeeIds.has(id)
    ).length;

    if (inactiveCount > 0) {
      warnings.push(
        `${inactiveCount} employee(s) from original solution are no longer active. They will be excluded from re-optimization.`
      );
    }

    // WARNING: Check for deleted skills
    const uniqueSkills = [
      ...new Set(solution.shift_assignments.map((a) => a.timefold_required_skill)),
    ];

    const existingSkills = await prisma.skill.findMany({
      where: {
        name: { in: uniqueSkills },
        company_id: companyId,
      },
      select: {
        name: true,
      },
    });

    const existingSkillNames = new Set(existingSkills.map((s) => s.name));
    const deletedSkills = uniqueSkills.filter(
      (skill) => !existingSkillNames.has(skill)
    );

    if (deletedSkills.length > 0) {
      warnings.push(
        `${deletedSkills.length} skill(s) no longer exist: ${deletedSkills.join(', ')}`
      );
    }

    // WARNING: Check if shift types still exist (basic check)
    const shiftTypes = await prisma.shiftType.findMany({
      where: {
        company_id: companyId,
      },
    });

    if (shiftTypes.length === 0) {
      warnings.push('No shift types found for this company.');
    }

    return {
      canProceed: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    logger.error('Error checking solution validity', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'checkSolutionValidityAction',
      solutionId,
    });
    throw error;
  }
}

interface WarmStartPayload {
  employees: Array<{
    name: string;
    skills: string[];
    unavailableDates: string[];
    desiredDates: string[];
    undesiredDates: string[];
  }>;
  shifts: Array<{
    id: string;
    start: string;
    end: string;
    location: string;
    requiredSkill: string;
    employee: {
      name: string;
      skills: string[];
      unavailableDates: string[];
      desiredDates: string[];
      undesiredDates: string[];
    } | null;
  }>;
  metadata: {
    parentSolutionId: number;
    startDate: string;
    endDate: string;
  };
}

/**
 * Build warm-start payload from existing solution with current employee data
 */
export async function buildWarmStartPayloadAction(
  solutionId: number
): Promise<WarmStartPayload> {
  try {
    const { companyId } = await checkManagerAccess();

    // Get solution with assignments
    const solution = await prisma.solution.findFirst({
      where: {
        id: solutionId,
        company_id: companyId,
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        shift_assignments: {
          select: {
            timefold_shift_id: true,
            timefold_required_skill: true,
            location: true,
            user_has_shift: {
              select: {
                date: true,
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                  },
                },
                shift_type: {
                  select: {
                    start_time: true,
                    end_time: true,
                  },
                },
              },
            },
          },
          orderBy: {
            user_has_shift: {
              date: 'asc',
            },
          },
        },
      },
    });

    if (!solution) {
      throw new Error('Solution not found');
    }

    // Helper functions
    const toYMD = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const eachDate = (start: string, end: string) => {
      const out: string[] = [];
      const s = new Date(start);
      const e = new Date(end);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        out.push(toYMD(d));
      }
      return out;
    };

    // Get current employee data (both employees and managers)
    const allUsers = await prisma.user.findMany({
      where: {
        company_id: companyId,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        skills: {
          select: {
            skill: { select: { name: true } },
          },
        },
        date_preferences: {
          select: {
            date: true,
            preference_type: true,
          },
        },
        unavailable_dates: {
          select: {
            start_date: true,
            end_date: true,
          },
        },
      },
    });

    // Build employee map
    const employeeMap = new Map<number, any>();
    allUsers.forEach((u) => {
      const fullName =
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;

      const skills = u.skills.map((s) => s.skill.name);

      const desiredDates = u.date_preferences
        .filter((p) => p.preference_type === 'DESIRED')
        .map((p) => toYMD(new Date(p.date)));

      const undesiredDates = u.date_preferences
        .filter((p) => p.preference_type === 'UNDESIRED')
        .map((p) => toYMD(new Date(p.date)));

      const unavailableDates = u.unavailable_dates.flatMap((r) =>
        eachDate(toYMD(new Date(r.start_date)), toYMD(new Date(r.end_date)))
      );

      employeeMap.set(u.id, {
        id: u.id,
        name: fullName,
        skills,
        unavailableDates,
        undesiredDates,
        desiredDates,
      });
    });

    // Build employees array (current employee data)
    const employees = Array.from(employeeMap.values()).map((emp) => ({
      name: emp.name,
      skills: emp.skills,
      unavailableDates: emp.unavailableDates,
      desiredDates: emp.desiredDates,
      undesiredDates: emp.undesiredDates,
    }));

    // Build shifts with pre-filled employee assignments
    const shifts = solution.shift_assignments.map((assignment) => {
      const shiftDate = toYMD(new Date(assignment.user_has_shift.date));
      const startTime = formatTime(assignment.user_has_shift.shift_type.start_time);
      const endTime = formatTime(assignment.user_has_shift.shift_type.end_time);
      const startDateTime = `${shiftDate}T${startTime}`;
      const endDateTime = `${shiftDate}T${endTime}`;

      // Get current employee data (or null if employee no longer exists)
      const currentEmployee = employeeMap.get(assignment.user_has_shift.user.id);

      return {
        id: assignment.timefold_shift_id,
        start: startDateTime,
        end: endDateTime,
        location: assignment.location,
        requiredSkill: assignment.timefold_required_skill,
        employee: currentEmployee
          ? {
              name: currentEmployee.name,
              skills: currentEmployee.skills,
              unavailableDates: currentEmployee.unavailableDates,
              desiredDates: currentEmployee.desiredDates,
              undesiredDates: currentEmployee.undesiredDates,
            }
          : null, // Employee no longer exists
      };
    });

    return {
      employees,
      shifts,
      metadata: {
        parentSolutionId: solution.id,
        startDate: toYMD(new Date(solution.start_date)),
        endDate: toYMD(new Date(solution.end_date)),
      },
    };
  } catch (error) {
    logger.error('Error building warm-start payload', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'buildWarmStartPayloadAction',
      solutionId,
    });
    throw error;
  }
}

interface DeleteSolutionResult {
  success: boolean;
  error?: string;
}

/**
 * Delete a solution and all its shifts (CASCADE)
 */
export async function deleteSolutionAction(
  solutionId: number
): Promise<DeleteSolutionResult> {
  try {
    const { companyId, userId } = await checkManagerAccess();

    // Verify solution belongs to this company
    const solution = await prisma.solution.findFirst({
      where: {
        id: solutionId,
        company_id: companyId,
      },
      select: {
        id: true,
        shift_assignments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!solution) {
      return {
        success: false,
        error: 'Solution not found or access denied',
      };
    }

    // Check if solution has any shift assignments
    if (solution.shift_assignments.length > 0) {
      return {
        success: false,
        error: `Cannot delete solution with ${solution.shift_assignments.length} active shift assignments. Delete all shifts first.`,
      };
    }

    // Delete solution (only if no assignments exist)
    await prisma.solution.delete({
      where: { id: solutionId },
    });

    logger.info('Solution deleted', {
      userId,
      solutionId,
      assignmentCount: solution.shift_assignments.length,
    });

    revalidatePath('/shift');
    revalidatePath('/shift/solutions');

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Error deleting solution', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteSolutionAction',
      solutionId,
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete solution',
    };
  }
}
