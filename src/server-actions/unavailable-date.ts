'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetUnavailableDatesParams,
  GetUnavailableDatesResult,
  GetUnavailableDatesResultWithoutPagination,
  UnavailableDateFormState,
} from '@/types/unavailable-date';
import {
  createUnavailableDateSchema,
  formatZodErrors,
  updateUnavailableDateSchema,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { auth } from '@/lib/auth';
import { LeaveType } from '@prisma/client';

async function checkUnavailableDateAccess(
  sessionUserId: number,
  sessionRole: string,
  targetUserId?: number
) {
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

  // Only MANAGER and EMPLOYEE can access unavailable dates
  if (user.role !== 'MANAGER' && user.role !== 'EMPLOYEE') {
    throw new Error('Unauthorized');
  }

  // If EMPLOYEE, they can only manage their own unavailable dates
  if (user.role === 'EMPLOYEE') {
    if (targetUserId && targetUserId !== sessionUserId) {
      throw new Error('Unauthorized');
    }
    return {
      userRole: 'EMPLOYEE' as const,
      userCompanyId: user.company_id,
      allowedUserId: sessionUserId,
    };
  }

  // If MANAGER, they can manage unavailable dates for users in their company
  return {
    userRole: 'MANAGER' as const,
    userCompanyId: user.company_id,
    allowedUserId: undefined, // Managers can select any user in their company
  };
}

export async function getUsersForUnavailableDateForm() {
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

    if (!user || user.role !== 'MANAGER' || !user.company_id) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        company_id: user.company_id,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
      orderBy: {
        first_name: 'asc',
      },
    });
    return users;
  } catch (error) {
    logger.error('Error fetching users for unavailable date form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUsersForUnavailableDateForm',
    });
    throw error;
  }
}

