import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { SkillsTable } from '@/components/skill/skill-table';
import { getSkillsWithPagination } from '@/server-actions/skill';
import { AdminSkillsPageProps } from '@/types/skill';

export default async function SkillsPage({
  searchParams,
}: AdminSkillsPageProps) {
  const session = await auth();

  if (!session || session.user.role !== 'MANAGER') {
    notFound();
  }

  const params = await searchParams;
  const { skills, totalCount, totalPages, currentPage, limit } =
    await getSkillsWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <SkillsTable
        skills={skills}
        // Pagination props
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        // Current state props
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        companyFilter={params.companyFilter || 'all'}
      />
    </div>
  );
}
