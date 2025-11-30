import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getSolutionByIdAction } from '@/server-actions/solution';
import { getTranslations } from 'next-intl/server';
import { SolutionDetailView } from '@/components/shift/solution-detail-view';

interface SolutionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SolutionDetailPage({
  params,
}: SolutionDetailPageProps) {
  const session = await auth();
  const t = await getTranslations('app');

  if (!session) {
    redirect('/auth/signin');
  }

  // Only managers can access solutions
  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  const { id } = await params;
  const solutionId = parseInt(id, 10);

  if (isNaN(solutionId)) {
    notFound();
  }

  try {
    const solutionData = await getSolutionByIdAction(solutionId);

    if (!solutionData) {
      notFound();
    }

    return (
      <div className="container mx-auto py-6">
        <SolutionDetailView solutionData={solutionData} />
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-destructive">{t('errorLoadingSolution')}</p>
          <p className="text-muted-foreground text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