export async function createUnavailableDateAction(
  prevState: UnavailableDateFormState,
  formData: FormData
): Promise<UnavailableDateFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      start_date: formData.get('start_date')?.toString() ?? '',
      end_date: formData.get('end_date')?.toString() ?? '',
      leave_type: formData.get('leave_type')?.toString() as LeaveType,
      reason: formData.get('reason')?.toString() ?? '',
    };

    const parsed = createUnavailableDateSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const targetUserId = parseInt(parsed.data.user_id);
    const access = await checkUnavailableDateAccess(
      +session.user.id,
      session.user.role,
      targetUserId
    );

    // For employees, ensure they can only set unavailable dates for themselves
    if (
      access.userRole === 'EMPLOYEE' &&
      targetUserId !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the target user is in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    const startDate = new Date(parsed.data.start_date);
    const endDate = new Date(parsed.data.end_date);

    // Check for overlapping date ranges
    const overlappingDate = await prisma.unavailableDate.findFirst({
      where: {
        user_id: targetUserId,
        OR: [
          {
            // Existing range starts before new range ends and ends after new range starts
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
      },
    });

    if (overlappingDate) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'unavailableDateAlreadyExists',
      };
    }

    // Check if user has any shifts in this date range
    const existingShift = await prisma.userHasShift.findFirst({
      where: {
        user_id: targetUserId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (existingShift) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userHasShiftOnDateRange',
      };
    }

    const newUnavailableDate = await prisma.unavailableDate.create({
      data: {
        user_id: targetUserId,
        start_date: startDate,
        end_date: endDate,
        leave_type: parsed.data.leave_type,
        reason: parsed.data.reason || null,
      },
    });

    logger.info('Unavailable date created successfully', {
      userId: session.user.id,
      createdUnavailableDateId: newUnavailableDate.id,
      targetUserId: targetUserId,
    });

    revalidatePath('/unavailable-date');
  } catch (error) {
    logger.error('Unexpected error during unavailable date creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createUnavailableDate',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        start_date: formData.get('start_date')?.toString() ?? '',
        end_date: formData.get('end_date')?.toString() ?? '',
        leave_type:
          (formData.get('leave_type')?.toString() as LeaveType) ??
          LeaveType.SICK_LEAVE,
        reason: formData.get('reason')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/unavailable-date?message=unavailableDateCreatedSuccess');
}

export async function updateUnavailableDateAction(
  unavailableDateId: number,
  prevState: UnavailableDateFormState,
  formData: FormData
): Promise<UnavailableDateFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if unavailable date exists
    const existingUnavailableDate = await prisma.unavailableDate.findUnique({
      where: { id: unavailableDateId },
    });

    if (!existingUnavailableDate) {
      return {
        success: false,
        errors: {},
        formData: {
          user_id: formData.get('user_id')?.toString() ?? '',
          start_date: formData.get('start_date')?.toString() ?? '',
          end_date: formData.get('end_date')?.toString() ?? '',
          leave_type:
            (formData.get('leave_type')?.toString() as LeaveType) ??
            LeaveType.SICK_LEAVE,
          reason: formData.get('reason')?.toString() ?? '',
        },
        globalError: 'unavailableDateNotFound',
      };
    }

    const access = await checkUnavailableDateAccess(
      +session.user.id,
      session.user.role,
      existingUnavailableDate.user_id
    );

    // For employees, ensure they can only update their own unavailable dates
    if (
      access.userRole === 'EMPLOYEE' &&
      existingUnavailableDate.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the unavailable date belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: existingUnavailableDate.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      start_date: formData.get('start_date')?.toString() ?? '',
      end_date: formData.get('end_date')?.toString() ?? '',
      leave_type: formData.get('leave_type')?.toString() as LeaveType,
      reason: formData.get('reason')?.toString() ?? '',
    };

    const parsed = updateUnavailableDateSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const targetUserId = parseInt(parsed.data.user_id);

    // Ensure user_id matches the existing unavailable date (or is the same user for employees)
    if (access.userRole === 'EMPLOYEE') {
      if (targetUserId !== existingUnavailableDate.user_id) {
        throw new Error('Unauthorized');
      }
    } else {
      // Managers can change user_id, but only within their company
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    const startDate = new Date(parsed.data.start_date);
    const endDate = new Date(parsed.data.end_date);

    // Check for overlapping date ranges (excluding current one)
    const overlappingDate = await prisma.unavailableDate.findFirst({
      where: {
        user_id: targetUserId,
        id: { not: unavailableDateId },
        OR: [
          {
            // Existing range starts before new range ends and ends after new range starts
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
      },
    });

    if (overlappingDate) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'unavailableDateAlreadyExists',
      };
    }

    // Check if user has any shifts in this date range
    const existingShift = await prisma.userHasShift.findFirst({
      where: {
        user_id: targetUserId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (existingShift) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'userHasShiftOnDateRange',
      };
    }

    await prisma.unavailableDate.update({
      where: { id: unavailableDateId },
      data: {
        user_id: targetUserId,
        start_date: startDate,
        end_date: endDate,
        leave_type: parsed.data.leave_type,
        reason: parsed.data.reason || null,
      },
    });

    logger.info('Unavailable date updated successfully', {
      userId: session.user.id,
      updatedUnavailableDateId: unavailableDateId,
      targetUserId: targetUserId,
    });

    revalidatePath('/unavailable-date');
  } catch (error) {
    logger.error('Unexpected error during unavailable date update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateUnavailableDate',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        start_date: formData.get('start_date')?.toString() ?? '',
        end_date: formData.get('end_date')?.toString() ?? '',
        leave_type:
          (formData.get('leave_type')?.toString() as LeaveType) ??
          LeaveType.SICK_LEAVE,
        reason: formData.get('reason')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/unavailable-date?message=unavailableDateUpdatedSuccess');
}

export async function deleteUnavailableDateAction(unavailableDateId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const existingUnavailableDate = await prisma.unavailableDate.findUnique({
      where: { id: unavailableDateId },
    });

    if (!existingUnavailableDate) {
      throw new Error('Unavailable date not found');
    }

    const access = await checkUnavailableDateAccess(
      +session.user.id,
      session.user.role,
      existingUnavailableDate.user_id
    );

    // For employees, ensure they can only delete their own unavailable dates
    if (
      access.userRole === 'EMPLOYEE' &&
      existingUnavailableDate.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the unavailable date belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: existingUnavailableDate.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    await prisma.unavailableDate.delete({
      where: { id: unavailableDateId },
    });

    logger.info('Unavailable date deleted successfully', {
      userId: session.user.id,
      deletedUnavailableDateId: unavailableDateId,
    });

    revalidatePath('/unavailable-date');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during unavailable date deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteUnavailableDate',
    });

    throw error;
  }
}

export async function getUnavailableDateById(unavailableDateId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    if (isNaN(unavailableDateId)) {
      return false;
    }

    const unavailableDate = await prisma.unavailableDate.findUnique({
      where: { id: unavailableDateId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!unavailableDate) {
      return false;
    }

    const access = await checkUnavailableDateAccess(
      +session.user.id,
      session.user.role,
      unavailableDate.user_id
    );

    // For employees, ensure they can only view their own unavailable dates
    if (
      access.userRole === 'EMPLOYEE' &&
      unavailableDate.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the unavailable date belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: unavailableDate.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    return unavailableDate;
  } catch (error) {
    logger.error('Error fetching unavailable date by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUnavailableDateById',
    });
    throw error;
  }
}

async function fetchUnavailableDates(
  params: GetUnavailableDatesParams & { paginate?: boolean }
) {
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

  if (user.role !== 'MANAGER' && user.role !== 'EMPLOYEE') {
    throw new Error('Unauthorized');
  }

  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const userFilter = params.userFilter || 'all';
  const leaveTypeFilter = params.leaveTypeFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: any = {};

  // For employees, only show their own unavailable dates
  if (user.role === 'EMPLOYEE') {
    whereClause.user_id = +session.user.id;
  } else {
    // For managers, filter by company
    if (user.company_id) {
      whereClause.user = {
        company_id: user.company_id,
      };
    } else {
      // Manager without company can't see any unavailable dates
      whereClause.user_id = -1; // Invalid ID to return empty results
    }
  }

  // Apply user filter (only for managers)
  if (userFilter !== 'all' && user.role === 'MANAGER') {
    whereClause.user_id = parseInt(userFilter);
  }

  // Apply leave type filter
  if (leaveTypeFilter !== 'all') {
    whereClause.leave_type = leaveTypeFilter as LeaveType;
  }

  const orderBy: any = {};

  if (sortField === 'user') {
    orderBy.user = { first_name: sortDirection };
  } else if (sortField === 'start_date') {
    orderBy.start_date = sortDirection;
  } else if (sortField === 'end_date') {
    orderBy.end_date = sortDirection;
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [unavailableDates, totalCount] = await Promise.all([
      prisma.unavailableDate.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.unavailableDate.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      unavailableDates,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
    };
  } else {
    const unavailableDates = await prisma.unavailableDate.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy,
    });

    return { unavailableDates };
  }
}

export async function getUnavailableDatesWithPagination(
  params: GetUnavailableDatesParams
): Promise<GetUnavailableDatesResult> {
  return fetchUnavailableDates({
    ...params,
    paginate: true,
  }) as Promise<GetUnavailableDatesResult>;
}

export async function getAllUnavailableDatesForExport(
  params: Omit<GetUnavailableDatesParams, 'page' | 'limit'>
) {
  const result = await fetchUnavailableDates({ ...params, paginate: false });
  return (result as GetUnavailableDatesResultWithoutPagination)
    .unavailableDates;
}

// Helper function to check if a user is unavailable on a specific date
export async function isUserUnavailableOnDate(
  userId: number,
  date: Date
): Promise<boolean> {
  const unavailableDate = await prisma.unavailableDate.findFirst({
    where: {
      user_id: userId,
      start_date: { lte: date },
      end_date: { gte: date },
    },
  });

  return !!unavailableDate;
}
