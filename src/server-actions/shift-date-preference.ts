'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetShiftDatePreferencesParams,
  GetShiftDatePreferencesResult,
  GetShiftDatePreferencesResultWithoutPagination,
  ShiftDatePreferenceFormState,
} from '@/types/shift-date-preference';
import {
  createShiftDatePreferenceSchema,
  formatZodErrors,
  updateShiftDatePreferenceSchema,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { auth } from '@/lib/auth';
import { PreferenceType } from '@prisma/client';

async function checkPreferenceAccess(
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

  // Only MANAGER and EMPLOYEE can access preferences
  if (user.role !== 'MANAGER' && user.role !== 'EMPLOYEE') {
    throw new Error('Unauthorized');
  }

  // If EMPLOYEE, they can only manage their own preferences
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

  // If MANAGER, they can manage preferences for users in their company
  return {
    userRole: 'MANAGER' as const,
    userCompanyId: user.company_id,
    allowedUserId: undefined, // Managers can select any user in their company
  };
}

export async function getUsersForPreferenceForm() {
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

    // Only managers can call this function
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
    logger.error('Error fetching users for preference form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUsersForPreferenceForm',
    });
    throw error;
  }
}

export async function createShiftDatePreferenceAction(
  prevState: ShiftDatePreferenceFormState,
  formData: FormData
): Promise<ShiftDatePreferenceFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      date: formData.get('date')?.toString() ?? '',
      preference_type: formData
        .get('preference_type')
        ?.toString() as PreferenceType,
    };

    const parsed = createShiftDatePreferenceSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const targetUserId = parseInt(parsed.data.user_id);
    const access = await checkPreferenceAccess(
      +session.user.id,
      session.user.role,
      targetUserId
    );

    // For employees, ensure they can only set preferences for themselves
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

    const date = new Date(parsed.data.date);

    // Check if preference already exists
    const existingPreference = await prisma.shiftDatePreference.findFirst({
      where: {
        user_id: targetUserId,
        date: date,
        preference_type: parsed.data.preference_type,
      },
    });

    if (existingPreference) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'preferenceAlreadyExists',
      };
    }

    const newPreference = await prisma.shiftDatePreference.create({
      data: {
        user_id: targetUserId,
        date: date,
        preference_type: parsed.data.preference_type,
      },
    });

    logger.info('Shift date preference created successfully', {
      userId: session.user.id,
      createdPreferenceId: newPreference.id,
      targetUserId: targetUserId,
    });

    revalidatePath('/shift-date-preference');
  } catch (error) {
    logger.error('Unexpected error during preference creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createShiftDatePreference',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        date: formData.get('date')?.toString() ?? '',
        preference_type:
          (formData.get('preference_type')?.toString() as PreferenceType) ??
          PreferenceType.DESIRED,
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift-date-preference?message=preferenceCreatedSuccess');
}

export async function updateShiftDatePreferenceAction(
  preferenceId: number,
  prevState: ShiftDatePreferenceFormState,
  formData: FormData
): Promise<ShiftDatePreferenceFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if preference exists
    const existingPreference = await prisma.shiftDatePreference.findUnique({
      where: { id: preferenceId },
    });

    if (!existingPreference) {
      return {
        success: false,
        errors: {},
        formData: {
          user_id: formData.get('user_id')?.toString() ?? '',
          date: formData.get('date')?.toString() ?? '',
          preference_type:
            (formData.get('preference_type')?.toString() as PreferenceType) ??
            PreferenceType.DESIRED,
        },
        globalError: 'preferenceNotFound',
      };
    }

    const access = await checkPreferenceAccess(
      +session.user.id,
      session.user.role,
      existingPreference.user_id
    );

    // For employees, ensure they can only update their own preferences
    if (
      access.userRole === 'EMPLOYEE' &&
      existingPreference.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the preference belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: existingPreference.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      date: formData.get('date')?.toString() ?? '',
      preference_type: formData
        .get('preference_type')
        ?.toString() as PreferenceType,
    };

    const parsed = updateShiftDatePreferenceSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const targetUserId = parseInt(parsed.data.user_id);

    // Ensure user_id matches the existing preference (or is the same user for employees)
    if (access.userRole === 'EMPLOYEE') {
      if (targetUserId !== existingPreference.user_id) {
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

    const date = new Date(parsed.data.date);

    // Check for duplicate (different preference but same user, date, and type)
    const duplicatePreference = await prisma.shiftDatePreference.findFirst({
      where: {
        user_id: targetUserId,
        date: date,
        preference_type: parsed.data.preference_type,
        id: { not: preferenceId },
      },
    });

    if (duplicatePreference) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'preferenceAlreadyExists',
      };
    }

    await prisma.shiftDatePreference.update({
      where: { id: preferenceId },
      data: {
        user_id: targetUserId,
        date: date,
        preference_type: parsed.data.preference_type,
      },
    });

    logger.info('Shift date preference updated successfully', {
      userId: session.user.id,
      updatedPreferenceId: preferenceId,
      targetUserId: targetUserId,
    });

    revalidatePath('/shift-date-preference');
  } catch (error) {
    logger.error('Unexpected error during preference update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateShiftDatePreference',
    });

    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        date: formData.get('date')?.toString() ?? '',
        preference_type:
          (formData.get('preference_type')?.toString() as PreferenceType) ??
          PreferenceType.DESIRED,
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/shift-date-preference?message=preferenceUpdatedSuccess');
}

