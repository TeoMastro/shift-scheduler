import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { CompaniesTable } from '@/components/admin/company-table';
import { AdminCompaniesPageProps } from '@/types/company';
import { getCompaniesWithPagination } from '@/server-actions/company';

export default async function AdminCompaniesPage({
  searchParams,
}: AdminCompaniesPageProps) {
  const session = await auth();

  if (!session || session.user.role !== 'ADMIN') {
    notFound();
  }

  const params = await searchParams;
  const { companies, totalCount, totalPages, currentPage, limit } =
    await getCompaniesWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <CompaniesTable
        companies={companies}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
      />
    </div>
  );
}
