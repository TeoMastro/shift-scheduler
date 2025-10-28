import { ShiftStatus } from '@prisma/client';

export type UserHasShift = {
  id: number;
  user_id: number;
  shift_type_id: number;
  date: Date;
  status: ShiftStatus;
  created_at: Date;
  updated_at: Date;
  user?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    company_id: number | null;
  };
  shift_type?: {
    id: number;
    name: string;
    start_time: Date;
    end_time: Date;
    company_id: number;
  };
};

export type UserHasShiftFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    user_id: string;
    shift_type_id: string;
    date: string;
    status: string;
  };
  globalError: string | null;
};

export type GetUserHasShiftsParams = {
  page?: string;
  limit?: string;
  search?: string;
  userFilter?: string;
  shiftTypeFilter?: string;
  statusFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetUserHasShiftsResult = {
  shifts: UserHasShift[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetUserHasShiftsResultWithoutPagination = {
  shifts: UserHasShift[];
};

export type UserHasShiftsPageProps = {
  searchParams: Promise<GetUserHasShiftsParams>;
};

export type UserHasShiftFormProps = {
  shift?: Omit<
    UserHasShift,
    'created_at' | 'updated_at' | 'user' | 'shift_type'
  > | null;
  mode: 'create' | 'update';
};

export type UserHasShiftViewProps = {
  shift: UserHasShift;
};

export interface UserHasShiftPageProps {
  params: Promise<{ id: string }>;
}

export type UserHasShiftsTableProps = {
  shifts: UserHasShift[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  userFilter: string;
  shiftTypeFilter: string;
  statusFilter: string;
  userRole: 'ADMIN' | 'MANAGER';
  userCompanyId: number | null;
};
