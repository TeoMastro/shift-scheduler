import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { UnavailableDatesTable } from '@/components/unavailable-dates/unavailable-date-table';
import {
  getUnavailableDatesWithPagination,
  getUsersForUnavailableDateForm,
} from '@/server-actions/unavailable-date';
import { UnavailableDatesPageProps } from '@/types/unavailable-date';

export default async function UnavailableDatesPage({
  searchParams,
}: UnavailableDatesPageProps) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    notFound();
  }

  const params = await searchParams;
  const isEmployee = session.user.role === 'EMPLOYEE';

  const [unavailableDatesResult, users] = await Promise.all([
    getUnavailableDatesWithPagination(params),
    isEmployee ? Promise.resolve([]) : getUsersForUnavailableDateForm(),
  ]);

  const { unavailableDates, totalCount, totalPages, currentPage, limit } =
    unavailableDatesResult;

  return (
    <div className="container mx-auto py-6">
      <UnavailableDatesTable
        unavailableDates={unavailableDates}
        // Pagination props
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        // Current state props
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        userFilter={params.userFilter || 'all'}
        leaveTypeFilter={params.leaveTypeFilter || 'all'}
        isEmployee={isEmployee}
        users={users}
      />
    </div>
  );
}
