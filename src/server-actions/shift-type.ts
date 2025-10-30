'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetShiftTypesParams,
  GetShiftTypesResult,
  GetShiftTypesResultWithoutPagination,
  ShiftType,
  ShiftTypeFormState,
} from '@/types/shift-type';
import {
  createShiftTypeSchema,
  formatZodErrors,
  updateShiftTypeSchema,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { auth } from '@/lib/auth';
import { timeToDate } from '@/lib/time-utils';

async function checkShiftTypeAccess(
  sessionUserId: number,
  sessionRole: string
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

  if (user.role !== 'MANAGER') {
    throw new Error('Unauthorized');
  }

  return {
    userRole: 'MANAGER' as const,
    userCompanyId: user.company_id,
  };
}

export async function getCurrentUserForShiftType() {
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
      action: 'getCurrentUserForShiftType',
    });
    throw error;
  }
}

export async function createShiftTypeAction(
  prevState: ShiftTypeFormState,
  formData: FormData
): Promise<ShiftTypeFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userRole, userCompanyId } = await checkShiftTypeAccess(
      +session.user.id,
      session.user.role
    );

    const data = {
      name: formData.get('name')?.toString() ?? '',
      start_time: formData.get('start_time')?.toString() ?? '',
      end_time: formData.get('end_time')?.toString() ?? '',
    };

    const parsed = createShiftTypeSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    // Manager can only create for their own company
    if (userCompanyId === null) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'managerMustBelongToCompany',
      };
    }
    const companyId = userCompanyId;

    const trimmedName = parsed.data.name.trim();

    // Parse time strings to Date objects for storage (time-only)
    const startTimeDate = timeToDate(parsed.data.start_time);
    const endTimeDate = timeToDate(parsed.data.end_time);

    const newShiftType = await prisma.shiftType.create({
      data: {
        name: trimmedName,
        start_time: startTimeDate,
        end_time: endTimeDate,
        company_id: companyId,
      },
    });

    logger.info('Shift type created successfully', {
      userId: session.user.id,
      createdShiftTypeId: newShiftType.id,
    });

    revalidatePath('/shift-type');
  } catch (error) {
    logger.error('Unexpected error during shift type creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createShiftType',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        start_time: formData.get('start_time')?.toString() ?? '',
        end_time: formData.get('end_time')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift-type?message=shiftTypeCreatedSuccess');
}

export async function updateShiftTypeAction(
  shiftTypeId: number,
  prevState: ShiftTypeFormState,
  formData: FormData
): Promise<ShiftTypeFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userRole, userCompanyId } = await checkShiftTypeAccess(
      +session.user.id,
      session.user.role
    );

    // Check if shift type exists and user has access
    const existingShiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
    });

    if (!existingShiftType) {
      return {
        success: false,
        errors: {},
        formData: {
          name: formData.get('name')?.toString() ?? '',
          start_time: formData.get('start_time')?.toString() ?? '',
          end_time: formData.get('end_time')?.toString() ?? '',
        },
        globalError: 'shiftTypeNotFound',
      };
    }

    // Manager can only edit shift types from their company
    if (
      userRole === 'MANAGER' &&
      existingShiftType.company_id !== userCompanyId
    ) {
      throw new Error('Unauthorized');
    }

    const data = {
      name: formData.get('name')?.toString() ?? '',
      start_time: formData.get('start_time')?.toString() ?? '',
      end_time: formData.get('end_time')?.toString() ?? '',
    };

    const parsed = updateShiftTypeSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: {
          ...data,
        },
        globalError: null,
      };
    }

    const trimmedName = parsed.data.name.trim();

    // Parse time strings to Date objects for storage (time-only)
    const startTimeDate = timeToDate(parsed.data.start_time);
    const endTimeDate = timeToDate(parsed.data.end_time);

    await prisma.shiftType.update({
      where: { id: shiftTypeId },
      data: {
        name: trimmedName,
        start_time: startTimeDate,
        end_time: endTimeDate,
      },
    });

    logger.info('Shift type updated successfully', {
      userId: session.user.id,
      updatedShiftTypeId: shiftTypeId,
    });

    revalidatePath('/shift-type');
  } catch (error) {
    logger.error('Unexpected error during shift type update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateShiftType',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        start_time: formData.get('start_time')?.toString() ?? '',
        end_time: formData.get('end_time')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift-type?message=shiftTypeUpdatedSuccess');
}

export async function deleteShiftTypeAction(shiftTypeId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userRole, userCompanyId } = await checkShiftTypeAccess(
      +session.user.id,
      session.user.role
    );

    const existingShiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
      include: {
        _count: {
          select: {
            shifts: true,
          },
        },
      },
    });

    if (!existingShiftType) {
      throw new Error('Shift type not found');
    }

    // Manager can only delete shift types from their company
    if (
      userRole === 'MANAGER' &&
      existingShiftType.company_id !== userCompanyId
    ) {
      throw new Error('Unauthorized');
    }

    // Check if shift type has shifts
    if (existingShiftType._count.shifts > 0) {
      throw new Error('Cannot delete shift type with existing shifts');
    }

    await prisma.shiftType.delete({
      where: { id: shiftTypeId },
    });

    logger.info('Shift type deleted successfully', {
      userId: session.user.id,
      deletedShiftTypeId: shiftTypeId,
    });

    revalidatePath('/shift-type');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during shift type deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteShiftType',
    });

    throw error;
  }
}

