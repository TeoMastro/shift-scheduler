import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { UnavailableDateForm } from '@/components/unavailable-dates/unavailable-date-form';
import {
  getUnavailableDateById,
  getUsersForUnavailableDateForm,
} from '@/server-actions/unavailable-date';
import { PageProps } from '@/types/unavailable-date';

export default async function UpdateUnavailableDatePage({ params }: PageProps) {
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

  const isEmployee = session.user.role === 'EMPLOYEE';

  const unavailableDate = await getUnavailableDateById(unavailableDateId);

  if (!unavailableDate || typeof unavailableDate === 'boolean') {
    notFound();
  }

  const users = isEmployee ? [] : await getUsersForUnavailableDateForm();

  return (
    <div className="container mx-auto py-6">
      <UnavailableDateForm
        mode="update"
        unavailableDate={unavailableDate}
        users={users}
        currentUserId={isEmployee ? +session.user.id : undefined}
        isEmployee={isEmployee}
      />
    </div>
  );
}
