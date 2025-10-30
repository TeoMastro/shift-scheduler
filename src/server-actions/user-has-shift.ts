'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetUserHasShiftsParams,
  GetUserHasShiftsResult,
  GetUserHasShiftsResultWithoutPagination,
  UserHasShift,
  UserHasShiftFormState,
} from '@/types/user-has-shift';
import {
  createUserHasShiftSchema,
  formatZodErrors,
  updateUserHasShiftSchema,
} from '@/lib/validation-schemas';
import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { ShiftStatus } from '@prisma/client';
import { formatTime } from '@/lib/time-utils';

async function checkShiftAccess(sessionUserId: number, sessionRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: {
      role: true,
      company_id: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Only managers can access shifts
  if (user.role !== 'MANAGER') {
    throw new Error('Unauthorized');
  }

  return {
    userCompanyId: user.company_id,
  };
}

export async function getCurrentUserForShift() {
  try {
    const session = await auth();

    if (!session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: {
        role: true,
        company_id: true,
      },
    });

    return user;
  } catch (error) {
    logger.error('Error fetching current user', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getCurrentUserForShift',
    });
    throw error;
  }
}

export async function getUsersForShiftForm() {
  try {
    const session = await auth();

    if (!session) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: {
        role: true,
        company_id: true,
      },
    });

    if (!user) {
      return [];
    }

    // For manager, get only users from their company
    if (user.company_id) {
      const companyUsers = await prisma.user.findMany({
        where: {
          company_id: user.company_id,
          role: { in: ['EMPLOYEE', 'MANAGER'] },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          company_id: true,
        },
        orderBy: { first_name: 'asc' },
      });

      return companyUsers;
    }

    return [];
  } catch (error) {
    logger.error('Error fetching users for shift form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUsersForShiftForm',
    });
    throw error;
  }
}

export async function getShiftTypesForShiftForm() {
  try {
    const session = await auth();

    if (!session) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: {
        role: true,
        company_id: true,
      },
    });

    if (!user) {
      return [];
    }

    // For manager, get only shift types from their company
    if (user.company_id) {
      const companyShiftTypes = await prisma.shiftType.findMany({
        where: {
          company_id: user.company_id,
        },
        select: {
          id: true,
          name: true,
          start_time: true,
          end_time: true,
          company_id: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return companyShiftTypes;
    }

    return [];
  } catch (error) {
    logger.error('Error fetching shift types for shift form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getShiftTypesForShiftForm',
    });
    throw error;
  }
}