export async function deleteShiftDatePreferenceAction(preferenceId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const existingPreference = await prisma.shiftDatePreference.findUnique({
      where: { id: preferenceId },
    });

    if (!existingPreference) {
      throw new Error('Preference not found');
    }

    const access = await checkPreferenceAccess(
      +session.user.id,
      session.user.role,
      existingPreference.user_id
    );

    // For employees, ensure they can only delete their own preferences
    if (
      access.userRole === 'EMPLOYEE' &&
      existingPreference.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the preference belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: existingPreference.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    await prisma.shiftDatePreference.delete({
      where: { id: preferenceId },
    });

    logger.info('Shift date preference deleted successfully', {
      userId: session.user.id,
      deletedPreferenceId: preferenceId,
    });

    revalidatePath('/shift-date-preference');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during preference deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteShiftDatePreference',
    });

    throw error;
  }
}

export async function getShiftDatePreferenceById(preferenceId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    if (isNaN(preferenceId)) {
      return false;
    }

    const preference = await prisma.shiftDatePreference.findUnique({
      where: { id: preferenceId },
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

    if (!preference) {
      return false;
    }

    const access = await checkPreferenceAccess(
      +session.user.id,
      session.user.role,
      preference.user_id
    );

    // For employees, ensure they can only view their own preferences
    if (
      access.userRole === 'EMPLOYEE' &&
      preference.user_id !== access.allowedUserId
    ) {
      throw new Error('Unauthorized');
    }

    // For managers, ensure the preference belongs to a user in their company
    if (access.userRole === 'MANAGER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: preference.user_id },
        select: { company_id: true },
      });

      if (!targetUser || targetUser.company_id !== access.userCompanyId) {
        throw new Error('Unauthorized');
      }
    }

    return preference;
  } catch (error) {
    logger.error('Error fetching preference by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getShiftDatePreferenceById',
    });
    throw error;
  }
}

async function fetchPreferences(
  params: GetShiftDatePreferencesParams & { paginate?: boolean }
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
  const search = params.search || '';
  const userFilter = params.userFilter || 'all';
  const preferenceTypeFilter = params.preferenceTypeFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: any = {};

  // For employees, only show their own preferences
  if (user.role === 'EMPLOYEE') {
    whereClause.user_id = +session.user.id;
  } else {
    // For managers, filter by company
    if (user.company_id) {
      whereClause.user = {
        company_id: user.company_id,
      };
    } else {
      // Manager without company can't see any preferences
      whereClause.user_id = -1; // Invalid ID to return empty results
    }
  }

  // Apply user filter (only for managers)
  if (userFilter !== 'all' && user.role === 'MANAGER') {
    whereClause.user_id = parseInt(userFilter);
  }

  // Apply preference type filter
  if (preferenceTypeFilter !== 'all') {
    whereClause.preference_type = preferenceTypeFilter as PreferenceType;
  }

  // Apply search (search in user name or email - only for managers)
  if (search && user.role === 'MANAGER') {
    whereClause.user = {
      ...whereClause.user,
      OR: [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const orderBy: any = {};

  if (sortField === 'user') {
    orderBy.user = { first_name: sortDirection };
  } else if (sortField === 'date') {
    orderBy.date = sortDirection;
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [preferences, totalCount] = await Promise.all([
      prisma.shiftDatePreference.findMany({
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
      prisma.shiftDatePreference.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      preferences,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
    };
  } else {
    const preferences = await prisma.shiftDatePreference.findMany({
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

    return { preferences };
  }
}

export async function getShiftDatePreferencesWithPagination(
  params: GetShiftDatePreferencesParams
): Promise<GetShiftDatePreferencesResult> {
  return fetchPreferences({
    ...params,
    paginate: true,
  }) as Promise<GetShiftDatePreferencesResult>;
}

export async function getAllShiftDatePreferencesForExport(
  params: Omit<GetShiftDatePreferencesParams, 'page' | 'limit'>
) {
  const result = await fetchPreferences({ ...params, paginate: false });
  return (result as GetShiftDatePreferencesResultWithoutPagination).preferences;
}
