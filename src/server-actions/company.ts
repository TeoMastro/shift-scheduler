'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetCompaniesParams,
  GetCompaniesResult,
  GetCompaniesResultWithoutPagination,
  Company,
  CompanyFormState,
} from '@/types/company';
import {
  createCompanySchema,
  formatZodErrors,
  updateCompanySchema,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { checkAdminAuth } from './user';
import { auth } from '@/lib/auth';

export async function createCompanyAction(
  prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  try {
    const session = await checkAdminAuth();

    const data = {
      name: formData.get('name')?.toString() ?? '',
    };

    const parsed = createCompanySchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const trimmedName = parsed.data.name.trim();

    const newCompany = await prisma.company.create({
      data: {
        name: trimmedName,
      },
    });

    logger.info('Company created successfully', {
      adminId: session.user.id,
      createdCompanyId: newCompany.id,
    });

    revalidatePath('/admin/company');
  } catch (error) {
    logger.error('Unexpected error during company creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createCompany',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/company?message=companyCreatedSuccess');
}

export async function updateCompanyAction(
  companyId: number,
  prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  try {
    const session = await checkAdminAuth();

    const data = {
      name: formData.get('name')?.toString() ?? '',
    };

    const parsed = updateCompanySchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const trimmedName = parsed.data.name.trim();

    await prisma.company.update({
      where: { id: companyId },
      data: {
        name: trimmedName,
      },
    });

    logger.info('Company updated successfully', {
      adminId: session.user.id,
      updatedCompanyId: companyId,
    });

    revalidatePath('/admin/company');
  } catch (error) {
    logger.error('Unexpected error during company update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateCompany',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/company?message=companyUpdatedSuccess');
}

export async function deleteCompanyAction(companyId: number) {
  try {
    const session = await checkAdminAuth();

    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            shift_types: true,
          },
        },
      },
    });

    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Check if company has users
    if (existingCompany._count.users > 0) {
      throw new Error('Cannot delete company with existing users');
    }

    // Check if company has shift types
    if (existingCompany._count.shift_types > 0) {
      throw new Error('Cannot delete company with existing shift types');
    }

    await prisma.company.delete({
      where: { id: companyId },
    });

    logger.info('Company deleted successfully', {
      adminId: session.user.id,
      deletedCompanyId: companyId,
    });

    revalidatePath('/admin/company');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during company deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteCompany',
    });

    throw error;
  }
}

export async function getCompanyById(companyId: number) {
  try {
    await checkAdminAuth();

    if (isNaN(companyId)) {
      return false;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            shift_types: true,
          },
        },
      },
    });

    if (!company) {
      return false;
    }

    return company;
  } catch (error) {
    logger.error('Error fetching company by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getCompanyById',
    });
    throw error;
  }
}

async function fetchCompanies(
  params: GetCompaniesParams & { paginate?: boolean }
) {
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const search = params.search || '';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const whereClause: {
    name?: { contains: string; mode: 'insensitive' };
  } = {};

  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  const orderBy: Record<string, 'asc' | 'desc' | { _count: 'asc' | 'desc' }> =
    {};

  if (sortField === 'users_count') {
    orderBy.users = { _count: sortDirection };
  } else if (sortField === 'shift_types_count') {
    orderBy.shift_types = { _count: sortDirection };
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true,
              shift_types: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.company.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { companies, totalCount, totalPages, currentPage: page, limit };
  } else {
    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: true,
            shift_types: true,
          },
        },
      },
      orderBy,
    });

    return { companies };
  }
}

export async function getCompaniesWithPagination(
  params: GetCompaniesParams
): Promise<GetCompaniesResult> {
  return fetchCompanies({
    ...params,
    paginate: true,
  }) as Promise<GetCompaniesResult>;
}

export async function getAllCompaniesForExport(
  params: Omit<GetCompaniesParams, 'page' | 'limit'>
): Promise<Company[]> {
  const result = await fetchCompanies({ ...params, paginate: false });
  return (result as GetCompaniesResultWithoutPagination).companies;
}

export async function getAllCompanies() {
  try {
    await checkAdminAuth();

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return companies;
  } catch (error) {
    logger.error('Error fetching all companies', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getAllCompanies',
    });
    throw error;
  }
}

export async function getCompaniesForUserForm() {
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

    // For admin, get all companies
    if (user.role === 'ADMIN') {
      const allCompanies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      return allCompanies;
    }

    // For manager, get only their company
    if (user.role === 'MANAGER' && user.company_id) {
      const company = await prisma.company.findUnique({
        where: { id: user.company_id },
        select: {
          id: true,
          name: true,
        },
      });

      return company ? [company] : [];
    }

    return [];
  } catch (error) {
    logger.error('Error fetching companies for user form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getCompaniesForUserForm',
    });
    throw error;
  }
}
