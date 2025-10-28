import { Skill, Company } from '@prisma/client';

export type SkillWithCompany = Skill & {
  company: {
    id: number;
    name: string;
  };
  _count: {
    users: number;
  };
};

export type SkillFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    name: string;
    company_id: string;
  };
  globalError: string | null;
};

export type GetSkillsParams = {
  page?: string;
  limit?: string;
  search?: string;
  companyFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetSkillsResult = {
  skills: SkillWithCompany[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetSkillsResultWithoutPagination = {
  skills: SkillWithCompany[];
};

export type AdminSkillsPageProps = {
  searchParams: Promise<GetSkillsParams>;
};

export type SkillFormProps = {
  skill?: Skill | null;
  mode: 'create' | 'update';
  companies?: { id: number; name: string }[];
};

export type SkillViewProps = {
  skill: SkillWithCompany;
};

export interface PageProps {
  params: Promise<{ id: string }>;
}

export type SkillsTableProps = {
  skills: SkillWithCompany[];
  // Pagination props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  // Current state props
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  companyFilter: string;
};

