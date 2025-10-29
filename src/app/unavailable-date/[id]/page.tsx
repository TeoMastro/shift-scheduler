import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { UnavailableDateView } from '@/components/unavailable-dates/unavailable-date-view';
import { getUnavailableDateById } from '@/server-actions/unavailable-date';
import { PageProps } from '@/types/unavailable-date';

export default async function ViewUnavailableDatePage({ params }: PageProps) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const unavailableDateId = parseInt(resolvedParams.id);

  if (isNaN(unavailableDateId)) {
    notFound();
  }

  const unavailableDate = await getUnavailableDateById(unavailableDateId);

  if (!unavailableDate || typeof unavailableDate === 'boolean') {
    notFound();
  }

  const isEmployee = session.user.role === 'EMPLOYEE';

  return (
    <div className="container mx-auto py-6">
      <UnavailableDateView
        unavailableDate={unavailableDate}
        isEmployee={isEmployee}
      />
    </div>
  );
}

