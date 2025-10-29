import { LeaveType, UnavailableDate } from '@prisma/client';

export type UnavailableDateWithUser = UnavailableDate & {
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export type UnavailableDateFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    user_id: string;
    start_date: string;
    end_date: string;
    leave_type: LeaveType;
    reason: string;
  };
  globalError: string | null;
};

export type GetUnavailableDatesParams = {
  page?: string;
  limit?: string;
  userFilter?: string;
  leaveTypeFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetUnavailableDatesResult = {
  unavailableDates: UnavailableDateWithUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetUnavailableDatesResultWithoutPagination = {
  unavailableDates: UnavailableDateWithUser[];
};

export type UnavailableDatesPageProps = {
  searchParams: Promise<GetUnavailableDatesParams>;
};

export type UnavailableDateFormProps = {
  unavailableDate?: UnavailableDate | null;
  mode: 'create' | 'update';
  users?: { id: number; first_name: string | null; last_name: string | null; email: string }[];
  currentUserId?: number;
  isEmployee?: boolean;
};

export type UnavailableDateViewProps = {
  unavailableDate: UnavailableDateWithUser;
  isEmployee?: boolean;
};

export interface PageProps {
  params: Promise<{ id: string }>;
}

export type UnavailableDatesTableProps = {
  unavailableDates: UnavailableDateWithUser[];
  // Pagination props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  // Current state props
  sortField: string;
  sortDirection: 'asc' | 'desc';
  userFilter: string;
  leaveTypeFilter: string;
  isEmployee?: boolean;
  users?: { id: number; first_name: string | null; last_name: string | null; email: string }[];
};

