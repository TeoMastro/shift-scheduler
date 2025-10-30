import { Role } from '@prisma/client';

export type ShiftType = {
  id: number;
  name: string;
  start_time: Date; // Time-only (HH:mm), date is 1970-01-01
  end_time: Date; // Time-only (HH:mm), date is 1970-01-01
  company_id: number;
  created_at: Date;
  updated_at: Date;
  company?: {
    id: number;
    name: string;
  };
  skills?: Array<{
    skill_id: number;
    skill: { id: number; name: string };
  }>;
  _count?: {
    shifts: number;
  };
};

export type ShiftTypeFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    name: string;
    start_time: string;
    end_time: string;
    skill_ids?: string[];
  };
  globalError: string | null;
};

export type GetShiftTypesParams = {
  page?: string;
  limit?: string;
  search?: string;
  companyFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetShiftTypesResult = {
  shiftTypes: ShiftType[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetShiftTypesResultWithoutPagination = {
  shiftTypes: ShiftType[];
};

export type AdminShiftTypesPageProps = {
  searchParams: Promise<GetShiftTypesParams>;
};

export type ShiftTypeFormProps = {
  shiftType?: Omit<
    ShiftType,
    'created_at' | 'updated_at' | '_count' | 'company'
  > | null;
  mode: 'create' | 'update';
  availableSkills: { id: number; name: string }[];
  selectedSkillIds?: number[];
};

export type ShiftTypeViewProps = {
  shiftType: ShiftType;
};

export interface ShiftTypePageProps {
  params: Promise<{ id: string }>;
}

export type ShiftTypesTableProps = {
  shiftTypes: ShiftType[];
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
  userRole: Role;
  userCompanyId: number | null;
};

export type ShiftTypePaginationParams = {
  page?: string;
  limit?: string;
  search?: string;
  companyFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type ShiftTypeExportParams = {
  search?: string;
  companyFilter?: string;
  sortField?: string;
  sortDirection?: string;
};