export async function createShiftAction(
  prevState: UserHasShiftFormState,
  formData: FormData
): Promise<UserHasShiftFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkShiftAccess(
      +session.user.id,
      session.user.role
    );

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      shift_type_id: formData.get('shift_type_id')?.toString() ?? '',
      date: formData.get('date')?.toString() ?? '',
      status: formData.get('status')?.toString() ?? 'SCHEDULED',
    };

    const parsed = createUserHasShiftSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    // Check if user exists and belongs to the correct company
    const user = await prisma.user.findUnique({
      where: { id: parseInt(parsed.data.user_id) },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (!user) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userNotFound',
      };
    }

    // Check if shift type exists and belongs to the correct company
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: parseInt(parsed.data.shift_type_id) },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (!shiftType) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'shiftTypeNotFound',
      };
    }

    // Ensure manager can only assign shifts to users of their company
    if (user.company_id !== userCompanyId) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'cannotAssignToDifferentCompany',
      };
    }

    // Ensure manager can only use shift types from their company
    if (shiftType.company_id !== userCompanyId) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'cannotUseShiftTypeFromDifferentCompany',
      };
    }

    // Check for duplicate shift
    const dateObj = new Date(parsed.data.date);
    const existingShift = await prisma.userHasShift.findUnique({
      where: {
        user_id_shift_type_id_date: {
          user_id: parseInt(parsed.data.user_id),
          shift_type_id: parseInt(parsed.data.shift_type_id),
          date: dateObj,
        },
      },
    });

    if (existingShift) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'shiftAlreadyExists',
      };
    }

    // Check if user is unavailable on this date
    const unavailableDate = await prisma.unavailableDate.findFirst({
      where: {
        user_id: parseInt(parsed.data.user_id),
        start_date: { lte: dateObj },
        end_date: { gte: dateObj },
      },
    });

    if (unavailableDate) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userUnavailableOnDate',
      };
    }

    const newShift = await prisma.userHasShift.create({
      data: {
        user_id: parseInt(parsed.data.user_id),
        shift_type_id: parseInt(parsed.data.shift_type_id),
        date: dateObj,
        status: parsed.data.status as ShiftStatus,
      },
    });

    logger.info('Shift created successfully', {
      userId: session.user.id,
      createdShiftId: newShift.id,
    });

    revalidatePath('/shift');
  } catch (error) {
    logger.error('Unexpected error during shift creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createShift',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        shift_type_id: formData.get('shift_type_id')?.toString() ?? '',
        date: formData.get('date')?.toString() ?? '',
        status: formData.get('status')?.toString() ?? 'SCHEDULED',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift?message=shiftCreatedSuccess');
}

export async function updateShiftAction(
  shiftId: number,
  prevState: UserHasShiftFormState,
  formData: FormData
): Promise<UserHasShiftFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkShiftAccess(
      +session.user.id,
      session.user.role
    );

    // Check if shift exists and user has access
    const existingShift = await prisma.userHasShift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            company_id: true,
          },
        },
        shift_type: {
          select: {
            company_id: true,
          },
        },
      },
    });

    if (!existingShift) {
      return {
        success: false,
        errors: {},
        formData: {
          user_id: formData.get('user_id')?.toString() ?? '',
          shift_type_id: formData.get('shift_type_id')?.toString() ?? '',
          date: formData.get('date')?.toString() ?? '',
          status: formData.get('status')?.toString() ?? 'SCHEDULED',
        },
        globalError: 'shiftNotFound',
      };
    }

    // Manager can only edit shifts from their company
    if (existingShift.user.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      shift_type_id: formData.get('shift_type_id')?.toString() ?? '',
      date: formData.get('date')?.toString() ?? '',
      status: formData.get('status')?.toString() ?? 'SCHEDULED',
    };

    const parsed = updateUserHasShiftSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    // Check if user exists and belongs to the correct company
    const user = await prisma.user.findUnique({
      where: { id: parseInt(parsed.data.user_id) },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (!user) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userNotFound',
      };
    }

    // Check if shift type exists
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: parseInt(parsed.data.shift_type_id) },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (!shiftType) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'shiftTypeNotFound',
      };
    }

    // Ensure manager can only assign shifts to users of their company
    if (user.company_id !== userCompanyId) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'cannotAssignToDifferentCompany',
      };
    }

    if (shiftType.company_id !== userCompanyId) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'cannotUseShiftTypeFromDifferentCompany',
      };
    }

    // Check for duplicate shift (excluding current one)
    const dateObj = new Date(parsed.data.date);
    const duplicateShift = await prisma.userHasShift.findFirst({
      where: {
        user_id: parseInt(parsed.data.user_id),
        shift_type_id: parseInt(parsed.data.shift_type_id),
        date: dateObj,
        id: { not: shiftId },
      },
    });

    if (duplicateShift) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'shiftAlreadyExists',
      };
    }

    // Check if user is unavailable on this date
    const unavailableDate = await prisma.unavailableDate.findFirst({
      where: {
        user_id: parseInt(parsed.data.user_id),
        start_date: { lte: dateObj },
        end_date: { gte: dateObj },
      },
    });

    if (unavailableDate) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userUnavailableOnDate',
      };
    }

    await prisma.userHasShift.update({
      where: { id: shiftId },
      data: {
        user_id: parseInt(parsed.data.user_id),
        shift_type_id: parseInt(parsed.data.shift_type_id),
        date: dateObj,
        status: parsed.data.status as ShiftStatus,
      },
    });

    logger.info('Shift updated successfully', {
      userId: session.user.id,
      updatedShiftId: shiftId,
    });

    revalidatePath('/shift');
  } catch (error) {
    logger.error('Unexpected error during shift update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateShift',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        shift_type_id: formData.get('shift_type_id')?.toString() ?? '',
        date: formData.get('date')?.toString() ?? '',
        status: formData.get('status')?.toString() ?? 'SCHEDULED',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift?message=shiftUpdatedSuccess');
}

export async function deleteShiftAction(shiftId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkShiftAccess(
      +session.user.id,
      session.user.role
    );

    const existingShift = await prisma.userHasShift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            company_id: true,
          },
        },
      },
    });

    if (!existingShift) {
      throw new Error('Shift not found');
    }

    // Manager can only delete shifts from their company
    if (existingShift.user.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    await prisma.userHasShift.delete({
      where: { id: shiftId },
    });

    logger.info('Shift deleted successfully', {
      userId: session.user.id,
      deletedShiftId: shiftId,
    });

    revalidatePath('/shift');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during shift deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteShift',
    });

    throw error;
  }
}

