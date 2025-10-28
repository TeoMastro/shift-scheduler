'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  GetUsersParams,
  GetUsersResult,
  GetUsersResultWithoutPagination,
  User,
  UserFormState,
} from '@/types/user';
import {
  createUserSchema,
  formatZodErrors,
  updateUserSchema,
} from '@/lib/validation-schemas';
import { Role, Status } from '@prisma/client';
import logger from '@/lib/logger';

export async function checkUserAccess() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
  ) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function checkAdminAuth() {
  const session = await auth();

  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function createUserAction(
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  try {
    const session = await checkUserAccess();

    // Get the current user's company_id if they are a manager
    const currentUser = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: { company_id: true, role: true },
    });

    const managerCompanyId =
      session.user.role === 'MANAGER' ? currentUser?.company_id : null;

    const data = {
      first_name: formData.get('first_name')?.toString() ?? '',
      last_name: formData.get('last_name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      role: (formData.get('role')?.toString() as Role) ?? Role.EMPLOYEE,
      status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
      company_id: formData.get('company_id')?.toString() ?? '',
    };

    // For managers, force company_id to their company and restrict role to EMPLOYEE
    if (session.user.role === 'MANAGER') {
      if (!managerCompanyId) {
        return {
          success: false,
          errors: {},
          formData: { ...data, password: '' },
          globalError: 'managerMustBelongToCompany',
        };
      }

      // Managers can only create employees
      if (data.role !== Role.EMPLOYEE) {
        return {
          success: false,
          errors: {},
          formData: { ...data, password: '' },
          globalError: 'managersCanOnlyCreateEmployees',
        };
      }

      // Force manager's company
      data.company_id = managerCompanyId.toString();
    }

    const parsed = createUserSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: { ...data, password: '' },
        globalError: null,
      };
    }

    const trimmedEmail = parsed.data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        errors: {},
        formData: {
          ...parsed.data,
          password: '',
          company_id: parsed.data.company_id || '',
        },
        globalError: 'userAlreadyExists',
      };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    // Get skill IDs from form data
    const skillIds = formData
      .getAll('skill_ids')
      .map((id) => parseInt(id.toString()))
      .filter((id) => !isNaN(id));

    const newUser = await prisma.user.create({
      data: {
        first_name: parsed.data.first_name.trim(),
        last_name: parsed.data.last_name.trim(),
        email: trimmedEmail,
        password: hashedPassword,
        role: parsed.data.role,
        status: parsed.data.status,
        company_id:
          parsed.data.company_id && parsed.data.company_id !== ''
            ? parseInt(parsed.data.company_id)
            : null,
        skills:
          skillIds.length > 0
            ? {
                create: skillIds.map((skillId) => ({
                  skill_id: skillId,
                })),
              }
            : undefined,
      },
    });

    logger.info('User created successfully', {
      userId: session.user.id,
      createdUserId: newUser.id,
    });

    revalidatePath('/admin/user');
  } catch (error) {
    logger.error('Unexpected error during user creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createUser',
    });

    return {
      success: false,
      errors: {},
      formData: {
        first_name: formData.get('first_name')?.toString() ?? '',
        last_name: formData.get('last_name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: '',
        role: (formData.get('role')?.toString() as Role) ?? Role.EMPLOYEE,
        status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
        company_id: formData.get('company_id')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/user?message=userCreatedSuccess');
}

export async function updateUserAction(
  userId: number,
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  try {
    const session = await checkUserAccess();

    // Get the current user's company_id if they are a manager
    const currentUser = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: { company_id: true, role: true },
    });

    const managerCompanyId =
      session.user.role === 'MANAGER' ? currentUser?.company_id : null;

    const data = {
      first_name: formData.get('first_name')?.toString() ?? '',
      last_name: formData.get('last_name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      role: (formData.get('role')?.toString() as Role) ?? Role.EMPLOYEE,
      status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
      company_id: formData.get('company_id')?.toString() ?? '',
    };

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        errors: {},
        formData: {
          ...data,
          password: '',
          company_id: data.company_id || '',
        },
        globalError: 'userNotFound',
      };
    }

    // Managers can only update users in their company and cannot change their role to anything other than EMPLOYEE
    if (session.user.role === 'MANAGER') {
      if (!managerCompanyId || existingUser.company_id !== managerCompanyId) {
        throw new Error('Unauthorized');
      }

      // Managers cannot change user's company
      data.company_id = managerCompanyId.toString();

      // Managers cannot elevate users to MANAGER or ADMIN
      if (data.role !== Role.EMPLOYEE) {
        return {
          success: false,
          errors: {},
          formData: { ...data, password: '' },
          globalError: 'managersCanOnlySetEmployeeRole',
        };
      }
    }

    const parsed = updateUserSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: { ...data, password: '' },
        globalError: null,
      };
    }

    const trimmedEmail = parsed.data.email.trim().toLowerCase();

    const emailTaken = await prisma.user.findFirst({
      where: {
        email: trimmedEmail,
        id: { not: userId },
      },
    });

    if (emailTaken) {
      return {
        success: false,
        errors: {},
        formData: {
          ...parsed.data,
          password: '',
          company_id: parsed.data.company_id || '',
        },
        globalError: 'emailAlreadyTaken',
      };
    }

    const updateData: {
      first_name: string;
      last_name: string;
      email: string;
      role: Role;
      status: Status;
      password?: string;
      company_id: number | null;
    } = {
      first_name: parsed.data.first_name.trim(),
      last_name: parsed.data.last_name.trim(),
      email: trimmedEmail,
      role: parsed.data.role,
      status: parsed.data.status,
      company_id:
        parsed.data.company_id && parsed.data.company_id !== ''
          ? parseInt(parsed.data.company_id)
          : null,
    };

    if (parsed.data.password && parsed.data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(parsed.data.password, 12);
    }

    // Get skill IDs from form data
    const skillIds = formData
      .getAll('skill_ids')
      .map((id) => parseInt(id.toString()))
      .filter((id) => !isNaN(id));

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        skills: {
          deleteMany: {},
          create: skillIds.map((skillId) => ({
            skill_id: skillId,
          })),
        },
      },
    });

    logger.info('User updated successfully', {
      userId: session.user.id,
      updatedUserId: userId,
    });

    revalidatePath('/admin/user');
  } catch (error) {
    logger.error('Unexpected error during user update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateUser',
    });

    return {
      success: false,
      errors: {},
      formData: {
        first_name: formData.get('first_name')?.toString() ?? '',
        last_name: formData.get('last_name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: '',
        role: (formData.get('role')?.toString() as Role) ?? Role.EMPLOYEE,
        status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
        company_id: formData.get('company_id')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/user?message=userUpdatedSuccess');
}

export async function deleteUserAction(userId: number) {
  try {
    const session = await checkUserAccess();

    if (+session.user.id === userId) {
      throw new Error('Cannot delete own account');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Managers can only delete users in their company
    if (session.user.role === 'MANAGER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: +session.user.id },
        select: { company_id: true },
      });

      if (
        !currentUser?.company_id ||
        existingUser.company_id !== currentUser.company_id
      ) {
        throw new Error('Unauthorized');
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('User deleted successfully', {
      userId: session.user.id,
      deletedUserId: userId,
    });

    revalidatePath('/admin/user');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during user deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteUser',
    });

    throw error;
  }
}

export async function getUserById(userId: number) {
  try {
    const session = await checkUserAccess();

    if (isNaN(userId)) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        company_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return false;
    }

    // Managers can only view users in their company
    if (session.user.role === 'MANAGER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: +session.user.id },
        select: { company_id: true },
      });

      if (
        !currentUser?.company_id ||
        user.company_id !== currentUser.company_id
      ) {
        throw new Error('Unauthorized');
      }
    }

    return user;
  } catch (error) {
    logger.error('Error fetching user by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUserById',
    });
    throw error;
  }
}

