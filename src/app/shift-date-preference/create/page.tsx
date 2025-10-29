import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShiftDatePreferenceForm } from '@/components/shift-date-preferences/shift-date-preference-form';
import { getUsersForPreferenceForm } from '@/server-actions/shift-date-preference';

export default async function CreateShiftDatePreferencePage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    redirect('/dashboard');
  }

  const isEmployee = session.user.role === 'EMPLOYEE';

  const users = isEmployee ? [] : await getUsersForPreferenceForm();

  return (
    <div className="container mx-auto py-6">
      <ShiftDatePreferenceForm
        mode="create"
        users={users}
        currentUserId={isEmployee ? +session.user.id : undefined}
        isEmployee={isEmployee}
      />
    </div>
  );
}
