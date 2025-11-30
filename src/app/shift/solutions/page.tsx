import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { SolutionsTable } from '@/components/shift/solutions-table';
import { getSolutionsAction } from '@/server-actions/solution';
import { getTranslations } from 'next-intl/server';

interface SolutionsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    feasibleOnly?: string;
    sortBy?: string;
    sortDirection?: string;
  }>;
}

export default async function SolutionsPage({
  searchParams,
}: SolutionsPageProps) {
  const session = await auth();
  const t = await getTranslations('app');

  if (!session) {
    redirect('/auth/signin');
  }

  // Only managers can access solutions
  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  const params = await searchParams;

  try {
    const { solutions, totalCount, totalPages } = await getSolutionsAction({
      page: params.page,
      limit: params.limit,
      feasibleOnly: params.feasibleOnly === 'true',
      sortBy: (params.sortBy as 'created_at' | 'hard_score' | 'soft_score') || 'created_at',
      sortDirection: (params.sortDirection as 'asc' | 'desc') || 'desc',
    });

    const currentPage = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '20', 10);

    return (
      <div className="container mx-auto py-6">
        <SolutionsTable
          solutions={solutions}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={currentPage}
          limit={limit}
          sortBy={(params.sortBy as 'created_at' | 'hard_score' | 'soft_score') || 'created_at'}
          sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
          feasibleOnly={params.feasibleOnly === 'true'}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-destructive">
            {t('errorLoadingSolutions')}
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
