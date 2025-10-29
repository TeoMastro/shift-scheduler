import { PreferenceType } from '@prisma/client';

export type ShiftDatePreference = {
  id: number;
  user_id: number;
  date: Date;
  preference_type: PreferenceType;
  created_at: Date;
  updated_at: Date;
};

export type ShiftDatePreferenceWithUser = ShiftDatePreference & {
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export type ShiftDatePreferenceFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    user_id: string;
    date: string;
    preference_type: PreferenceType;
  };
  globalError: string | null;
};

export type GetShiftDatePreferencesParams = {
  page?: string;
  limit?: string;
  search?: string;
  userFilter?: string;
  preferenceTypeFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetShiftDatePreferencesResult = {
  preferences: ShiftDatePreferenceWithUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type GetShiftDatePreferencesResultWithoutPagination = {
  preferences: ShiftDatePreferenceWithUser[];
};

export type ShiftDatePreferencesPageProps = {
  searchParams: Promise<GetShiftDatePreferencesParams>;
};

export type ShiftDatePreferenceFormProps = {
  preference?: ShiftDatePreference | null;
  mode: 'create' | 'update';
  users?: { id: number; first_name: string | null; last_name: string | null; email: string }[];
  currentUserId?: number;
  isEmployee?: boolean;
};

export type ShiftDatePreferenceViewProps = {
  preference: ShiftDatePreferenceWithUser;
  isEmployee?: boolean;
};

export interface PageProps {
  params: Promise<{ id: string }>;
}

export type ShiftDatePreferencesTableProps = {
  preferences: ShiftDatePreferenceWithUser[];
  // Pagination props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  // Current state props
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  userFilter: string;
  preferenceTypeFilter: string;
  isEmployee?: boolean;
  users?: { id: number; first_name: string | null; last_name: string | null; email: string }[];
};

