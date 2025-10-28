'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetSkillsParams,
  GetSkillsResult,
  GetSkillsResultWithoutPagination,
  SkillFormState,
} from '@/types/skill';
import {
  createSkillSchema,
  formatZodErrors,
  updateSkillSchema,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { auth } from '@/lib/auth';

async function checkSkillAccess(sessionUserId: number, sessionRole: string) {
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
    userCompanyId: user.company_id,
  };
}

export async function getCompaniesForSkillForm() {
  try {
    const session = await auth();

    if (!session) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { id: +session.user.id },
      select: {
        company_id: true,
      },
    });

    if (!user) {
      return [];
    }

    // Get the manager's company (only managers can access skills)
    if (!user.company_id) {
      return [];
    }

    const company = await prisma.company.findUnique({
      where: { id: user.company_id },
      select: {
        id: true,
        name: true,
      },
    });

    return company ? [company] : [];
  } catch (error) {
    logger.error('Error fetching companies for skill form', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getCompaniesForSkillForm',
    });
    throw error;
  }
}

export async function createSkillAction(
  prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkSkillAccess(
      +session.user.id,
      session.user.role
    );

    const data = {
      name: formData.get('name')?.toString() ?? '',
      company_id: formData.get('company_id')?.toString() ?? '',
    };

    const parsed = createSkillSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    // Managers must belong to a company
    if (userCompanyId === null) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'managerMustBelongToCompany',
      };
    }

    // Use manager's company_id (managers can only manage skills for their own company)
    const companyId = userCompanyId;

    const trimmedName = parsed.data.name.trim();

    // Check for duplicate skill name in the same company
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: trimmedName,
        company_id: companyId,
      },
    });

    if (existingSkill) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'skillAlreadyExists',
      };
    }

    const newSkill = await prisma.skill.create({
      data: {
        name: trimmedName,
        company_id: companyId,
      },
    });

    logger.info('Skill created successfully', {
      userId: session.user.id,
      createdSkillId: newSkill.id,
    });

    revalidatePath('/skill');
  } catch (error) {
    logger.error('Unexpected error during skill creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createSkill',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        company_id: formData.get('company_id')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/skill?message=skillCreatedSuccess');
}

export async function updateSkillAction(
  skillId: number,
  prevState: SkillFormState,
  formData: FormData
): Promise<SkillFormState> {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkSkillAccess(
      +session.user.id,
      session.user.role
    );

    // Check if skill exists and user has access
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      return {
        success: false,
        errors: {},
        formData: {
          name: formData.get('name')?.toString() ?? '',
          company_id: formData.get('company_id')?.toString() ?? '',
        },
        globalError: 'skillNotFound',
      };
    }

    // Manager can only edit skills from their company
    if (existingSkill.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    const data = {
      name: formData.get('name')?.toString() ?? '',
      company_id: formData.get('company_id')?.toString() ?? '',
    };

    const parsed = updateSkillSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const trimmedName = parsed.data.name.trim();

    // Always use the existing skill's company_id (managers cannot change it)
    const companyId = existingSkill.company_id;

    // Check for duplicate skill name in the same company (excluding current skill)
    const duplicateSkill = await prisma.skill.findFirst({
      where: {
        name: trimmedName,
        company_id: companyId,
        id: { not: skillId },
      },
    });

    if (duplicateSkill) {
      return {
        success: false,
        errors: {},
        formData: data,
        globalError: 'skillAlreadyExists',
      };
    }

    await prisma.skill.update({
      where: { id: skillId },
      data: {
        name: trimmedName,
        // Don't allow changing company_id - keep the existing one
      },
    });

    logger.info('Skill updated successfully', {
      userId: session.user.id,
      updatedSkillId: skillId,
    });

    revalidatePath('/skill');
  } catch (error) {
    logger.error('Unexpected error during skill update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateSkill',
    });

    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        company_id: formData.get('company_id')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/skill?message=skillUpdatedSuccess');
}

export async function deleteSkillAction(skillId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkSkillAccess(
      +session.user.id,
      session.user.role
    );

    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!existingSkill) {
      throw new Error('Skill not found');
    }

    // Manager can only delete skills from their company
    if (existingSkill.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    // Check if skill has users assigned
    if (existingSkill._count.users > 0) {
      throw new Error('Cannot delete skill with assigned users');
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    logger.info('Skill deleted successfully', {
      userId: session.user.id,
      deletedSkillId: skillId,
    });

    revalidatePath('/skill');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during skill deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteSkill',
    });

    throw error;
  }
}

export async function getSkillById(skillId: number) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const { userCompanyId } = await checkSkillAccess(
      +session.user.id,
      session.user.role
    );

    if (isNaN(skillId)) {
      return false;
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!skill) {
      return false;
    }

    // Manager can only view skills from their company
    if (skill.company_id !== userCompanyId) {
      throw new Error('Unauthorized');
    }

    return skill;
  } catch (error) {
    logger.error('Error fetching skill by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getSkillById',
    });
    throw error;
  }
}

async function fetchSkills(params: GetSkillsParams & { paginate?: boolean }) {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const { userCompanyId } = await checkSkillAccess(
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

  // Manager can only see their company's skills
  if (userCompanyId === null) {
    throw new Error('Manager must belong to a company to access skills');
  }
  whereClause.company_id = userCompanyId;

  const orderBy: any = {};

  if (sortField === 'users_count') {
    orderBy.users = { _count: sortDirection };
  } else if (sortField === 'company') {
    orderBy.company = { name: sortDirection };
  } else {
    orderBy[sortField] = sortDirection;
  }

  if (paginate) {
    const [skills, totalCount] = await Promise.all([
      prisma.skill.findMany({
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
              users: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.skill.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { skills, totalCount, totalPages, currentPage: page, limit };
  } else {
    const skills = await prisma.skill.findMany({
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
            users: true,
          },
        },
      },
      orderBy,
    });

    return { skills };
  }
}

export async function getSkillsWithPagination(
  params: GetSkillsParams
): Promise<GetSkillsResult> {
  return fetchSkills({
    ...params,
    paginate: true,
  }) as Promise<GetSkillsResult>;
}

export async function getAllSkillsForExport(
  params: Omit<GetSkillsParams, 'page' | 'limit'>
) {
  const result = await fetchSkills({ ...params, paginate: false });
  return (result as GetSkillsResultWithoutPagination).skills;
}
