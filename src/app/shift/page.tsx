import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ShiftsTable } from '@/components/shift/shift-table';
import { UserHasShiftsPageProps } from '@/types/user-has-shift';
import {
  getShiftsWithPagination,
  getCurrentUserForShift,
} from '@/server-actions/user-has-shift';
import { getTranslations } from 'next-intl/server';

export default async function ShiftsPage({ searchParams }: UserHasShiftsPageProps) {
  const session = await auth();
  const t = await getTranslations('app');

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if user is manager
  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  // Get user's company_id for manager role
  const user = await getCurrentUserForShift();

  // If manager doesn't have company_id, show appropriate message
  if (!user) {
    notFound();
  }

  if (user.role === 'MANAGER' && user.company_id === null) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t('managerMustBelongToCompany')}
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const { shifts, totalCount, totalPages, currentPage, limit } =
    await getShiftsWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <ShiftsTable
        shifts={shifts}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        userFilter={params.userFilter || 'all'}
        shiftTypeFilter={params.shiftTypeFilter || 'all'}
        statusFilter={params.statusFilter || 'all'}
        userRole={user.role as 'ADMIN' | 'MANAGER'}
        userCompanyId={user.company_id}
      />
    </div>
  );
}