async function fetchUsers(params: GetUsersParams & { paginate?: boolean }) {
  // Get current user's company if they are a manager
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: +session.user.id },
    select: { company_id: true, role: true },
  });

  const managerCompanyId =
    session.user.role === 'MANAGER' ? currentUser?.company_id : null;

  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const search = params.search || '';
  const roleFilter = params.roleFilter || 'all';
  const statusFilter = params.statusFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: any = {};

  // Managers can only see users from their company
  if (managerCompanyId !== null) {
    whereClause.company_id = managerCompanyId;
  }

  if (search) {
    whereClause.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (roleFilter !== 'all') {
    whereClause.role = roleFilter as 'EMPLOYEE' | 'ADMIN' | 'MANAGER';
  }

  if (statusFilter !== 'all') {
    whereClause.status = statusFilter as 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED';
  }

  const orderBy: Record<string, 'asc' | 'desc'> = {};

  if (sortField === 'name') {
    orderBy.first_name = sortDirection;
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          role: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { users, totalCount, totalPages, currentPage: page, limit };
  } else {
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    return { users };
  }
}

export async function getUsersWithPagination(
  params: GetUsersParams
): Promise<GetUsersResult> {
  return fetchUsers({ ...params, paginate: true }) as Promise<GetUsersResult>;
}

export async function getAllUsersForExport(
  params: Omit<GetUsersParams, 'page' | 'limit'>
): Promise<User[]> {
  const result = await fetchUsers({ ...params, paginate: false });
  return (result as GetUsersResultWithoutPagination).users;
}

export async function getSkillsForCompany(companyId: number) {
  try {
    await checkUserAccess();

    const skills = await prisma.skill.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return skills;
  } catch (error) {
    logger.error('Error fetching skills for company', {
      error: (error as Error).message,
      action: 'getSkillsForCompany',
    });
    return [];
  }
}

export async function getUserSkills(userId: number) {
  try {
    const session = await checkUserAccess();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                company_id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // Managers can only view skills of users in their company
    if (session.user.role === 'MANAGER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: +session.user.id },
        select: { company_id: true },
      });

      if (
        !currentUser?.company_id ||
        user.company_id !== currentUser.company_id
      ) {
        throw new Error('Unauthorized');
      }
    }

    return user.skills.map((uhs) => uhs.skill);
  } catch (error) {
    logger.error('Error fetching user skills', {
      error: (error as Error).message,
      action: 'getUserSkills',
    });
    return [];
  }
}
