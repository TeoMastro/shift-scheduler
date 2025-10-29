import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ShiftDatePreferencesTable } from '@/components/shift-date-preferences/shift-date-preference-table';
import {
  getShiftDatePreferencesWithPagination,
  getUsersForPreferenceForm,
} from '@/server-actions/shift-date-preference';
import { ShiftDatePreferencesPageProps } from '@/types/shift-date-preference';

export default async function ShiftDatePreferencesPage({
  searchParams,
}: ShiftDatePreferencesPageProps) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    notFound();
  }

  const params = await searchParams;
  const isEmployee = session.user.role === 'EMPLOYEE';

  const [preferencesResult, users] = await Promise.all([
    getShiftDatePreferencesWithPagination(params),
    isEmployee ? Promise.resolve([]) : getUsersForPreferenceForm(),
  ]);

  const { preferences, totalCount, totalPages, currentPage, limit } =
    preferencesResult;

  return (
    <div className="container mx-auto py-6">
      <ShiftDatePreferencesTable
        preferences={preferences}
        // Pagination props
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        // Current state props
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        userFilter={params.userFilter || 'all'}
        preferenceTypeFilter={params.preferenceTypeFilter || 'all'}
        isEmployee={isEmployee}
        users={users}
      />
    </div>
  );
}
