import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { ShiftDatePreferenceForm } from '@/components/shift-date-preferences/shift-date-preference-form';
import {
  getShiftDatePreferenceById,
  getUsersForPreferenceForm,
} from '@/server-actions/shift-date-preference';
import { PageProps } from '@/types/shift-date-preference';

export default async function UpdateShiftDatePreferencePage({
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

  const isEmployee = session.user.role === 'EMPLOYEE';

  const preference = await getShiftDatePreferenceById(preferenceId);

  if (!preference || typeof preference === 'boolean') {
    notFound();
  }

  const users = isEmployee ? [] : await getUsersForPreferenceForm();

  return (
    <div className="container mx-auto py-6">
      <ShiftDatePreferenceForm
        mode="update"
        preference={preference}
        users={users}
        currentUserId={isEmployee ? +session.user.id : undefined}
        isEmployee={isEmployee}
      />
    </div>
  );
}