export async function getShiftById(shiftId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkShiftAccess(
      +session.user.id,
      session.user.role
    );

    if (isNaN(shiftId)) {
      return false;
    }

    const shift = await prisma.userHasShift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            company_id: true,
          },
        },
        shift_type: {
          select: {
            id: true,
            name: true,
            start_time: true,
            end_time: true,
            company_id: true,
          },
        },
      },
    });

    if (!shift) {
      return false;
    }

    // Manager can only view shifts from their company
    if (shift.user.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    return shift;
  } catch (error) {
    logger.error('Error fetching shift by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getShiftById',
    });
    throw error;
  }
}

async function fetchShifts(
  params: GetUserHasShiftsParams & { paginate?: boolean }
) {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const { userCompanyId } = await checkShiftAccess(
    +session.user.id,
    session.user.role
  );

  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const search = params.search || '';
  const userFilter = params.userFilter || 'all';
  const shiftTypeFilter = params.shiftTypeFilter || 'all';
  const statusFilter = params.statusFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: {
    OR?: Array<{
      user?: {
        OR?: Array<{
          first_name?: { contains: string; mode: 'insensitive' };
          last_name?: { contains: string; mode: 'insensitive' };
          email?: { contains: string; mode: 'insensitive' };
        }>;
      };
      shift_type?: {
        name?: { contains: string; mode: 'insensitive' };
      };
    }>;
    user_id?: number;
    shift_type_id?: number;
    status?: ShiftStatus;
  } = {};

  if (search) {
    whereClause.OR = [
      {
        user: {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } as any,
      },
      {
        shift_type: {
          name: { contains: search, mode: 'insensitive' },
        },
      },
    ];
  }

  if (userFilter !== 'all') {
    whereClause.user_id = parseInt(userFilter);
  }

  if (shiftTypeFilter !== 'all') {
    whereClause.shift_type_id = parseInt(shiftTypeFilter);
  }

  if (statusFilter !== 'all') {
    whereClause.status = statusFilter as ShiftStatus;
  }

  // Only managers can access this function - always filter by company
  if (userCompanyId === null) {
    throw new Error('Manager must belong to a company to access shifts');
  }

  // Add company filter to user
  const { user_id, ...restWhereClause } = whereClause;
  const finalWhereClause = {
    ...restWhereClause,
    user: {
      company_id: userCompanyId,
      ...(user_id && { id: user_id }),
    },
  };

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  if (sortField === 'user_name') {
    orderBy.user = { first_name: sortDirection } as any;
  } else if (sortField === 'shift_type_name') {
    orderBy.shift_type = { name: sortDirection } as any;
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [shifts, totalCount] = await Promise.all([
      prisma.userHasShift.findMany({
        where: finalWhereClause,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              company_id: true,
            },
          },
          shift_type: {
            select: {
              id: true,
              name: true,
              start_time: true,
              end_time: true,
              company_id: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.userHasShift.count({ where: finalWhereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { shifts, totalCount, totalPages, currentPage: page, limit };
  } else {
    const shifts = await prisma.userHasShift.findMany({
      where: finalWhereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            company_id: true,
          },
        },
        shift_type: {
          select: {
            id: true,
            name: true,
            start_time: true,
            end_time: true,
            company_id: true,
          },
        },
      },
      orderBy,
    });

    return { shifts };
  }
}

export async function getShiftsWithPagination(
  params: GetUserHasShiftsParams
): Promise<GetUserHasShiftsResult> {
  return fetchShifts({
    ...params,
    paginate: true,
  }) as Promise<GetUserHasShiftsResult>;
}

export async function getAllShiftsForExport(
  params: Omit<GetUserHasShiftsParams, 'page' | 'limit'>
): Promise<UserHasShift[]> {
  const result = await fetchShifts({ ...params, paginate: false });
  return (result as GetUserHasShiftsResultWithoutPagination).shifts;
}

export async function getUserShiftsForCalendar() {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: {
        id: true,
        role: true,
        company_id: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build where clause based on user role
    let whereClause: any = {};

    switch (user.role) {
      case 'EMPLOYEE':
        // Employees can only see their own shifts
        whereClause.user_id = user.id;
        break;

      case 'MANAGER':
        // Managers can see all shifts from their company
        if (!user.company_id) {
          return [];
        }
        whereClause.user = {
          company_id: user.company_id,
        };
        break;

      case 'ADMIN':
        // Admins can see all shifts - no filter needed
        break;

      default:
        return [];
    }

    const shifts = await prisma.userHasShift.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            company_id: true,
          },
        },
        shift_type: {
          select: {
            id: true,
            name: true,
            start_time: true,
            end_time: true,
            company_id: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return shifts;
  } catch (error) {
    logger.error('Error fetching user shifts for calendar', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUserShiftsForCalendar',
    });
    throw error;
  }
}

export async function submitAutoAssignAction(data: {
  start_date: string;
  end_date: string;
  company_id: number;
}) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Helpers
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

    const joinDateTime = (ymd: string, time: string) => `${ymd}T${time}`;

    // Managers for the company
    const managers = await prisma.user.findMany({
      where: {
        company_id: data.company_id,
        role: 'MANAGER',
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

    // Employees with skills, date preferences, unavailable ranges
    const employees = await prisma.user.findMany({
      where: {
        company_id: data.company_id,
        role: 'EMPLOYEE',
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

    const shiftTypesData = await prisma.shiftType.findMany({
      where: { company_id: data.company_id },
      select: {
        id: true,
        name: true,
        start_time: true,
        end_time: true,
        skills: {
          select: { skill: { select: { name: true } } },
        },
      },
    });

    const shiftTypes = shiftTypesData.map((st) => ({
      id: st.id,
      name: st.name,
      start_time: formatTime(st.start_time),
      end_time: formatTime(st.end_time),
      skills: st.skills.map((s) => s.skill.name),
    }));

    // Employees output with requested structure
    const employeesOut = employees.map((u) => {
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

      return {
        name: fullName,
        skills,
        unavailableDates,
        undesiredDates,
        desiredDates,
      };
    });

    // Build shifts for each date in range for every shift type
    const allDays = eachDate(data.start_date, data.end_date);
    let idCounter = 0;
    const mapRequiredSkill = (st: { name: string; start_time: string }) => {
      const nameLower = st.name.toLowerCase();
      if (nameLower.includes('morning')) return 'Plumber';
      if (nameLower.includes('afternoon')) return 'Electrician';
      // Fallback by start time: before 12:00 -> Morning, else Afternoon
      const hour = parseInt(st.start_time.split(':')[0] || '0', 10);
      return hour < 12 ? 'Plumber' : 'Electrician';
    };

    const shifts = allDays.flatMap((ymd) =>
      shiftTypes.map((st) => ({
        id: String(idCounter++),
        start: joinDateTime(ymd, st.start_time),
        end: joinDateTime(ymd, st.end_time),
        location: 'Default',
        requiredSkill: mapRequiredSkill(st),
        employee: null,
      }))
    );

    const managersAsEmployees = managers.map((u) => {
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

      return {
        name: fullName,
        skills,
        unavailableDates,
        undesiredDates,
        desiredDates,
      };
    });

    const payload = {
      employees: [...employeesOut, ...managersAsEmployees],
      shifts,
    };

    logger.info('Auto-assign payload generated', {
      userId: session.user.id,
      payload,
    });

    return payload;
  } catch (error) {
    logger.error('Error generating auto-assign payload', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'submitAutoAssignAction',
    });
    throw error;
  }
}