export async function getShiftTypeById(shiftTypeId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userRole, userCompanyId } = await checkShiftTypeAccess(
      +session.user.id,
      session.user.role
    );

    if (isNaN(shiftTypeId)) {
      return false;
    }

    const shiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            shifts: true,
          },
        },
      },
    });

    if (!shiftType) {
      return false;
    }

    // Manager can only view shift types from their company
    if (userRole === 'MANAGER' && shiftType.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    return shiftType;
  } catch (error) {
    logger.error('Error fetching shift type by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getShiftTypeById',
    });
    throw error;
  }
}

async function fetchShiftTypes(
  params: GetShiftTypesParams & { paginate?: boolean }
) {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const { userRole, userCompanyId } = await checkShiftTypeAccess(
    +session.user.id,
    session.user.role
  );

  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const search = params.search || '';
  const companyFilter = params.companyFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: {
    name?: { contains: string; mode: 'insensitive' };
    company_id?: number;
  } = {};

  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  // Apply company filter
  if (companyFilter !== 'all') {
    whereClause.company_id = parseInt(companyFilter);
  }

  // Manager can only see their company's shift types
  if (userRole === 'MANAGER') {
    if (userCompanyId === null) {
      throw new Error('Manager must belong to a company to access shift types');
    }
    whereClause.company_id = userCompanyId;
  }

  const orderBy: any = {};

  if (sortField === 'shifts_count') {
    orderBy.shifts = { _count: sortDirection };
  } else if (sortField === 'company') {
    orderBy.company = { name: sortDirection };
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [shiftTypes, totalCount] = await Promise.all([
      prisma.shiftType.findMany({
        where: whereClause,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              shifts: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.shiftType.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { shiftTypes, totalCount, totalPages, currentPage: page, limit };
  } else {
    const shiftTypes = await prisma.shiftType.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            shifts: true,
          },
        },
      },
      orderBy,
    });

    return { shiftTypes };
  }
}

export async function getShiftTypesWithPagination(
  params: GetShiftTypesParams
): Promise<GetShiftTypesResult> {
  return fetchShiftTypes({
    ...params,
    paginate: true,
  }) as Promise<GetShiftTypesResult>;
}

export async function getAllShiftTypesForExport(
  params: Omit<GetShiftTypesParams, 'page' | 'limit'>
): Promise<ShiftType[]> {
  const result = await fetchShiftTypes({ ...params, paginate: false });
  return (result as GetShiftTypesResultWithoutPagination).shiftTypes;
}
