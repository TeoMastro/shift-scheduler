import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ShiftTypesTable } from '@/components/shift-type/shift-type-table';
import { AdminShiftTypesPageProps } from '@/types/shift-type';
import {
  getShiftTypesWithPagination,
  getCurrentUserForShiftType,
} from '@/server-actions/shift-type';
import { getTranslations } from 'next-intl/server';

export default async function ShiftTypesPage({
  searchParams,
}: AdminShiftTypesPageProps) {
  const session = await auth();
  const t = await getTranslations('app');

  if (!session) {
    redirect('/auth/signin');
  }

  // Only managers can access shift types
  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  // Get user's company_id for manager role
  const user = await getCurrentUserForShiftType();

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
  const { shiftTypes, totalCount, totalPages, currentPage, limit } =
    await getShiftTypesWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <ShiftTypesTable
        shiftTypes={shiftTypes}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        companyFilter={params.companyFilter || 'all'}
        userRole={user.role}
        userCompanyId={user.company_id}
      />
    </div>
  );
}
