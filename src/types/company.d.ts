import { Role, Status } from '@prisma/client';

export type Company = {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
  _count?: {
    users: number;
    shift_types: number;
  };
};

export type CompanyFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    name: string;
  };
  globalError: string | null;
};

export type GetCompaniesParams = {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetCompaniesResult = {
  companies: Company[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetCompaniesResultWithoutPagination = {
  companies: Company[];
};

export type AdminCompaniesPageProps = {
  searchParams: Promise<GetCompaniesParams>;
};

export type CompanyFormProps = {
  company?: Omit<Company, 'created_at' | 'updated_at' | '_count'> | null;
  mode: 'create' | 'update';
};

export type CompanyViewProps = {
  company: Company;
};

export interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

export type CompaniesTableProps = {
  companies: Company[];
  // Pagination props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  // Current state props
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
};

export type CompanyPaginationParams = {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
};

export type CompanyExportParams = {
  search?: string;
  sortField?: string;
  sortDirection?: string;
};
