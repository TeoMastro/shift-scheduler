import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { ShiftDatePreferenceView } from '@/components/shift-date-preferences/shift-date-preference-view';
import { getShiftDatePreferenceById } from '@/server-actions/shift-date-preference';
import { PageProps } from '@/types/shift-date-preference';

export default async function ViewShiftDatePreferencePage({
  params,
}: PageProps) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const preferenceId = parseInt(resolvedParams.id);

  if (isNaN(preferenceId)) {
    notFound();
  }

  const preference = await getShiftDatePreferenceById(preferenceId);

  if (!preference || typeof preference === 'boolean') {
    notFound();
  }

  const isEmployee = session.user.role === 'EMPLOYEE';

  return (
    <div className="container mx-auto py-6">
      <ShiftDatePreferenceView
        preference={preference}
        isEmployee={isEmployee}
      />
    </div>
  );
}
